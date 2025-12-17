;; 诊断脚本：检查 geo-task API 命名空间是否正确加载
;; 使用方法：在 REPL 中运行 (load-file "check_namespace_loading.clj")
;; 或者在终端运行：clj -M:dev -e "(load-file \"check_namespace_loading.clj\")"

(println "=== 检查命名空间文件是否存在 ===")
(let [ns-file (clojure.java.io/file "src/metabase/geo_task/api.clj")]
  (if (.exists ns-file)
    (println "✅ 文件存在:" (.getAbsolutePath ns-file))
    (println "❌ 文件不存在: src/metabase/geo_task/api.clj"))
  (println ""))

(println "=== 尝试加载命名空间 ===")
(try
  (require 'metabase.geo-task.api :reload)
  (println "✅ 命名空间加载成功")
  (catch Exception e
    (println "❌ 命名空间加载失败:")
    (println "   错误信息:" (.getMessage e))
    (when-let [cause (.getCause e)]
      (println "   原因:" (.getMessage cause)))))
(println "")

(println "=== 检查命名空间是否已加载 ===")
(let [ns-sym 'metabase.geo-task.api]
  (if (find-ns ns-sym)
    (do
      (println "✅ 命名空间已加载:" ns-sym)
      (let [ns-obj (find-ns ns-sym)]
        (println "   命名空间对象:" ns-obj)
        (println "   元数据键:" (keys (meta ns-obj)))))
    (println "❌ 命名空间未加载:" ns-sym))
  (println ""))

(println "=== 检查命名空间元数据 ===")
(when-let [ns-obj (find-ns 'metabase.geo-task.api)]
  (let [meta-data (meta ns-obj)]
    (println "元数据键:" (keys meta-data))
    (println "是否有 :api/endpoints:" (contains? meta-data :api/endpoints))
    (println "是否有 :api/handler:" (contains? meta-data :api/handler))
    (when (contains? meta-data :api/endpoints)
      (let [endpoints (:api/endpoints meta-data)]
        (println "端点数量:" (count endpoints))
        (doseq [[k v] endpoints]
          (println "  -" (pr-str k)))))
    (println "")))

(println "=== 检查已注册的端点 ===")
(try
  (require 'metabase.api.macros)
  (let [routes (metabase.api.macros/ns-routes 'metabase.geo-task.api)]
    (if (empty? routes)
      (println "❌ 没有找到已注册的端点！")
      (do
        (println "✅ 找到" (count routes) "个端点:")
        (doseq [[k v] routes]
          (let [method (first k)
                path (second k)]
            (println (format "  - %s %s" (name method) path))))))
    (println ""))
  (catch Exception e
    (println "❌ 检查端点时出错:" (.getMessage e))
    (println "")))

(println "=== 检查 handler ===")
(try
  (require 'metabase.api.macros)
  (let [handler (metabase.api.macros/ns-handler 'metabase.geo-task.api)]
    (if (nil? handler)
      (println "❌ Handler 为 nil")
      (println "✅ Handler 已创建:" (type handler)))
    (println ""))
  (catch Exception e
    (println "❌ 检查 handler 时出错:" (.getMessage e))
    (println "")))

(println "=== 检查路由配置 ===")
(try
  (require 'metabase.api-routes.routes)
  (let [route-map (var-get (resolve 'metabase.api-routes.routes/route-map))]
    (if (contains? route-map "/geo-task")
      (do
        (println "✅ 路由 '/geo-task' 已在 route-map 中")
        (let [handler-spec (get route-map "/geo-task")]
          (println "   Handler spec:" (pr-str handler-spec))))
      (println "❌ 路由 '/geo-task' 不在 route-map 中"))
    (println ""))
  (catch Exception e
    (println "❌ 检查路由配置时出错:" (.getMessage e))
    (println "")))

(println "=== 检查 keep-me 符号 ===")
(try
  (require 'metabase.geo-task.api)
  (if (resolve 'metabase.geo-task.api/keep-me)
    (println "✅ keep-me 符号存在")
    (println "❌ keep-me 符号不存在"))
  (println "")
  (catch Exception e
    (println "❌ 检查 keep-me 时出错:" (.getMessage e))
    (println "")))

(println "=== 诊断完成 ===")

