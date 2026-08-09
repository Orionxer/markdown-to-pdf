# Portable Markdown-to-PDF Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone, GitHub-ready Markdown-to-PDF Agent Skill for Claude Code, Codex, and compatible hosts on macOS, Linux, and Windows.

**Architecture:** Keep the installable skill in `convert-markdown-to-pdf/`. A Node CLI preprocesses Markdown, resolves local dependencies and a Chrome-compatible browser, renders with HTML/CSS, validates layout in-page, and writes A4 PDF plus JSON diagnostics.

**Tech Stack:** Node.js 22.13+, marked, Playwright, sharp, pdfjs-dist, Chrome/Chromium, optional Poppler.

## Global Constraints

- Preserve source Markdown; preprocessing occurs only in memory.
- Prefer system Chrome/Edge/Chromium and fall back to Playwright Chromium.
- Keep images proportional and code blocks unwrapped.
- Default to a cross-platform CJK-capable font stack.
- Publish under the MIT License without creating or pushing a GitHub remote.

---

### Task 1: Repository and failing contracts

**Files:** Create repository metadata, `convert-markdown-to-pdf/package.json`, and Node tests.

- [ ] Write tests for YAML removal, Obsidian callouts, browser resolution, conversion diagnostics, searchable code, and image containment.
- [ ] Run `npm test` and confirm failure because the preprocessing/runtime modules and converter do not exist.
- [ ] Initialize Git and commit the approved design before implementation.

### Task 2: Portable converter

**Files:** Create focused preprocessing/runtime modules and the converter CLI under `convert-markdown-to-pdf/scripts/`.

- [ ] Implement only the APIs required by the failing tests.
- [ ] Resolve dependencies locally with optional environment overrides.
- [ ] Add browser discovery and Playwright fallback.
- [ ] Preserve A4, image, code, footer, font, and diagnostics behavior.
- [ ] Run unit and integration tests until green.

### Task 3: Skill and distribution metadata

**Files:** Create `SKILL.md`, `agents/openai.yaml`, README, LICENSE, `.gitignore`, lockfile, and CI.

- [ ] Document installation and invocation for cross-runtime, Claude Code, and Codex paths.
- [ ] Add three-platform CI with Linux Poppler verification.
- [ ] Validate skill frontmatter with `quick_validate.py`.

### Task 4: Acceptance verification

**Files:** Use the existing `Linux/Linux文件权限.md` as an external acceptance fixture; do not modify it.

- [ ] Install dependencies with `npm ci`.
- [ ] Convert the Chinese fixture and require valid diagnostics.
- [ ] Confirm A4 with `pdfinfo`, render and inspect every page, and extract commands with PDF.js.
- [ ] Run `npm test`, `npm pack --dry-run`, and repository status checks.
- [ ] Commit the verified repository without configuring a remote.
