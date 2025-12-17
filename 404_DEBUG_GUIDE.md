# 404 错误排查指南

## 完整的请求路由流程

### 1. 请求进入服务器
```
GET /api/geo-task/list
```

### 2. 顶层路由匹配 (`server/routes.clj`)
```clojure
(context "/api" [] (api-handler api-routes))
```
- 匹配 `/api` 前缀 ✅
- 剩余路径: `/geo-task/list`
- 传递给 `api-routes` (即 `metabase.api-routes.routes/routes`)

### 3. API 路由处理 (`api-routes/routes.clj`)
```clojure
(handlers/route-map-handler route-map)
```
- `route-map` 包含: `{"/geo-task" (+auth 'metabase.geo-task.api)}`

### 4. 路径分割 (`api/util/handlers.clj`)
```clojure
(defn- split-path [^String path]
  (when (some-> path (str/starts-with? "/"))
    (if-let [next-slash-index (str/index-of path "/" 1)]
      [(subs path 0 next-slash-index) (subs path next-slash-index (count path))]
      [path "/"])))
```
- 输入: `/geo-task/list`
- 输出: `["/geo-task", "/list"]`
- 前缀: `/geo-task` → 查找 route-map ✅
- 剩余路径: `/list` → 传递给 namespace handler

### 5. Namespace Handler (`api/macros.clj`)
```clojure
(ns-handler 'metabase.geo-task.api)
```
- 从命名空间元数据获取 `:api/handler`
- 如果 handler 为 `nil` → 返回 `pass-thru-handler` → `(respond nil)` → 404 ❌

### 6. 端点匹配 (`api/macros.clj`)
```clojure
(find-matching-handler handler-map request)
```
- 查找匹配的端点:
  - 方法: `GET`
  - 路径: `/list`
- 如果找不到匹配 → `(respond nil)` → 404 ❌

## 404 错误的可能原因

### 原因 1: 命名空间未加载或端点未注册
**症状**: Handler 为 `nil` 或端点列表为空

**检查方法**:
```clojure
(require '[metabase.geo-task.api :reload])
(require '[metabase.api.macros])
;; 检查端点是否注册
(metabase.api.macros/ns-routes 'metabase.geo-task.api)
;; 应该返回包含 [:get "/list"] 的 map

;; 检查 handler 是否存在
(-> 'metabase.geo-task.api the-ns meta :api/handler)
;; 应该返回一个函数，不是 nil
```

**解决方案**:
- 完全重启服务器（不要只是重新加载）
- `defendpoint` 宏只在运行时（非编译时）更新命名空间元数据
- 如果命名空间在编译时加载，端点可能不会注册

### 原因 2: 路径不匹配
**症状**: Handler 存在，但 `find-matching-handler` 返回 `nil`

**检查方法**:
```clojure
;; 检查注册的端点路径
(doseq [[k v] (metabase.api.macros/ns-routes 'metabase.geo-task.api)]
  (println "Method:" (first k) "Path:" (second k)))
;; 应该看到: Method: :get Path: "/list"
```

**常见问题**:
- 路径必须以 `/` 开头: `/list` ✅, `list` ❌
- 路径大小写敏感
- 路径中的斜杠数量要匹配

### 原因 3: HTTP 方法不匹配
**症状**: 路径正确，但方法不对

**检查方法**:
- 确认请求方法: `GET`, `POST`, `PUT`, `DELETE`
- 确认端点定义的方法

### 原因 4: 路由配置问题
**症状**: route-map 中没有对应的前缀

**检查方法**:
```clojure
(require '[metabase.api-routes.routes])
(let [route-map (var-get (resolve 'metabase.api-routes.routes/route-map))]
  (get route-map "/geo-task"))
;; 应该返回 handler，不是 nil
```

### 原因 5: 命名空间元数据未更新
**症状**: 代码已修改，但服务器仍使用旧版本

**原因**:
- `update-ns-endpoints!` 只在 `*compile-files*` 为 `false` 时执行
- 如果命名空间在编译时加载，元数据不会更新
- 开发模式下，handler 每次请求都会从元数据重新获取（支持热重载）
- 但如果命名空间没有重新加载，元数据仍然是旧的

## 系统化排查步骤

### 步骤 1: 验证文件存在
```bash
ls -la src/metabase/geo_task/api.clj
```

### 步骤 2: 验证命名空间声明
```clojure
;; 文件路径: src/metabase/geo_task/api.clj
;; 命名空间: metabase.geo-task.api
;; 注意: 连字符 (-) 对应下划线 (_)
```

### 步骤 3: 验证路由注册
```clojure
(require '[metabase.api-routes.routes])
;; 检查 route-map 中是否有 "/geo-task"
```

### 步骤 4: 验证命名空间加载
```clojure
(require '[metabase.geo-task.api :reload])
(find-ns 'metabase.geo-task.api)
;; 应该返回命名空间对象，不是 nil
```

### 步骤 5: 验证端点注册
```clojure
(require '[metabase.api.macros])
(metabase.api.macros/ns-routes 'metabase.geo-task.api)
;; 应该返回包含端点的 map，不是空 map
```

### 步骤 6: 验证 Handler 存在
```clojure
(-> 'metabase.geo-task.api the-ns meta :api/handler)
;; 应该返回函数，不是 nil
```

### 步骤 7: 验证路径匹配
```clojure
;; 检查端点路径是否正确
(let [routes (metabase.api.macros/ns-routes 'metabase.geo-task.api)]
  (doseq [[k _v] routes]
    (println "Method:" (first k) "Path:" (second k))))
;; 应该看到: Method: :get Path: "/list"
```

### 步骤 8: 测试 Handler
```clojure
(let [handler (metabase.api.macros/ns-handler 'metabase.geo-task.api)
      request {:request-method :get
               :path-info "/list"
               :uri "/list"}]
  ;; 创建一个测试请求
  (handler request
           (fn [response] (println "Response:" response))
           (fn [error] (println "Error:" error))))
```

## 为什么一直有问题？

### 核心问题: 命名空间加载时机

1. **编译时 vs 运行时**
   - `defendpoint` 宏生成的代码会在运行时调用 `update-ns-endpoints!`
   - 但 `update-ns-endpoints!` 只在 `*compile-files*` 为 `false` 时执行
   - 如果命名空间在编译时加载，端点不会注册

2. **热重载的限制**
   - 开发模式下，handler 每次请求都会从元数据重新获取
   - 但如果命名空间没有重新加载，元数据仍然是旧的
   - 需要完全重启服务器才能确保命名空间重新加载

3. **元数据持久化**
   - 命名空间元数据存储在内存中
   - 服务器重启后，元数据会丢失，需要重新生成
   - `defendpoint` 宏在命名空间加载时执行，更新元数据

### 解决方案

1. **完全重启服务器**
   ```bash
   # 完全停止服务器
   # 然后重新启动
   clojure -M:run:dev:dev-start
   ```

2. **强制重新加载命名空间**
   ```clojure
   (require '[metabase.geo-task.api :reload])
   ```

3. **验证端点注册**
   ```clojure
   (require '[metabase.api.macros])
   (metabase.api.macros/ns-routes 'metabase.geo-task.api)
   ```

4. **检查服务器日志**
   - 查看是否有命名空间加载错误
   - 查看是否有路由注册错误

## 快速诊断命令

```bash
# 运行诊断脚本
./bin/mage -repl '(load-file "check_namespace_loading.clj")'
```

## 常见错误模式

### 错误 1: Handler 为 nil
```
原因: 命名空间未加载或端点未注册
解决: 完全重启服务器
```

### 错误 2: 端点列表为空
```
原因: defendpoint 宏未执行或执行失败
解决: 检查代码语法，完全重启服务器
```

### 错误 3: 路径不匹配
```
原因: 路径定义错误（缺少前导斜杠、大小写不匹配等）
解决: 检查 defendpoint 中的路径定义
```

### 错误 4: 方法不匹配
```
原因: HTTP 方法不匹配（GET vs POST）
解决: 检查请求方法和端点定义
```

