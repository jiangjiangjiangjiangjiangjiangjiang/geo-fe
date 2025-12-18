# Docker 数据持久化配置说明

## 问题诊断

当使用 H2 数据库时，Metabase 的数据库文件存储路径如下：

- 环境变量设置：`MB_DB_FILE=/metabase-data/metabase.db`
- 实际存储路径：`/metabase-data/metabase.db/metabase.db.mv.db`
- 主机映射路径：`/data/metabase/metabase.db/metabase.db.mv.db`

## 检查数据是否存在

在主机上执行以下命令检查数据库文件：

```bash
# 检查数据库文件是否存在
ls -la /data/metabase/metabase.db/

# 应该看到类似这样的文件：
# metabase.db.mv.db
# metabase.db.trace.db
# metabase.db.lock.db
```

## 正确的启动命令

```bash
docker run -d \
  --name metabase \
  -p 3000:3000 \
  -e MB_DB_TYPE=h2 \
  -e MB_DB_FILE=/metabase-data/metabase.db \
  -v /data/metabase:/metabase-data \
  crpi-457wlgce2tlknt6u.cn-hangzhou.personal.cr.aliyuncs.com/geo_namespace/geo_local:1.0.0
```

## 数据备份和恢复

### 备份数据库

```bash
# 停止容器
docker stop metabase

# 备份整个数据库目录
tar -czf metabase-backup-$(date +%Y%m%d).tar.gz /data/metabase

# 或者只备份数据库文件
cp -r /data/metabase/metabase.db /data/metabase-backup/
```

### 恢复数据库

```bash
# 停止容器
docker stop metabase
docker rm metabase

# 恢复数据库文件
tar -xzf metabase-backup-YYYYMMDD.tar.gz -C /

# 或者从备份目录恢复
cp -r /data/metabase-backup/metabase.db /data/metabase/

# 确保权限正确
chown -R 2000:2000 /data/metabase

# 重新启动容器
docker run -d \
  --name metabase \
  -p 3000:3000 \
  -e MB_DB_TYPE=h2 \
  -e MB_DB_FILE=/metabase-data/metabase.db \
  -v /data/metabase:/metabase-data \
  crpi-457wlgce2tlknt6u.cn-hangzhou.personal.cr.aliyuncs.com/geo_namespace/geo_local:1.0.0
```

## 常见问题

### 1. 数据丢失

**原因**：
- 挂载的卷路径不存在或为空
- 容器以 root 用户运行时权限问题
- 数据库文件路径配置错误

**解决**：
- 确保 `/data/metabase` 目录存在且有正确的权限
- 检查数据库文件是否在 `/data/metabase/metabase.db/` 目录下
- 使用 `docker logs metabase` 查看启动日志

### 2. 权限问题

如果遇到权限问题，可以设置容器用户 ID：

```bash
docker run -d \
  --name metabase \
  -p 3000:3000 \
  -e MB_DB_TYPE=h2 \
  -e MB_DB_FILE=/metabase-data/metabase.db \
  -e MUID=2000 \
  -e MGID=2000 \
  -v /data/metabase:/metabase-data \
  crpi-457wlgce2tlknt6u.cn-hangzhou.personal.cr.aliyuncs.com/geo_namespace/geo_local:1.0.0
```

### 3. 迁移到 PostgreSQL（推荐生产环境）

H2 数据库不适合生产环境，建议迁移到 PostgreSQL：

```bash
# 使用 PostgreSQL 作为应用数据库
docker run -d \
  --name metabase \
  -p 3000:3000 \
  -e MB_DB_TYPE=postgres \
  -e MB_DB_DBNAME=metabase \
  -e MB_DB_PORT=5432 \
  -e MB_DB_USER=metabase \
  -e MB_DB_PASS=your_password \
  -e MB_DB_HOST=your-postgres-host \
  crpi-457wlgce2tlknt6u.cn-hangzhou.personal.cr.aliyuncs.com/geo_namespace/geo_local:1.0.0
```

## 验证数据持久化

启动容器后，执行以下命令验证：

```bash
# 进入容器检查数据库文件
docker exec metabase ls -la /metabase-data/metabase.db/

# 查看容器日志
docker logs metabase | grep -i "database\|migration"

# 检查挂载点
docker inspect metabase | grep -A 10 Mounts
```

