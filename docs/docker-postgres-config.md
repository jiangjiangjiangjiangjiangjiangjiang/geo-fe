# Docker 使用 PostgreSQL 作为应用数据库配置

## 问题说明

如果启动命令中仍然使用 H2 数据库配置（`MB_DB_TYPE=h2`），每次重新构建镜像并启动容器时，可能会创建新的数据库连接，导致数据丢失。

## 正确的 PostgreSQL 配置

### 方式 1: 使用分离的环境变量（推荐）

```bash
docker run -d \
  --name metabase \
  -p 3000:3000 \
  -e MB_DB_TYPE=postgres \
  -e MB_DB_DBNAME=metabase \
  -e MB_DB_PORT=5432 \
  -e MB_DB_USER=your_postgres_user \
  -e MB_DB_PASS=your_postgres_password \
  -e MB_DB_HOST=your_postgres_host \
  crpi-457wlgce2tlknt6u.cn-hangzhou.personal.cr.aliyuncs.com/geo_namespace/geo_local:1.0.0
```

### 方式 2: 使用连接字符串（如果密码包含特殊字符）

```bash
docker run -d \
  --name metabase \
  -p 3000:3000 \
  -e MB_DB_CONNECTION_URI="jdbc:postgresql://your_postgres_host:5432/metabase?user=your_postgres_user&password=your_postgres_password" \
  crpi-457wlgce2tlknt6u.cn-hangzhou.personal.cr.aliyuncs.com/geo_namespace/geo_local:1.0.0
```

### 方式 3: 连接字符串 + 分离的用户名密码（推荐，更安全）

```bash
docker run -d \
  --name metabase \
  -p 3000:3000 \
  -e MB_DB_CONNECTION_URI="jdbc:postgresql://your_postgres_host:5432/metabase" \
  -e MB_DB_USER=your_postgres_user \
  -e MB_DB_PASS=your_postgres_password \
  crpi-457wlgce2tlknt6u.cn-hangzhou.personal.cr.aliyuncs.com/geo_namespace/geo_local:1.0.0
```

## 使用 Docker Secrets（生产环境推荐）

如果使用 Docker Swarm 或 Kubernetes，可以使用 secrets：

```bash
# 创建 secrets
echo "your_postgres_user" | docker secret create mb_db_user -
echo "your_postgres_password" | docker secret create mb_db_pass -

# 启动容器
docker run -d \
  --name metabase \
  -p 3000:3000 \
  -e MB_DB_TYPE=postgres \
  -e MB_DB_DBNAME=metabase \
  -e MB_DB_PORT=5432 \
  -e MB_DB_USER_FILE=/run/secrets/mb_db_user \
  -e MB_DB_PASS_FILE=/run/secrets/mb_db_pass \
  -e MB_DB_HOST=your_postgres_host \
  crpi-457wlgce2tlknt6u.cn-hangzhou.personal.cr.aliyuncs.com/geo_namespace/geo_local:1.0.0
```

## 环境变量说明

| 环境变量 | 说明 | 示例 |
|---------|------|------|
| `MB_DB_TYPE` | 数据库类型，必须设置为 `postgres` | `postgres` |
| `MB_DB_HOST` | PostgreSQL 服务器地址 | `localhost` 或 `postgres.example.com` |
| `MB_DB_PORT` | PostgreSQL 端口，默认 5432 | `5432` |
| `MB_DB_DBNAME` | 数据库名称 | `metabase` |
| `MB_DB_USER` | 数据库用户名 | `metabase_user` |
| `MB_DB_PASS` | 数据库密码 | `your_password` |
| `MB_DB_CONNECTION_URI` | 完整的 JDBC 连接字符串（可选，可替代上面的分离变量） | `jdbc:postgresql://host:5432/metabase` |

## 重要注意事项

1. **移除 H2 相关配置**：确保启动命令中**没有**以下环境变量：
   - ❌ `MB_DB_TYPE=h2`
   - ❌ `MB_DB_FILE=/metabase-data/metabase.db`
   - ❌ `-v /data/metabase:/metabase-data`（如果只用于 H2 数据库）

2. **确保 PostgreSQL 数据库已创建**：
   ```sql
   CREATE DATABASE metabase;
   ```

3. **确保用户有权限**：
   ```sql
   GRANT ALL PRIVILEGES ON DATABASE metabase TO your_postgres_user;
   ```

4. **验证连接**：启动容器后，检查日志确认连接成功：
   ```bash
   docker logs metabase | grep -i "database\|postgres\|connection"
   ```

5. **数据持久化**：使用 PostgreSQL 时，数据存储在 PostgreSQL 数据库中，不需要挂载 H2 数据库文件卷。但如果需要持久化其他数据（如上传的文件），可以保留卷挂载。

## 完整的生产环境启动命令示例

```bash
# 停止并删除旧容器
docker stop metabase
docker rm metabase

# 启动新容器（使用 PostgreSQL）
docker run -d \
  --name metabase \
  --restart unless-stopped \
  -p 3000:3000 \
  -e MB_DB_TYPE=postgres \
  -e MB_DB_DBNAME=metabase \
  -e MB_DB_PORT=5432 \
  -e MB_DB_USER=metabase_user \
  -e MB_DB_PASS=your_secure_password \
  -e MB_DB_HOST=postgres.example.com \
  crpi-457wlgce2tlknt6u.cn-hangzhou.personal.cr.aliyuncs.com/geo_namespace/geo_local:1.0.0
```

## 故障排查

### 检查数据库连接

```bash
# 查看容器日志
docker logs metabase

# 检查环境变量
docker exec metabase env | grep MB_DB
```

### 常见错误

1. **连接失败**：检查 PostgreSQL 主机、端口、用户名、密码是否正确
2. **数据库不存在**：确保数据库已创建
3. **权限不足**：确保用户有足够的权限访问数据库
4. **网络问题**：确保容器可以访问 PostgreSQL 服务器

### 测试 PostgreSQL 连接

在容器内测试连接：

```bash
# 进入容器
docker exec -it metabase sh

# 测试连接（如果容器内有 psql）
psql -h your_postgres_host -U your_postgres_user -d metabase
```

## 从 H2 迁移到 PostgreSQL

如果之前使用 H2，需要迁移数据：

1. 备份 H2 数据库
2. 创建 PostgreSQL 数据库
3. 使用 Metabase 的迁移工具将数据从 H2 导入 PostgreSQL
4. 更新启动命令使用 PostgreSQL 配置

详细步骤请参考：[Migrating from H2](migrating-from-h2.md)

