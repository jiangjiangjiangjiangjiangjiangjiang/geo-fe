# 快速修复 "Brand Keywords" 翻译问题

## 当前状态

✅ 代码中已使用 `{t`Brand Keywords`}`
✅ `locales/zh-CN.po` 中有翻译：`msgstr "品牌关键词"`
✅ `locales/metabase.po` 模板文件中已添加 "Brand Keywords" 条目

## 需要执行的步骤

由于构建翻译资源需要 Java 环境，请在你的终端中运行以下命令：

### 步骤 1: 构建翻译资源

```bash
cd /Users/jeffrey/Documents/Code/Personal/geo-fe
bin/i18n/build-translation-resources
```

这个命令会：
- 读取 `locales/zh-CN.po` 中的翻译
- 生成 `resources/frontend_client/app/locales/zh_CN.json` 文件
- 包含 "Brand Keywords" → "品牌关键词" 的翻译

### 步骤 2: 验证翻译已生成

```bash
grep "Brand Keywords" resources/frontend_client/app/locales/zh_CN.json
```

应该能看到类似这样的内容：
```json
"Brand Keywords": {"msgstr": ["品牌关键词"]}
```

### 步骤 3: 重新构建前端（如果需要）

如果前端应用正在运行，需要重新构建：

```bash
yarn build
# 或开发模式
yarn dev
```

### 步骤 4: 清除浏览器缓存

在浏览器中硬刷新：
- Mac: `Cmd + Shift + R`
- Windows/Linux: `Ctrl + Shift + R`

## 如果遇到 Java 错误

如果提示找不到 Java，需要先安装 Java：

```bash
# 使用 Homebrew 安装（Mac）
brew install openjdk

# 或使用 SDKMAN（跨平台）
curl -s "https://get.sdkman.io" | bash
sdk install java
```

## 验证修复

修复后，在浏览器中：
1. 确保语言设置为中文（Chinese (China)）
2. 访问 Geo Tasks 页面
3. 表格列标题应该显示 "品牌关键词" 而不是 "Brand Keywords"
