# GEO Task 多语言支持指南

## 概述

项目使用 `ttag` 库进行国际化（i18n）。所有需要翻译的字符串都应该使用 `t` 模板标签标记。

## 步骤 1: 在代码中使用翻译标签

在前端代码中，使用 `t` 标签包裹需要翻译的字符串：

```typescript
import { t } from "ttag";

// 简单字符串
const title = t`Brand Keywords`;

// 在 JSX 中使用
<th>{t`Brand Keywords`}</th>
<Button>{t`Execute`}</Button>

// 带变量的字符串
const message = t`Hello ${name}!`;
```

## 步骤 2: 提取翻译字符串

运行以下命令来提取所有使用 `t` 标签的字符串到模板文件：

```bash
bin/i18n/update-translation-template
```

这个脚本会：
1. 扫描所有前端代码（`.js`, `.jsx`, `.ts`, `.tsx` 文件）
2. 提取所有 `t` 标签中的字符串
3. 生成 `locales/metabase-frontend.pot` 文件
4. 合并前端、后端和自动仪表板的翻译模板到 `locales/metabase.po`

## 步骤 3: 添加翻译条目

### 方法 A: 手动添加到翻译文件

在 `locales/zh-CN.po` 文件中添加翻译条目：

```po
#: frontend/src/metabase/geo-task/components/GeoTaskList.tsx:83
msgid "Brand Keywords"
msgstr "品牌关键词"
```

格式说明：
- `#:` 后面是源文件路径和行号（注释，用于定位）
- `msgid` 是原始字符串（英文）
- `msgstr` 是翻译后的字符串（中文）

### 方法 B: 使用 msgmerge 工具（推荐）

如果你已经运行了 `update-translation-template`，新的字符串会自动添加到 `locales/metabase.po` 中（`msgstr` 为空）。

然后使用 `msgmerge` 来更新特定语言的翻译文件：

```bash
# 更新中文翻译文件
msgmerge --update locales/zh-CN.po locales/metabase.po
```

这会将新的字符串添加到 `zh-CN.po`，你需要手动填写 `msgstr`。

## 步骤 4: 构建翻译资源

翻译文件（`.po`）需要被转换为应用可以使用的格式。运行：

```bash
bin/i18n/build-translation-resources
```

或者如果是完整构建流程的一部分：

```bash
clojure -X:build:build/i18n
```

这会生成 `resources/frontend_client/app/locales/zh_CN.json` 等文件。

## 步骤 5: 重新构建前端

翻译资源生成后，需要重新构建前端应用：

```bash
yarn build
# 或开发模式
yarn dev
```

## 完整工作流程示例

假设你要添加 "Brand Keywords" 的翻译：

1. **在代码中使用翻译标签**（已完成）：
   ```typescript
   <th>{t`Brand Keywords`}</th>
   ```

2. **提取翻译字符串**：
   ```bash
   bin/i18n/update-translation-template
   ```

3. **检查模板文件**：
   查看 `locales/metabase.po`，确认 "Brand Keywords" 已被提取：
   ```po
   #: frontend/src/metabase/geo-task/components/GeoTaskList.tsx:83
   msgid "Brand Keywords"
   msgstr ""
   ```

4. **添加中文翻译**：
   在 `locales/zh-CN.po` 中添加或更新：
   ```po
   #: frontend/src/metabase/geo-task/components/GeoTaskList.tsx:83
   msgid "Brand Keywords"
   msgstr "品牌关键词"
   ```

5. **构建翻译资源**：
   ```bash
   bin/i18n/build-translation-resources
   ```

6. **重新构建应用**：
   ```bash
   yarn build
   ```

## 验证翻译

1. 启动应用
2. 将用户语言设置为中文（Chinese (China)）
3. 检查界面是否显示中文翻译

## 常见问题

### Q: 为什么翻译不生效？

A: 可能的原因：
1. 没有运行 `update-translation-template` 提取字符串
2. 翻译文件中 `msgstr` 为空
3. 没有构建翻译资源
4. 前端应用没有重新构建
5. 浏览器缓存，需要硬刷新（Cmd+Shift+R 或 Ctrl+Shift+R）

### Q: 如何添加新的语言支持？

A: 
1. 复制 `locales/zh-CN.po` 为新的语言文件，如 `locales/en.po`
2. 修改文件头部的语言信息
3. 翻译所有 `msgstr` 字段
4. 确保在 `resources/locales.clj` 中注册新语言

### Q: 翻译文件格式错误怎么办？

A: 使用 `msgfmt` 检查 `.po` 文件格式：
```bash
msgfmt --check locales/zh-CN.po
```

## 参考资源

- [ttag 文档](https://ttag.js.org/)
- [GNU gettext 文档](https://www.gnu.org/software/gettext/)
- 项目文档：`docs/developers-guide/internationalization.md`
