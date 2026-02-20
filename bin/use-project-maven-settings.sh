#!/usr/bin/env bash

# 使用项目自己的 Maven settings.xml，而不是全局的
# 临时替换全局 settings.xml 为项目的 settings.xml
# 在脚本退出时自动恢复

PROJECT_SETTINGS="${PWD}/.m2/settings.xml"
USER_SETTINGS="${HOME}/.m2/settings.xml"

# 如果存在全局 settings.xml，临时替换它
if [ -f "$USER_SETTINGS" ]; then
  BACKUP_SETTINGS="${USER_SETTINGS}.backup.$$"
  cp "$USER_SETTINGS" "$BACKUP_SETTINGS"
  trap "mv '$BACKUP_SETTINGS' '$USER_SETTINGS'" EXIT
  cp "$PROJECT_SETTINGS" "$USER_SETTINGS"
fi
