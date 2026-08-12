'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { calloutExtension, preprocessMarkdown } = require('../markdown-to-pdf/scripts/lib/markdown.cjs');

const skillRequire = createRequire(require.resolve('../markdown-to-pdf/package.json'));
const { marked } = skillRequire('marked');

marked.use({ extensions: [calloutExtension] });

test('removes leading YAML frontmatter without changing body content', () => {
  const source = '---\ntags: [Linux, 权限]\n---\n\n# 标题\n\n正文。\n';
  assert.equal(preprocessMarkdown(source), '# 标题\n\n正文。\n');
});

test('leaves Obsidian callouts untouched for the marked extension', () => {
  const source = '> [!warning] 谨慎使用 `chmod -R 777`\n> `777` 会赋予过多权限。\n';
  assert.equal(preprocessMarkdown(source), source);
});

test('leaves ordinary blockquotes unchanged', () => {
  const source = '> 普通引用\n> 第二行\n';
  assert.equal(preprocessMarkdown(source), source);
});

test('callout extension renders a type-colored callout with a plain title', () => {
  const html = marked.parse('> [!warning] 谨慎使用 chmod\n> `777` 会赋予过多权限。\n');
  assert.match(html, /<div class="callout callout-warning">/);
  assert.match(html, /<p class="callout-title">谨慎使用 chmod<\/p>/);
  assert.match(html, /<code>777<\/code> 会赋予过多权限。/);
  assert.doesNotMatch(html, /Warning:/);
});

test('callout extension parses inline markdown in the title', () => {
  const html = marked.parse('> [!warning] 谨慎使用 `chmod -R 777`\n> 内容。\n');
  assert.match(html, /<p class="callout-title">谨慎使用 <code>chmod -R 777<\/code><\/p>/);
  assert.doesNotMatch(html, /`chmod/);
});

test('callout extension falls back to the type label when title is empty', () => {
  const html = marked.parse('> [!warning]\n> 内容。\n');
  assert.match(html, /<p class="callout-title">Warning<\/p>/);
});

test('callout extension title-cases GitHub alert types without titles', () => {
  const html = marked.parse('> [!important]\n> 内容。\n\n> [!caution]\n> 内容。\n');
  assert.match(html, /<div class="callout callout-important">[\s\S]*<p class="callout-title">Important<\/p>/);
  assert.match(html, /<div class="callout callout-caution">[\s\S]*<p class="callout-title">Caution<\/p>/);
  assert.doesNotMatch(html, /title">important</);
  assert.doesNotMatch(html, /title">caution</);
});

test('callout extension leaves ordinary blockquotes alone', () => {
  const html = marked.parse('> 普通引用\n');
  assert.doesNotMatch(html, /class="callout"/);
  assert.match(html, /<blockquote>/);
});

test('callout body lines without a blockquote prefix render inside the callout', () => {
  const html = marked.parse('> [!warning] 谨慎使用 chmod\n`777` 会赋予过多权限，容易造成安全风险。\n');
  assert.match(html, /<div class="callout callout-warning">/);
  assert.match(html, /<code>777<\/code> 会赋予过多权限，容易造成安全风险。/);
  assert.doesNotMatch(html, /<blockquote>/);
});

test('prefixed and unprefixed callout bodies render identically without trailing fragments', () => {
  const prefixed = marked.parse('> [!Note]\n> 蓝色引用块 **iperf3**。\n\n后续内容。\n');
  const unprefixed = marked.parse('> [!Note]\n蓝色引用块 **iperf3**。\n\n后续内容。\n');

  assert.equal(prefixed, unprefixed);
  assert.doesNotMatch(prefixed, /<p>\*。<\/p>/);
});

test('callout with prefixed and unprefixed body lines renders as one block', () => {
  const html = marked.parse('> [!warning] 标题\n> 第一行\n第二行\n');
  assert.match(html, /<div class="callout callout-warning">/);
  assert.match(html, /第一行/);
  assert.match(html, /第二行/);
});

test('callout ends at the first blank line', () => {
  const html = marked.parse('> [!warning] 标题\n内容。\n\n块外段落。\n');
  const callout = html.match(/<div class="callout callout-warning">([\s\S]*?)<\/div>/)?.[1] || '';
  assert.match(callout, /内容。/);
  assert.doesNotMatch(callout, /块外段落。/);
  assert.match(html, /块外段落。/);
});
