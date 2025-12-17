;; 调试路径匹配问题
;; 使用方法：在 REPL 中运行 (load-file "debug_path_matching.clj")

(require '[clojure.string :as str])

(println "=== 检查 split-path 函数 ===")
(let [split-path (fn [^String path]
                   (when (some-> path (str/starts-with? "/"))
                     (if-let [next-slash-index (str/index-of path "/" 1)]
                       [(subs path 0 next-slash-index) (subs path next-slash-index (count path))]
                       [path "/"])))]
  (println "测试 '/geo-task/list':" (split-path "/geo-task/list"))
  (println "测试 '/geo-task':" (split-path "/geo-task"))
  (println "测试 '/list':" (split-path "/list"))
  (println ""))

(println "=== 检查命名空间和端点 ===")
(try
  (require 'metabase.geo-task.api :reload)
  (require 'metabase.api.macros)
  (let [routes (metabase.api.macros/ns-routes 'metabase.geo-task.api)]
    (println "端点数量:" (count routes))
    (doseq [[k v] routes]
      (let [method (first k)
            route-path (second k)
            form-path (get-in v [:form :route :path])]
        (println "方法:" method "路由键:" route-path "表单路径:" form-path)))
    (println ""))
  (catch Exception e
    (println "错误:" (.getMessage e))
    (println "")))

(println "=== 检查 handler ===")
(try
  (require 'metabase.api.macros)
  (let [handler (metabase.api.macros/ns-handler 'metabase.geo-task.api)]
    (if (nil? handler)
      (println "❌ Handler 为 nil")
      (println "✅ Handler 存在:" (type handler)))
    (println ""))
  (catch Exception e
    (println "错误:" (.getMessage e))
    (println "")))

(println "=== 检查路由配置 ===")
(try
  (require 'metabase.api-routes.routes)
  (let [route-map (var-get (resolve 'metabase.api-routes.routes/route-map))]
    (if (contains? route-map "/geo-task")
      (do
        (println "✅ 路由 '/geo-task' 存在")
        (let [handler-spec (get route-map "/geo-task")]
          (println "   Handler spec:" (pr-str handler-spec))))
      (println "❌ 路由 '/geo-task' 不存在"))
    (println ""))
  (catch Exception e
    (println "错误:" (.getMessage e))
    (println "")))

(println "=== 诊断完成 ===")

