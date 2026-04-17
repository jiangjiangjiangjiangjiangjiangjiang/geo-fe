(ns metabase.geo-task.api
  "API endpoints for managing geo tasks."
  (:require
   [clojure.java.jdbc :as jdbc]
   [clojure.string :as str]
   [metabase.api.common :as api]
   [metabase.api.macros :as api.macros]
   [metabase.driver.sql-jdbc.connection :as sql-jdbc.conn]
   [metabase.util.json :as json]
   [metabase.util.malli.schema :as ms]
   [toucan2.core :as t2])
  (:import
   (org.postgresql.util PGobject)))

(set! *warn-on-reflection* true)

(def keep-me
  "Keep this namespace loaded. Used in comment block in routes.clj to prevent namespace from being optimized away."
  nil)

(defn- get-geo-database
  "Get the 'geo' database by name."
  []
  (api/check-404 (t2/select-one :model/Database :name "geo")))

(defn- get-geo-jdbc-spec
  "Get JDBC connection spec for the 'geo' database."
  []
  (let [database (get-geo-database)]
    (sql-jdbc.conn/db->pooled-connection-spec database)))

(defn- query-geo-database
  "Execute a SQL query against the 'geo' database."
  [sql & params]
  (let [jdbc-spec (get-geo-jdbc-spec)]
    (jdbc/query jdbc-spec (into [sql] params))))

(defn- execute-geo-database
  "Execute a SQL statement (INSERT/UPDATE/DELETE) against the 'geo' database."
  [sql & params]
  (let [jdbc-spec (get-geo-jdbc-spec)]
    (jdbc/execute! jdbc-spec (into [sql] params))))

(defn- to-pg-jsonb
  "Convert a sequential collection to a PGobject for JSONB column."
  [coll]
  (when (seq coll)
    (doto (PGobject.)
      (.setType "jsonb")
      (.setValue (json/encode (vec coll))))))

(defn- to-pg-jsonb-map
  "Convert a map (e.g. {brand [keywords]}) to a PGobject for JSONB column."
  [m]
  (when (and m (seq m))
    (doto (PGobject.)
      (.setType "jsonb")
      (.setValue (json/encode m)))))

(def hours-per-day 24)

(defn- build-distributed-hours
  [times-per-day]
  (->> (range times-per-day)
       (map #(int (Math/floor (/ (* % hours-per-day) times-per-day))))
       distinct
       vec))

(defn- search-times-per-day->cron
  [times-per-day]
  (when (and (integer? times-per-day)
             (<= 1 times-per-day hours-per-day))
    (if (zero? (mod hours-per-day times-per-day))
      (format "0 */%d * * *" (/ hours-per-day times-per-day))
      (format "0 %s * * *" (str/join "," (build-distributed-hours times-per-day))))))

(defn- cron->search-times-per-day
  [schedule-cron]
  (when (and (string? schedule-cron)
             (not (str/blank? schedule-cron)))
    (let [trimmed-cron (str/trim schedule-cron)
          hourly-match (re-matches #"^0 \*/(\d{1,2}) \* \* \*$" trimmed-cron)
          hour-list-match (re-matches #"^0 ((?:\d{1,2})(?:,\d{1,2})*) \* \* \*$" trimmed-cron)]
      (cond
        hourly-match
        (let [interval-hours (parse-long (second hourly-match))]
          (when (and interval-hours
                     (<= 1 interval-hours hours-per-day))
            (/ hours-per-day interval-hours)))

        hour-list-match
        (count (str/split (second hour-list-match) #","))

        :else nil))))

;; TODO (Cam 2025-11-25) please add a response schema to this API endpoint, it makes it easier for our customers to
;; use our API + we will need it when we make auto-TypeScript-signature generation happen
;;
#_{:clj-kondo/ignore [:metabase/validate-defendpoint-has-response-schema]}
(api.macros/defendpoint :get "/list"
  "List geo tasks with pagination and filters."
  [_route-params
   {:keys [page page_size enabled platform_id usr_company_id]} :- [:map
                                                                   [:page ms/PositiveInt]
                                                                   [:page_size ms/PositiveInt]
                                                                   [:enabled {:optional true} [:maybe :boolean]]
                                                                   [:platform_id {:optional true} [:maybe :string]]
                                                                   [:usr_company_id {:optional true} [:maybe :string]]]]
  (api/check-superuser)
  (let [page (or page 1)
        page-size (or page_size 20)
        offset (* (dec page) page-size)
        ;; Build WHERE clause based on filters
        where-clauses (cond-> []
                        enabled (conj "enabled = ?")
                        platform_id (conj "platform_id = ?")
                        usr_company_id (conj "usr_company_id = ?"))
        where-clause (when (seq where-clauses)
                       (str "WHERE " (str/join " AND " where-clauses)))
        where-params (cond-> []
                       enabled (conj enabled)
                       platform_id (conj platform_id)
                       usr_company_id (conj usr_company_id))
        ;; Count total matching records
        count-sql (str "SELECT COUNT(*) as total FROM geo_tasks " (or where-clause ""))
        total-result (if (seq where-params)
                       (first (apply query-geo-database count-sql where-params))
                       (first (query-geo-database count-sql)))
        total (or (:total total-result) 0)
        ;; Fetch paginated results
        list-sql (str "SELECT * FROM geo_tasks " (or where-clause "") " ORDER BY created_at DESC LIMIT ? OFFSET ?")
        list-params (concat where-params [page-size offset])
        tasks (if (seq where-params)
                (apply query-geo-database list-sql list-params)
                (query-geo-database list-sql page-size offset))
        total-pages (Math/ceil (/ total page-size))
        ;; Expose product_brand for API (DB may still have usr_company_name)
        ;; and normalize old single-platform rows to the new ai_platforms shape.
        items (map (fn [task]
                     (let [platform-name (or (:ai_model task) (:platform_name task))
                           ai-platforms (or (:ai_platforms task)
                                            (when platform-name [platform-name]))
                           search-times-per-day (or (:search_times_per_day task)
                                                    (cron->search-times-per-day
                                                     (:schedule_cron task)))]
                       (assoc task
                              :product_brand (or (:product_brand task) (:usr_company_name task))
                              :ai_platforms ai-platforms
                              :ai_model platform-name
                              :search_times_per_day search-times-per-day)))
                   tasks)]
    {:items      items
     :total      total
     :page       page
     :page_size  page-size
     :total_pages (int total-pages)}))

;; TODO (Cam 2025-11-25) please add a response schema to this API endpoint, it makes it easier for our customers to
;; use our API + we will need it when we make auto-TypeScript-signature generation happen
;;
#_{:clj-kondo/ignore [:metabase/validate-defendpoint-has-response-schema]}
(api.macros/defendpoint :post "/add"
  "Create a new geo task. Request: task_name required; query_text, ai_model/ai_platforms, ai_mode, product_brand,
   product_keywords, selling_point_keywords, comparison_brands (map of brand -> [keywords]),
   search_times_per_day/schedule_cron optional."
  [_route-params
   _query-params
   {:as body}
   :- [:map
       [:task_name ms/NonBlankString]
       [:query_text {:optional true} [:maybe :string]]
       [:ai_model {:optional true} [:maybe :string]]
       [:ai_platforms {:optional true} [:maybe [:sequential :string]]]
       [:ai_mode {:optional true} [:maybe :string]]
       [:platform_name {:optional true} [:maybe :string]]
       [:product_brand {:optional true} [:maybe :string]]
       [:product_keywords {:optional true} [:maybe :string]]
       [:selling_point_keywords {:optional true} [:maybe [:sequential :string]]]
       [:comparison_brands {:optional true} [:maybe [:map-of :string [:sequential :string]]]]
       [:search_times_per_day {:optional true} [:maybe ms/PositiveInt]]
       [:enabled {:optional true} [:maybe :boolean]]
       [:schedule_cron {:optional true} [:maybe :string]]]]
  (api/check-superuser)
  (let [task-id (java.util.UUID/randomUUID)
        now (java.time.Instant/now)
        ;; Resolve platform_id by the first selected platform and keep single-value
        ;; platform fields populated for legacy readers.
        find-platform-id (fn [name]
                           (when (and name (not (str/blank? name)))
                             (let [result (first (query-geo-database
                                                  "SELECT id FROM platforms WHERE name = ?" (str/trim name)))]
                               (:id result))))
        normalized-ai-platforms (->> (:ai_platforms body)
                                     (filter string?)
                                     (map str/trim)
                                     (remove str/blank?)
                                     vec
                                     seq)
        platform-name (or (:ai_model body) (:platform_name body))
        primary-platform-name (or (first normalized-ai-platforms) platform-name)
        requested-search-times-per-day (when-let [times-per-day (:search_times_per_day body)]
                                         (when (<= 1 times-per-day hours-per-day)
                                           times-per-day))
        find-usr-company-id (fn [brand-name]
                              (when (and brand-name (not (str/blank? brand-name)))
                                (let [result (first (query-geo-database
                                                     "SELECT id FROM usr_companies WHERE name = ?" brand-name))]
                                  (:id result))))
        normalized-body (-> body
                            (update :product_keywords #(if (and (string? %) (str/blank? %)) nil %))
                            (update :schedule_cron #(if (and (string? %) (str/blank? %)) nil %)))
        normalized-schedule-cron (or (some-> requested-search-times-per-day
                                             search-times-per-day->cron)
                                     (:schedule_cron normalized-body))
        platform-id (find-platform-id primary-platform-name)
        usr-company-id (find-usr-company-id (:product_brand normalized-body))
        task-data (-> normalized-body
                      (select-keys [:task_name :query_text :ai_mode :product_brand :product_keywords
                                    :comparison_brands :selling_point_keywords])
                      (assoc :id task-id
                             :platform_id platform-id
                             :platform_name primary-platform-name
                             :ai_model primary-platform-name
                             :ai_platforms normalized-ai-platforms
                             :search_times_per_day (or requested-search-times-per-day
                                                       (cron->search-times-per-day normalized-schedule-cron))
                             :usr_company_id usr-company-id
                             :product_brand (:product_brand normalized-body)
                             :created_at now
                             :updated_at now
                             :enabled (if (some? (:enabled body))
                                        (:enabled body)
                                        true)
                             :schedule_cron normalized-schedule-cron))
        sql (str "INSERT INTO geo_tasks (id, platform_id, usr_company_id, task_name, query_text, ai_mode, "
                 "product_keywords, comparison_brands, selling_point_keywords, ai_platforms, enabled, schedule_cron, created_at, updated_at) "
                 "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *")
        params [(:id task-data)
                (:platform_id task-data)
                (:usr_company_id task-data)
                (:task_name task-data)
                (:query_text task-data)
                (:ai_mode task-data)
                (:product_keywords task-data)
                (to-pg-jsonb-map (:comparison_brands task-data))
                (to-pg-jsonb (:selling_point_keywords task-data))
                (to-pg-jsonb (:ai_platforms task-data))
                (:enabled task-data)
                (:schedule_cron task-data)
                (:created_at task-data)
                (:updated_at task-data)]
        inserted-task (first (apply query-geo-database sql params))]
    (assoc inserted-task
           :ai_model (:ai_model task-data)
           :ai_platforms (:ai_platforms task-data)
           :search_times_per_day (:search_times_per_day task-data)
           :platform_name (:platform_name task-data)
           :product_brand (:product_brand task-data))))

;; TODO (Cam 2025-11-25) please add a response schema to this API endpoint, it makes it easier for our customers to
;; use our API + we will need it when we make auto-TypeScript-signature generation happen
;;
#_{:clj-kondo/ignore [:metabase/validate-defendpoint-has-response-schema]}
#_{:clj-kondo/ignore [:metabase/validate-defendpoint-has-response-schema]}
(api.macros/defendpoint :put "/:id"
  "Update a geo task (e.g. enable/disable)."
  [{:keys [id]} :- [:map [:id ms/UUIDString]]
   _query-params
   {:keys [enabled]} :- [:map [:enabled {:optional true} [:maybe :boolean]]]]
  (api/check-superuser)
  (let [task-uuid (java.util.UUID/fromString id)]
    (api/let-404 [task (first (query-geo-database "SELECT * FROM geo_tasks WHERE id = ?" task-uuid))]
      (when (some? enabled)
        (execute-geo-database "UPDATE geo_tasks SET enabled = ?, updated_at = ? WHERE id = ?"
                              enabled (java.time.Instant/now) task-uuid))
      (first (query-geo-database "SELECT * FROM geo_tasks WHERE id = ?" task-uuid)))))

;; TODO (Cam 2025-11-25) please add a response schema to this API endpoint, it makes it easier for our customers to
;; use our API + we will need it when we make auto-TypeScript-signature generation happen
;;
#_{:clj-kondo/ignore [:metabase/validate-defendpoint-has-response-schema]}
(api.macros/defendpoint :post "/execute"
  "Execute a geo task by ID."
  [_route-params
   _query-params
   {:as body}
   :- [:map
       [:geo_task_id ms/UUIDString]]]
  (api/check-superuser)
  (let [task-id (:geo_task_id body)
        task-uuid (java.util.UUID/fromString task-id)]
    (api/let-404 [_task (first (query-geo-database "SELECT * FROM geo_tasks WHERE id = ?" task-uuid))]
      ;; TODO: Implement actual execution logic here
      ;; For now, just update the last_run_at timestamp
      (execute-geo-database "UPDATE geo_tasks SET last_run_at = ? WHERE id = ?" (java.time.Instant/now) task-uuid)
      {:success true
       :inserted 0
       :task_count 0
       :task_ids []
       :message "Task executed successfully"})))
