# Markdown to PDF Agent Skill

A portable Agent Skill that converts Markdown into polished A4 PDF through headless Chrome. It is optimized for CJK typography, local and remote images, GFM tables, fenced code blocks, YAML frontmatter, and Obsidian callouts.

## Requirements

- Node.js 22.13 or newer
- Chrome, Edge, Chromium, or Playwright-managed Chromium
- Poppler (`pdfinfo` and `pdftoppm`) for full visual verification

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

## Test

```bash
npm test
npm run test:visual
```

The visual test requires `pdftoppm`. The converter itself does not require Poppler.

## License

MIT
