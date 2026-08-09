'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('skill metadata uses the portable skill name and trigger description', () => {
  const skillPath = path.join(__dirname, '../markdown-to-pdf/SKILL.md');
  assert(fs.existsSync(skillPath), 'SKILL.md must exist');
  const content = fs.readFileSync(skillPath, 'utf8');
  assert.match(content, /^---\nname: markdown-to-pdf\ndescription: Use when .+\n---\n/);
  assert.match(content, /Claude Code/);
  assert.match(content, /DIAGNOSTICS_JSON/);
});

test('installable skill contains only runtime files and resource layers', () => {
  const skillPath = path.join(__dirname, '../markdown-to-pdf');
  const ignored = new Set(['node_modules']);
  const entries = fs.readdirSync(skillPath).filter((entry) => !ignored.has(entry)).sort();
  assert.deepEqual(entries, ['SKILL.md', 'package-lock.json', 'package.json', 'scripts']);
});
