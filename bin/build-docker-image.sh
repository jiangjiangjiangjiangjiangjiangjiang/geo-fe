#!/usr/bin/env bash

# 一键打包：构建 drivers → 安装依赖 → 构建前端 → 构建 uberjar → 构建 Docker 镜像 → 打标签 [→ 推送到阿里云]
# 用法: ./bin/build-docker-image.sh [镜像版本] [--push]
#       版本默认 1.0.0；加 --push 会执行 docker push 推送到阿里云镜像仓库

set -euo pipefail

script_directory="$(dirname "${BASH_SOURCE[0]}")"
cd "$script_directory/.."

DO_PUSH=false
VERSION="1.0.0"
for arg in "$@"; do
  if [[ "$arg" == "--push" ]]; then
    DO_PUSH=true
  else
    VERSION="$arg"
  fi
done

IMAGE_NAME="metabase-custom"
REGISTRY_IMAGE="crpi-457wlgce2tlknt6u.cn-hangzhou.personal.cr.aliyuncs.com/geo_namespace/geo_local:${VERSION}"

echo "==> Step 1/6: Building drivers..."
./bin/build-drivers.sh

echo "==> Step 2/6: yarn install..."
yarn install

echo "==> Step 3/6: yarn build..."
yarn build

echo "==> Step 4/6: Building uberjar..."
./bin/build.sh

echo "==> Step 5/6: Building Docker image (linux/amd64)..."
docker buildx build --platform linux/amd64 -t "${IMAGE_NAME}:${VERSION}" --load .

echo "==> Step 6/6: Tagging for registry..."
docker tag "${IMAGE_NAME}:${VERSION}" "${REGISTRY_IMAGE}"

if [[ "$DO_PUSH" == true ]]; then
  echo "==> Pushing to registry..."
  docker push "${REGISTRY_IMAGE}"
  echo ""
  echo "Done. Image pushed: ${REGISTRY_IMAGE}"
else
  echo ""
  echo "Done. Image tagged as: ${REGISTRY_IMAGE}"
  echo "Push with: docker push ${REGISTRY_IMAGE}"
  echo "Or run with --push to build and push in one go."
fi
