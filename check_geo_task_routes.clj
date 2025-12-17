;; 诊断脚本：检查 geo-task API 端点是否已注册
;; 使用方法：在 REPL 中运行 (load-file "check_geo_task_routes.clj")

(require '[metabase.geo-task.api :reload])
(require '[metabase.api.macros])

(println "=== 检查命名空间是否已加载 ===")
(println "命名空间:" (the-ns 'metabase.geo-task.api))
(println "")

(println "=== 检查命名空间元数据 ===")
(let [meta-data (meta (the-ns 'metabase.geo-task.api))]
  (println "元数据键:" (keys meta-data))
  (println "是否有 :api/endpoints:" (contains? meta-data :api/endpoints))
  (println "是否有 :api/handler:" (contains? meta-data :api/handler))
  (println ""))

(println "=== 检查已注册的端点 ===")
(let [routes (metabase.api.macros/ns-routes 'metabase.geo-task.api)]
  (if (empty? routes)
    (println "❌ 没有找到已注册的端点！")
    (do
      (println "✅ 找到" (count routes) "个端点:")
      (doseq [[k v] routes]
        (println "  -" (pr-str k)))))
  (println ""))

(println "=== 检查 handler ===")
(let [handler (metabase.api.macros/ns-handler 'metabase.geo-task.api)]
  (if (nil? handler)
    (println "❌ Handler 为 nil")
    (println "✅ Handler 已创建"))
  (println ""))

(println "=== 检查路由配置 ===")
(require '[metabase.api-routes.routes])
(let [route-map (var-get (resolve 'metabase.api-routes.routes/route-map))]
  (if (contains? route-map "/geo-task")
    (println "✅ 路由 '/geo-task' 已在 route-map 中")
    (println "❌ 路由 '/geo-task' 不在 route-map 中"))
  (println ""))

