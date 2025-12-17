# 认证和权限说明

## 两层检查机制

你的 geo-task API 有两层安全检查：

### 1. 认证检查（Authentication）- `+auth` 中间件

**位置**: `routes.clj` 中的 `(+auth 'metabase.geo-task.api)`

**作用**: 检查用户是否已登录

**代码**:
```clojure
(defn- enforce-authentication
  [handler]
  (fn [{:keys [metabase-user-id] :as request} respond raise]
    (if metabase-user-id
      (handler request respond raise)  ; 已登录，继续处理
      (respond api.response/response-unauthentic))))  ; 未登录，返回 401
```

**结果**:
- ✅ 已登录（有 `metabase-user-id`）→ 继续处理请求
- ❌ 未登录（没有 `metabase-user-id`）→ 返回 **401 Unauthorized**

### 2. 权限检查（Authorization）- `check-superuser`

**位置**: 每个端点函数中的 `(api/check-superuser)`

**作用**: 检查当前用户是否是超级用户（superuser）

**代码**:
```clojure
(defn check-superuser
  "Check that `*current-user*` is a superuser or throw a 403."
  []
  (check-403 *is-superuser?*))
```

**结果**:
- ✅ 是超级用户（`*is-superuser?*` 为 `true`）→ 继续执行
- ❌ 不是超级用户（`*is-superuser?*` 为 `false`）→ 返回 **403 Forbidden**

## 错误码说明

| 错误码 | 含义 | 原因 |
|--------|------|------|
| **401 Unauthorized** | 未认证 | 用户没有登录，缺少 `metabase-user-id` |
| **403 Forbidden** | 无权限 | 用户已登录，但不是超级用户 |
| **404 Not Found** | 未找到 | 路由不匹配或端点不存在 |

## 当前你的情况

根据日志显示的是 **404 Not Found**，这意味着：

1. ✅ **认证通过**：用户已登录（否则会返回 401）
2. ✅ **权限检查未执行**：因为路由没有匹配到，所以 `check-superuser` 还没有执行
3. ❌ **路由不匹配**：请求没有找到对应的端点

## 如何检查认证状态

### 检查当前用户是否登录

在浏览器开发者工具的 Network 标签中：
- 查看请求头中是否有 `Cookie` 或 `Authorization` 头
- 查看响应头中是否有 `Set-Cookie`

### 检查当前用户是否是超级用户

1. **在 Metabase UI 中**:
   - 登录后，查看用户设置
   - 超级用户通常有管理员权限

2. **在数据库中**:
   ```sql
   SELECT id, email, is_superuser 
   FROM core_user 
   WHERE id = <your_user_id>;
   ```

3. **在代码中检查**:
   ```clojure
   ;; 在 REPL 中
   (require '[metabase.api.common :as api])
   ;; 查看当前用户是否是超级用户
   api/*is-superuser?*
   ```

## 如果遇到 401 或 403 错误

### 401 Unauthorized（未登录）

**解决方法**:
1. 确保在浏览器中已登录 Metabase
2. 检查 Cookie 是否有效
3. 尝试重新登录

### 403 Forbidden（无权限）

**解决方法**:
1. 确保当前用户是超级用户
2. 在数据库中设置用户为超级用户：
   ```sql
   UPDATE core_user 
   SET is_superuser = true 
   WHERE id = <your_user_id>;
   ```
3. 或者临时移除 `check-superuser` 检查（仅用于开发测试）

## 临时移除权限检查（仅用于开发）

如果你想临时测试而不需要超级用户权限，可以：

1. **移除端点中的 `check-superuser`**:
   ```clojure
   (api.macros/defendpoint :get "/list"
     "List all geo tasks."
     []
     ;; (api/check-superuser)  ; 临时注释掉
     (let [tasks (query-geo-database "SELECT * FROM geo_tasks ORDER BY created_at DESC")]
       {:data  tasks
        :total (count tasks)}))
   ```

2. **或者移除路由中的 `+auth`**:
   ```clojure
   "/geo-task" 'metabase.geo-task.api  ; 移除 +auth
   ```

**⚠️ 警告**: 这些修改仅用于开发测试，生产环境应该保持安全检查！

## 总结

- **404 错误** = 路由问题，不是认证问题
- **401 错误** = 用户未登录
- **403 错误** = 用户已登录，但不是超级用户

你当前遇到的是 **404**，所以认证不是问题。需要解决的是路由匹配问题。

