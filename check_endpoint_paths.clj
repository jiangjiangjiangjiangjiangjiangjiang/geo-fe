(require (quote [metabase.geo-task.api :reload]))
(require (quote metabase.api.macros))

(println "=== 检查已注册的端点路径 ===")
(let [routes (metabase.api.macros/ns-routes (quote metabase.geo-task.api))]
  (if (empty? routes)
    (println "❌ 没有找到已注册的端点！")
    (do
      (println "✅ 找到" (count routes) "个端点:")
      (doseq [[k _v] routes]
        (let [method (first k)
              path (second k)]
          (println (format "  - %s %s" (name method) path)))))))

(println "")
(println "=== 检查特定端点 ===")
(let [get-list (metabase.api.macros/find-route (quote metabase.geo-task.api) :get "/list")
      post-add (metabase.api.macros/find-route (quote metabase.geo-task.api) :post "/add")]
  (if get-list
    (println "✅ GET /list 端点存在")
    (println "❌ GET /list 端点不存在"))
  (if post-add
    (println "✅ POST /add 端点存在")
    (println "❌ POST /add 端点不存在")))

(println "")
(println "=== 检查所有 GET 端点 ===")
(let [get-routes (metabase.api.macros/ns-routes (quote metabase.geo-task.api) :get)]
  (if (empty? get-routes)
    (println "❌ 没有找到 GET 端点")
    (do
      (println "✅ 找到" (count get-routes) "个 GET 端点:")
      (doseq [[k _v] get-routes]
        (println "  -" (second k))))))

(println "")
(println "=== 检查所有 POST 端点 ===")
(let [post-routes (metabase.api.macros/ns-routes (quote metabase.geo-task.api) :post)]
  (if (empty? post-routes)
    (println "❌ 没有找到 POST 端点")
    (do
      (println "✅ 找到" (count post-routes) "个 POST 端点:")
      (doseq [[k _v] post-routes]
        (println "  -" (second k))))))
