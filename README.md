# Markdown to PDF Agent Skill

A portable Agent Skill that converts Markdown into polished A4 PDF through headless Chrome. It is optimized for CJK typography, local and remote images, GFM tables, fenced code blocks, YAML frontmatter, and Obsidian callouts.

## Requirements

- Node.js 22.13 or newer
- Chrome, Edge, Chromium, or Playwright-managed Chromium
- Poppler (`pdfinfo` and `pdftoppm`) for full visual verification

## Install

```bash
cd convert-markdown-to-pdf
npm ci
```

If no supported browser is installed:

```bash
npx playwright install chromium
```

Install the skill for multiple compatible agents:

```bash
mkdir -p ~/.agents/skills
ln -s "$(pwd)" ~/.agents/skills/convert-markdown-to-pdf
```

Claude Code and Codex can also use their native locations:

```bash
ln -s "$(pwd)" ~/.claude/skills/convert-markdown-to-pdf
ln -s "$(pwd)" ~/.codex/skills/convert-markdown-to-pdf
```

On Windows, copy `convert-markdown-to-pdf` into `%USERPROFILE%\\.agents\\skills\\` or `%USERPROFILE%\\.claude\\skills\\`.

## Use

Ask the agent:

```text
Use $convert-markdown-to-pdf to convert notes/example.md to PDF.
```

Or run the converter directly:

```bash
node scripts/markdown_to_pdf.cjs /absolute/path/input.md /absolute/path/output.pdf
```

Run `node scripts/markdown_to_pdf.cjs --help` for title, font, and browser overrides.

## Test

```bash
npm test
npm run test:visual
```

The visual test requires `pdftoppm`. The converter itself does not require Poppler.

## License

MIT
