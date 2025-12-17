(ns metabase.geo-task.api
  "API endpoints for managing geo tasks."
  (:require
   [clojure.java.jdbc :as jdbc]
   [clojure.string :as str]
   [metabase.api.common :as api]
   [metabase.api.macros :as api.macros]
   [metabase.driver.sql-jdbc.connection :as sql-jdbc.conn]
   [metabase.util.malli.schema :as ms]
   [toucan2.core :as t2]))

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
        total-pages (Math/ceil (/ total page-size))]
    {:items      tasks
     :total      total
     :page       page
     :page_size  page-size
     :total_pages (int total-pages)}))

;; TODO (Cam 2025-11-25) please add a response schema to this API endpoint, it makes it easier for our customers to
;; use our API + we will need it when we make auto-TypeScript-signature generation happen
;;
#_{:clj-kondo/ignore [:metabase/validate-defendpoint-has-response-schema]}
(api.macros/defendpoint :post "/add"
  "Create a new geo task."
  [_route-params
   _query-params
   {:as body}
   :- [:map
       [:query_text ms/NonBlankString]
       [:platform_name {:optional true} [:maybe :string]]
       [:usr_company_name {:optional true} [:maybe :string]]
       [:brand_keywords {:optional true} [:maybe :string]]
       [:schedule_cron {:optional true} [:maybe :string]]
       [:enabled {:optional true} [:maybe :boolean]]]]
  (api/check-superuser)
  (let [task-id (java.util.UUID/randomUUID)
        now (java.time.Instant/now)
        ;; Helper to find platform_id by platform_name
        find-platform-id (fn [platform-name]
                           (when platform-name
                             (let [result (first (query-geo-database
                                                  "SELECT id FROM platforms WHERE name = ?" platform-name))]
                               (:id result))))
        ;; Helper to find usr_company_id by usr_company_name
        find-usr-company-id (fn [usr-company-name]
                              (when usr-company-name
                                (let [result (first (query-geo-database
                                                     "SELECT id FROM usr_companies WHERE name = ?" usr-company-name))]
                                  (:id result))))
        ;; Normalize body: convert empty strings to nil
        normalized-body (-> body
                            (update :brand_keywords #(if (and (string? %) (empty? %)) nil %))
                            (update :schedule_cron #(if (and (string? %) (empty? %)) nil %)))
        ;; Look up IDs from names
        platform-id (find-platform-id (:platform_name normalized-body))
        usr-company-id (find-usr-company-id (:usr_company_name normalized-body))
        task-data (-> normalized-body
                      (select-keys [:query_text :brand_keywords :schedule_cron :enabled])
                      (assoc :id task-id
                             :platform_id platform-id
                             :platform_name (:platform_name normalized-body)
                             :usr_company_id usr-company-id
                             :usr_company_name (:usr_company_name normalized-body)
                             :created_at now
                             :updated_at now)
                      (update :enabled #(if (nil? %) true %)))
        sql "INSERT INTO geo_tasks (id, platform_id, usr_company_id, query_text, brand_keywords, enabled, schedule_cron, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *"
        params [(:id task-data)
                (:platform_id task-data)
                (:usr_company_id task-data)
                (:query_text task-data)
                (:brand_keywords task-data)
                (:enabled task-data)
                (:schedule_cron task-data)
                (:created_at task-data)
                (:updated_at task-data)]
        inserted-task (first (apply query-geo-database sql params))]
    ;; Return task with platform_name and usr_company_name included
    (assoc inserted-task
           :platform_name (:platform_name task-data)
           :usr_company_name (:usr_company_name task-data))))

;; TODO (Cam 2025-11-25) please add a response schema to this API endpoint, it makes it easier for our customers to
;; use our API + we will need it when we make auto-TypeScript-signature generation happen
;;
#_{:clj-kondo/ignore [:metabase/validate-defendpoint-has-response-schema]}
(api.macros/defendpoint :post "/:id/execute"
  "Execute a geo task by ID."
  [{:keys [id]} :- [:map [:id ms/UUIDString]]]
  (api/check-superuser)
  (let [task-uuid (java.util.UUID/fromString id)]
    (api/let-404 [_task (first (query-geo-database "SELECT * FROM geo_tasks WHERE id = ?" task-uuid))]
      ;; TODO: Implement actual execution logic here
      ;; For now, just update the last_run_at timestamp
      (execute-geo-database "UPDATE geo_tasks SET last_run_at = ? WHERE id = ?" (java.time.Instant/now) task-uuid)
      {:status "executed" :task-id id})))
