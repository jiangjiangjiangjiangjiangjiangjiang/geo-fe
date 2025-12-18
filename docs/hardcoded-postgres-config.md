# 硬编码 PostgreSQL 配置说明

## 修改内容

已将 Metabase 的默认数据库类型从 H2 改为 PostgreSQL，并设置了默认的连接参数。

### 修改的文件

1. **`src/metabase/config/core.clj`**
   - 将 `:mb-db-type` 的默认值从 `"h2"` 改为 `"postgres"`

2. **`src/metabase/app_db/env.clj`**
   - 在 `env-defaults` 的 `:postgres` 方法中添加了默认连接参数

## 默认配置值

当前硬编码的默认值：

```clojure
{
  :mb-db-host "localhost"
  :mb-db-port 5432
  :mb-db-dbname "metabase"
  :mb-db-user "metabase"
  :mb-db-pass "metabase"
}
```

## 如何修改默认值

### 方式 1: 直接修改代码（推荐用于固定环境）

编辑 `src/metabase/app_db/env.clj` 文件，找到 `env-defaults` 的 `:postgres` 方法：

```clojure
(defmethod env-defaults :postgres
  "Default PostgreSQL connection settings..."
  [_db-type]
  {:mb-db-host "你的PostgreSQL主机地址"      ; 例如: "postgres.example.com" 或 "192.168.1.100"
   :mb-db-port 5432                        ; PostgreSQL 端口，通常是 5432
   :mb-db-dbname "你的数据库名"             ; 例如: "metabase"
   :mb-db-user "你的数据库用户名"           ; 例如: "metabase_user"
   :mb-db-pass "你的数据库密码"})           ; 例如: "your_secure_password"
```

修改后重新构建 Docker 镜像即可。

### 方式 2: 使用环境变量覆盖（推荐用于多环境）

即使代码中设置了默认值，仍然可以通过环境变量覆盖：

```bash
docker run -d \
  --name metabase \
  -p 3000:3000 \
  -e MB_DB_HOST=your_postgres_host \
  -e MB_DB_DBNAME=your_database \
  -e MB_DB_USER=your_user \
  -e MB_DB_PASS=your_password \
  crpi-457wlgce2tlknt6u.cn-hangzhou.personal.cr.aliyuncs.com/geo_namespace/geo_local:1.0.0
```

这样可以在不修改代码的情况下，通过环境变量灵活配置不同环境的数据库连接。

## 配置优先级

配置的读取优先级（从高到低）：

1. **环境变量** (`MB_DB_*`) - 最高优先级
2. **JVM 系统属性** (`-Dmb.db.*`)
3. **代码中的默认值** - 最低优先级

这意味着：
- 如果设置了环境变量，会使用环境变量的值
- 如果没有设置环境变量，会使用代码中的默认值
- 这样既可以在代码中设置默认值简化启动，也可以通过环境变量灵活覆盖

## 简化后的启动命令

配置硬编码后，启动命令可以简化为：

```bash
docker run -d \
  --name metabase \
  -p 3000:3000 \
  crpi-457wlgce2tlknt6u.cn-hangzhou.personal.cr.aliyuncs.com/geo_namespace/geo_local:1.0.0
```

如果默认值不符合你的环境，只需要设置需要覆盖的环境变量：

```bash
docker run -d \
  --name metabase \
  -p 3000:3000 \
  -e MB_DB_HOST=your_postgres_host \
  -e MB_DB_PASS=your_password \
  crpi-457wlgce2tlknt6u.cn-hangzhou.personal.cr.aliyuncs.com/geo_namespace/geo_local:1.0.0
```

## 安全注意事项

⚠️ **重要**: 如果直接在代码中硬编码数据库密码，密码会出现在：
- 源代码中
- Git 历史记录中
- Docker 镜像中

**建议**:
1. 对于生产环境，建议使用环境变量传递敏感信息（如密码）
2. 如果必须硬编码，确保代码仓库是私有的
3. 考虑使用 Docker secrets 或其他密钥管理方案

## 验证配置

启动容器后，检查日志确认连接成功：

```bash
docker logs metabase | grep -i "database\|postgres\|connection"
```

如果看到连接成功的日志，说明配置正确。

## 回退到 H2

如果需要临时回退到 H2 数据库，可以设置环境变量：

```bash
docker run -d \
  --name metabase \
  -p 3000:3000 \
  -e MB_DB_TYPE=h2 \
  -e MB_DB_FILE=/metabase-data/metabase.db \
  -v /data/metabase:/metabase-data \
  crpi-457wlgce2tlknt6u.cn-hangzhou.personal.cr.aliyuncs.com/geo_namespace/geo_local:1.0.0
```

