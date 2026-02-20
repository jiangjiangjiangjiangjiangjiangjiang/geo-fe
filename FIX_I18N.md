# 修复 i18n 翻译问题

## 问题诊断

1. ✅ 代码中使用了 `t` 标签：`{t`Brand Keywords`}`
2. ✅ `locales/zh-CN.po` 中有翻译条目
3. ❌ `locales/metabase.po` 模板文件中**没有** "Brand Keywords"
4. ❌ `resources/frontend_client/app/locales/zh_CN.json` 中**没有**该翻译

## 根本原因

虽然 `zh-CN.po` 中有翻译，但模板文件 `metabase.po` 中没有该字符串，所以构建时不会包含到 JSON 文件中。

## 解决步骤

### 步骤 1: 提取翻译字符串

运行以下命令来提取所有使用 `t` 标签的字符串：

```bash
bin/i18n/update-translation-template
```

这会：
- 扫描所有前端代码
- 提取所有 `t` 标签中的字符串
- 更新 `locales/metabase.po` 模板文件

### 步骤 2: 验证模板文件

检查 `locales/metabase.po` 中是否包含 "Brand Keywords"：

```bash
grep "Brand Keywords" locales/metabase.po
```

应该能看到类似这样的条目：
```po
#: frontend/src/metabase/geo-task/components/GeoTaskList.tsx:83
msgid "Brand Keywords"
msgstr ""
```

### 步骤 3: 确保翻译文件中有翻译

检查 `locales/zh-CN.po` 中是否有翻译（应该已经有了）：

```bash
grep -A 1 'msgid "Brand Keywords"' locales/zh-CN.po
```

应该看到：
```po
msgid "Brand Keywords"
msgstr "品牌关键词"
```

### 步骤 4: 构建翻译资源

运行构建脚本将 `.po` 文件转换为 `.json` 文件：

```bash
bin/i18n/build-translation-resources
```

或者如果是完整构建：

```bash
clojure -X:build:build/i18n
```

### 步骤 5: 验证 JSON 文件

检查生成的 JSON 文件中是否包含翻译：

```bash
grep "Brand Keywords" resources/frontend_client/app/locales/zh_CN.json
```

### 步骤 6: 重新构建前端（如果需要）

如果前端应用需要重新构建：

```bash
yarn build
# 或开发模式
yarn dev
```

### 步骤 7: 清除浏览器缓存

在浏览器中硬刷新（Cmd+Shift+R 或 Ctrl+Shift+R）以清除缓存。

## 快速修复命令（一次性执行）

```bash
# 1. 提取翻译字符串
bin/i18n/update-translation-template

# 2. 构建翻译资源
bin/i18n/build-translation-resources

# 3. 验证
grep "Brand Keywords" resources/frontend_client/app/locales/zh_CN.json
```

## 注意事项

- `metabase.po` 是模板文件，包含所有需要翻译的字符串
- 各个语言的 `.po` 文件（如 `zh-CN.po`）包含具体翻译
- 构建过程会将 `.po` 文件转换为 `.json` 文件供前端使用
- 如果模板文件中没有字符串，即使翻译文件中有，也不会被包含
