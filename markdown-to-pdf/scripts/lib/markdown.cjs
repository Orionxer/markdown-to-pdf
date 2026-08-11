'use strict';

const { marked } = require('marked');

const CALLOUT_LABELS = {
  note: 'Note',
  abstract: 'Abstract',
  info: 'Info',
  todo: 'Todo',
  tip: 'Tip',
  success: 'Success',
  question: 'Question',
  warning: 'Warning',
  failure: 'Failure',
  danger: 'Danger',
  bug: 'Bug',
  example: 'Example',
  quote: 'Quote',
};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function stripFrontmatter(markdown) {
  return markdown.replace(/^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n)+/, '');
}

function preprocessMarkdown(markdown) {
  const withoutBom = String(markdown).replace(/^﻿/, '');
  return stripFrontmatter(withoutBom);
}

// Marked block extension that renders Obsidian callouts (`> [!warning] Title`)
// as type-colored divs instead of plain blockquotes. Registered by the
// converter before parsing; see scripts/markdown_to_pdf.cjs.
const calloutExtension = {
  name: 'callout',
  level: 'block',
  start(src) {
    const match = src.match(/^>[ \t]*\[!/m);
    return match ? match.index : -1;
  },
  tokenizer(src) {
    const rule = /^>[ \t]*\[!([a-z][a-z0-9-]*)\][+-]?[ \t]*([^\n]*)/i;
    const match = rule.exec(src);
    if (!match) return undefined;
    // Absorb every following line up to the first blank line, whether or not
    // it carries a `>` prefix — Obsidian treats both forms as one callout.
    // The leading '\n' is the title line's own terminator, not a blank line.
    const bodyLines = [];
    const rest = src.slice(match[0].length).replace(/^\n/, '');
    for (const line of rest.split('\n')) {
      if (!line.trim()) break;
      bodyLines.push(line.replace(/^>[ \t]?/, ''));
    }
    return {
      type: 'callout',
      raw: match[0] + (bodyLines.length ? `\n${bodyLines.join('\n')}` : ''),
      calloutType: match[1].toLowerCase(),
      title: match[2].trim(),
      body: bodyLines.join('\n'),
    };
  },
  renderer(token) {
    const label = token.title ? marked.parseInline(token.title) : CALLOUT_LABELS[token.calloutType] || token.calloutType;
    const content = token.body ? marked.parse(token.body) : '';
    return `<div class="callout callout-${token.calloutType}"><p class="callout-title">${label}</p>${content}</div>`;
  },
};

module.exports = { calloutExtension, preprocessMarkdown, stripFrontmatter };
