# Markdown to PDF Agent Skill

[![CI](https://github.com/Orionxer/markdown-to-pdf/actions/workflows/ci.yml/badge.svg)](https://github.com/Orionxer/markdown-to-pdf/actions/workflows/ci.yml) [![Skill score](badges/skill-score.svg)](https://github.com/Orionxer/markdown-to-pdf) [![License](https://img.shields.io/github/license/Orionxer/markdown-to-pdf)](LICENSE) [![Repo size](https://img.shields.io/github/repo-size/Orionxer/markdown-to-pdf)](https://github.com/Orionxer/markdown-to-pdf)

> [!Info] 快速把markdown文件转换为淡蓝配色且排版良好的pdf文件。

## 1. 兼容性
- ✅ Claude Code + deepseek-V4-Flash
- ✅ Calude Code + GLM-5.2
- ✅ Codex + GPT 5.6 Sol / Terra / Luna

## 2. 安装

> [!Tip] 提供两种安装方式，任选其一即可。最方便的就是 AI Agent 自己安装，也可以选择手动安装。

### 2.1 AI Agent 安装
直接复制以下提示词发送给你的Agent，让它自己安装
```sh
请帮我安装 markdown-to-pdf Agent Skill（来自 Orionxer/markdown-to-pdf 仓库）。

安装步骤：
1. 克隆仓库：git clone https://github.com/Orionxer/markdown-to-pdf.git
   （本地已有该仓库可跳过此步）
2. 进入仓库目录：cd markdown-to-pdf
3. 执行：npx skills add Orionxer/markdown-to-pdf --skill markdown-to-pdf
4. 按交互提示选择：
   - Agents：选择 Claude Code（如需同时给 Codex 使用，可再执行一次并选择 Codex）
   - Installation scope：选择 Project 安装在当前工程，或 Global 安装到全局
   - Installation method：选择 Symlink
   - Installation Summary：确认安装路径无误
   - Proceed with installation：选择 Yes 确认安装
5. 安装运行时依赖：cd markdown-to-pdf && npm ci
6. 确认浏览器可用：macOS 默认使用系统 Chrome；若系统无浏览器则执行
   npx playwright install chromium
7. 验证安装：执行 npx skills list，确认 markdown-to-pdf 已在列表中
8. 完成后告诉我安装结果和 skill 的实际安装路径
```

### 2.2 手动安装
进入项目根目录后，执行安装skills命令
```sh
npx skills add Orionxer/markdown-to-pdf --skill markdown-to-pdf
```
根据提示
- `Agnets` : 选择 **Claude Code** 并回车确认
- `Installation scope` : 选择 **Project** 安装在当前工程，也可以安装到全局 **Global**
- `Installation method` : 选择 **Symlink**
- `Installation Summary` : 会显示SKILLS安装路径和形式
- `Proceed with installation` : 选择 **Yes** 确认安装

列出已安装的skills
```sh
npx skills list
```

## 3. 如何使用
打开任意Agent，并输入以下提示词，markdown文件以实际为准。**调用skills的时候可以使用tab自动补全**
```sh
使用 /markdown-to-pdf 把 @Linux文件权限.md 转换成pdf
```
转换成功后，到路径 `output_pdf` 查看pdf的转换效果

## 4. 删除SKILLS

## 5. 其他

### 引用块颜色说明
带类型的引用块会被渲染成指定背景色，例如 warning 为 🟡 黄色。其他类型样式如下

| 类型 | 样式 |
| --- | --- |
| Tip / Success | 🟢 绿色 |
| Note / Info / Todo | 🔵 蓝色 |
| Warning / Question | 🟡 黄色 |
| Danger / Failure / Bug | 🔴 红色 |
| Example | 🟣 紫色 |
| Quote | ⚪ 灰色 |

