# Portable Markdown-to-PDF Skill Design

## Goal

Package the existing Markdown-to-PDF workflow as a GitHub-ready Agent Skill that runs in Claude Code, Codex, and compatible skill hosts on macOS, Linux, and Windows.

## Design

The repository root contains distribution documentation, licensing, CI, and this design history. The installable skill lives in `convert-markdown-to-pdf/`, matching its frontmatter name and allowing users to copy or symlink that directory into `~/.agents/skills`, `~/.claude/skills`, or `~/.codex/skills`.

The Node.js converter renders GFM through headless Chrome/Chromium. Dependencies are installed beside the skill and never require Codex's bundled runtime. Browser discovery prefers an explicit path, then `CHROME_PATH`, system Chrome/Edge/Chromium, and finally Playwright-managed Chromium.

The default font stack is multilingual with CJK optimization: PingFang on macOS, Microsoft YaHei on Windows, and Noto/Source Han-compatible fallbacks on Linux. Explicit `--font`, `--browser`, and `--title` options override defaults.

The renderer removes YAML frontmatter and converts Obsidian callouts to styled blockquotes before parsing. It preserves the existing guarantees for A4 output, proportional images, unwrapped code blocks, searchable commands, page footers, and machine-readable layout diagnostics.

## Verification

Unit tests cover frontmatter and callout preprocessing plus runtime discovery. Integration tests cover Chinese text, local images, wide terminal tables, searchable commands, and diagnostics. GitHub Actions runs conversion smoke tests on macOS, Linux, and Windows; Linux additionally renders every PDF page with Poppler for pixel-level image checks.

## Distribution

The repository uses the MIT License and includes installation examples for Claude Code, Codex, and the cross-runtime `~/.agents/skills` convention. No GitHub remote is created or pushed automatically.
