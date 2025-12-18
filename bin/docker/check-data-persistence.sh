#!/bin/bash
# 诊断 Metabase Docker 数据持久化问题

echo "=== Metabase 数据持久化诊断 ==="
echo ""

# 检查容器是否运行
if ! docker ps | grep -q metabase; then
    echo "❌ 错误: Metabase 容器未运行"
    echo "   请先启动容器: docker start metabase"
    exit 1
fi

CONTAINER_NAME="metabase"
HOST_DATA_DIR="/data/metabase"
CONTAINER_DATA_DIR="/metabase-data"

echo "1. 检查主机数据目录..."
if [ -d "$HOST_DATA_DIR" ]; then
    echo "   ✅ 主机数据目录存在: $HOST_DATA_DIR"
    echo "   目录内容:"
    ls -lah "$HOST_DATA_DIR" | head -10
else
    echo "   ❌ 主机数据目录不存在: $HOST_DATA_DIR"
    echo "   请创建目录: mkdir -p $HOST_DATA_DIR"
fi

echo ""
echo "2. 检查数据库文件..."
DB_FILE_PATH="$HOST_DATA_DIR/metabase.db/metabase.db.mv.db"
if [ -f "$DB_FILE_PATH" ]; then
    echo "   ✅ 数据库文件存在: $DB_FILE_PATH"
    echo "   文件大小: $(du -h "$DB_FILE_PATH" | cut -f1)"
    echo "   最后修改: $(stat -c %y "$DB_FILE_PATH" 2>/dev/null || stat -f "%Sm" "$DB_FILE_PATH")"
else
    echo "   ❌ 数据库文件不存在: $DB_FILE_PATH"
    echo "   这是新安装，或者数据已丢失"
fi

echo ""
echo "3. 检查容器内数据库文件..."
if docker exec "$CONTAINER_NAME" test -f "$CONTAINER_DATA_DIR/metabase.db/metabase.db.mv.db"; then
    echo "   ✅ 容器内数据库文件存在"
    echo "   文件信息:"
    docker exec "$CONTAINER_NAME" ls -lah "$CONTAINER_DATA_DIR/metabase.db/" 2>/dev/null | head -5
else
    echo "   ❌ 容器内数据库文件不存在"
fi

echo ""
echo "4. 检查挂载点..."
MOUNT_INFO=$(docker inspect "$CONTAINER_NAME" | grep -A 10 '"Mounts"')
if echo "$MOUNT_INFO" | grep -q "$HOST_DATA_DIR"; then
    echo "   ✅ 数据卷已正确挂载"
    echo "$MOUNT_INFO" | grep -A 5 "$HOST_DATA_DIR"
else
    echo "   ❌ 数据卷挂载可能有问题"
    echo "$MOUNT_INFO"
fi

echo ""
echo "5. 检查环境变量..."
echo "   MB_DB_TYPE: $(docker exec "$CONTAINER_NAME" printenv MB_DB_TYPE 2>/dev/null || echo '未设置')"
echo "   MB_DB_FILE: $(docker exec "$CONTAINER_NAME" printenv MB_DB_FILE 2>/dev/null || echo '未设置')"

echo ""
echo "6. 检查容器日志（最近 20 行）..."
echo "   ---"
docker logs "$CONTAINER_NAME" --tail 20 2>&1 | grep -i -E "database|migration|error|exception" || echo "   无相关日志"
echo "   ---"

echo ""
echo "=== 诊断完成 ==="
echo ""
echo "建议操作:"
echo "1. 如果数据库文件不存在，检查是否有备份"
echo "2. 确保 /data/metabase 目录权限正确: chown -R 2000:2000 /data/metabase"
echo "3. 检查容器启动命令是否正确设置了 -v 参数"
echo "4. 查看完整日志: docker logs metabase"

