'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('skill metadata uses the portable skill name and trigger description', () => {
  const skillPath = path.join(__dirname, '../SKILL.md');
  assert(fs.existsSync(skillPath), 'SKILL.md must exist');
  const content = fs.readFileSync(skillPath, 'utf8');
  assert.match(content, /^---\nname: convert-markdown-to-pdf\ndescription: Use when .+\n---\n/);
  assert.match(content, /Claude Code/);
  assert.match(content, /DIAGNOSTICS_JSON/);
});
