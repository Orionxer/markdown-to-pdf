# Markdown to PDF Agent Skill

[![CI](https://github.com/Orionxer/markdown-to-pdf/actions/workflows/markdown-to-pdf.yml/badge.svg)](https://github.com/Orionxer/markdown-to-pdf/actions/workflows/markdown-to-pdf.yml) [![Repo size](https://img.shields.io/github/repo-size/Orionxer/markdown-to-pdf)](https://github.com/Orionxer/markdown-to-pdf) [![License](https://img.shields.io/github/license/Orionxer/markdown-to-pdf)](LICENSE) [![Skill score](badges/skill-score.svg)](https://github.com/Orionxer/markdown-to-pdf)

A portable Agent Skill that converts Markdown into polished A4 PDF through headless Chrome. It is optimized for CJK typography, local and remote images, GFM tables, fenced code blocks, YAML frontmatter, and Obsidian callouts.

A portable Agent Skill that converts Markdown into polished A4 PDF through headless Chrome. It is optimized for CJK typography, local and remote images, GFM tables, fenced code blocks, YAML frontmatter, and Obsidian callouts.

## Requirements

- Node.js 22.13 or newer
- Chrome, Edge, Chromium, or Playwright-managed Chromium

No other system tools are needed. The converter validates layout and image integrity inside the browser via DOM geometry and reports the result as `DIAGNOSTICS_JSON`; no visual inspection or Poppler is required.

## Install

After publishing this repository as `Orionxer/markdown-to-pdf`, install it with the standard Skills CLI:

```bash
npx skills add Orionxer/markdown-to-pdf --skill markdown-to-pdf
```

For a manual installation, clone or download the repository, then install its runtime dependencies:

```bash
cd markdown-to-pdf
npm ci
```

If no supported browser is installed:

```bash
npx playwright install chromium
```

Install the skill for multiple compatible agents:

```bash
mkdir -p ~/.agents/skills
ln -s "$(pwd)" ~/.agents/skills/markdown-to-pdf
```

Claude Code and Codex can also use their native locations:

```bash
ln -s "$(pwd)" ~/.claude/skills/markdown-to-pdf
ln -s "$(pwd)" ~/.codex/skills/markdown-to-pdf
```

On Windows, copy `markdown-to-pdf` into `%USERPROFILE%\\.agents\\skills\\` or `%USERPROFILE%\\.claude\\skills\\`.

## Use

Ask the agent:

```text
Use $markdown-to-pdf to convert notes/example.md to PDF.
```

Or run the converter directly:

```bash
node scripts/markdown_to_pdf.cjs /absolute/path/input.md /absolute/path/output.pdf
```

Run `node scripts/markdown_to_pdf.cjs --help` for title, font, and browser overrides.

## Callout Colors

Obsidian callouts (`> [!type] Title`) render as type-colored blocks:

| 类型 | 样式 |
| --- | --- |
| warning | 🟡 黄色背景 + 黄边框（`#fff7e0`） |
| danger / failure / bug | 🔴 红色系 |
| note / info / todo | 🔵 蓝色系 |
| tip / success | 🟢 绿色系 |
| question | 🟣 紫蓝色系 |
| example | 🟣 紫色系 |
| abstract | 🟦 青绿色系 |
| quote | ⚪ 灰色系 |

Callout body lines are absorbed up to the first blank line, with or without a `>` prefix — both forms render as the same colored block.

## Test

```bash
npm test
npm run test:visual
```

The optional visual test (`test:visual`) requires `pdftoppm` and is only used by CI on Linux. The converter itself does not require Poppler, and neither does the skill workflow.

## License

MIT
