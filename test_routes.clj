(require '[metabase.geo-task.api :reload])
(require '[metabase.api.macros])
(let [routes (metabase.api.macros/ns-routes 'metabase.geo-task.api)]
  (println "Registered routes:")
  (doseq [[k _v] routes]
    (println "  " (pr-str k))))

