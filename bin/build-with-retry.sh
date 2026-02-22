#!/usr/bin/env bash

# 带重试机制的构建脚本
# 用于处理网络不稳定的情况

set -euo pipefail

MAX_RETRIES=3
RETRY_DELAY=5

# switch to project root directory if we're not already there
script_directory=`dirname "${BASH_SOURCE[0]}"`
cd "$script_directory/.."

source "./bin/check-clojure-cli.sh"
check_clojure_cli

source "./bin/clear-outdated-cpcaches.sh"
clear_outdated_cpcaches

source "./bin/use-project-maven-settings.sh"

# 重试函数
retry_build() {
    local retry_count=0
    while [ $retry_count -lt $MAX_RETRIES ]; do
        if clojure -X:drivers:build:build/all "$@"; then
            return 0
        fi
        retry_count=$((retry_count + 1))
        if [ $retry_count -lt $MAX_RETRIES ]; then
            echo "构建失败，将在 ${RETRY_DELAY} 秒后重试 (${retry_count}/${MAX_RETRIES})..."
            sleep $RETRY_DELAY
            # 清理可能的缓存问题
            rm -rf .cpcache
        fi
    done
    echo "构建失败，已重试 ${MAX_RETRIES} 次"
    return 1
}

retry_build "$@"
