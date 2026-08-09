'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { preprocessMarkdown } = require('../markdown-to-pdf/scripts/lib/markdown.cjs');

test('removes leading YAML frontmatter without changing body content', () => {
  const source = '---\ntags: [Linux, 权限]\n---\n\n# 标题\n\n正文。\n';
  assert.equal(preprocessMarkdown(source), '# 标题\n\n正文。\n');
});

test('converts an Obsidian callout into a titled blockquote', () => {
  const source = '> [!warning] 谨慎使用 `chmod -R 777`\n> `777` 会赋予过多权限。\n';
  assert.equal(
    preprocessMarkdown(source),
    '> **Warning: 谨慎使用 `chmod -R 777`**\n>\n> `777` 会赋予过多权限。\n',
  );
});

test('leaves ordinary blockquotes unchanged', () => {
  const source = '> 普通引用\n> 第二行\n';
  assert.equal(preprocessMarkdown(source), source);
});
