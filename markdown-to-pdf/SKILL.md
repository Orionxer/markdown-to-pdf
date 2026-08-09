---
name: markdown-to-pdf
description: Use when converting Markdown files to polished A4 PDFs, especially documents containing Chinese or other CJK text, local or remote images, GFM tables, fenced code blocks, shell commands, YAML frontmatter, or Obsidian callouts.
---

# Convert Markdown to PDF

Render Markdown through headless Chrome for cross-platform CJK typography, proportional images, source-exact code blocks, searchable text, and layout diagnostics. This skill works with Claude Code, Codex, and compatible Agent Skills hosts.

## Workflow

1. Resolve the input Markdown and output path. Default to `output/pdf/<source-name>.pdf` unless the user specifies a location.
2. From this skill directory, run `npm ci` when `node_modules` is absent. If no system Chrome, Edge, or Chromium is available, run `npx playwright install chromium`.
3. Run `scripts/markdown_to_pdf.cjs`. It removes YAML frontmatter and converts Obsidian callouts in memory; never edit the source Markdown.
4. Require `DIAGNOSTICS_JSON` to report:
   - no failed images;
   - one `imageLayouts` entry per source image;
   - every image wrapped in a figure, contained, rendered with `object-fit: contain`, and preserving aspect ratio within 1%;
   - every fenced block with `whiteSpace: pre` and `fitsWithoutWrapping: true`;
   - non-empty body, heading, and code font selections when those elements exist.
5. Confirm A4 with `pdfinfo`. Render every page with `pdftoppm -png` and inspect the complete page set. Check image edges, clipped text, orphan pages, broken images, split code blocks, and table overflow.
6. When commands matter, extract PDF text with PDF.js or another available PDF text tool. Confirm every command remains searchable and no `$` prompt or character was injected.
7. Return only the final PDF as the output artifact.

## Command

```bash
node "$SKILL_DIR/scripts/markdown_to_pdf.cjs" \
  "/absolute/path/input.md" \
  "/absolute/path/output/pdf/input.pdf"
```

Set `SKILL_DIR` to this skill directory. Run `--help` for `--title`, `--font`, and `--browser`. `CHROME_PATH` also selects a browser executable.

## Platform Defaults

| Platform | Preferred CJK font | Browser discovery |
| --- | --- | --- |
| macOS | PingFang SC | Chrome, Edge, Chromium |
| Windows | Microsoft YaHei | Chrome, Edge, Chromium |
| Linux | Noto Sans CJK SC | Chrome, Edge, Chromium |

All platforms retain CJK-capable fallbacks. Use `--font` to prepend an installed font without discarding fallbacks.

## Common Mistakes

- Do not assume Claude Code or Codex supplies Node packages; install this skill's dependencies locally.
- Do not deliver from text extraction alone; render and inspect every page.
- Do not accept a loaded image as proof it is complete; compare its visible edges and aspect ratio.
- Do not add shell prompts or wrap/crop terminal tables.
- Do not modify source Markdown to remove frontmatter or repair callouts; preprocessing is automatic and in memory.
