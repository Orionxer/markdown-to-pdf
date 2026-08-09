'use strict';

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

function stripFrontmatter(markdown) {
  return markdown.replace(/^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n)+/, '');
}

function convertCallouts(markdown) {
  const lines = markdown.split('\n');
  const output = [];

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^>\s*\[!([a-z][a-z0-9-]*)\][+-]?\s*(.*)$/i);
    if (!match) {
      output.push(lines[index]);
      continue;
    }

    const type = match[1].toLowerCase();
    const label = CALLOUT_LABELS[type] || `${type[0].toUpperCase()}${type.slice(1)}`;
    const title = match[2].trim();
    output.push(`> **${label}${title ? `: ${title}` : ''}**`);

    if (lines[index + 1]?.startsWith('>')) {
      output.push('>');
    }
  }

  return output.join('\n');
}

function preprocessMarkdown(markdown) {
  const withoutBom = String(markdown).replace(/^\uFEFF/, '');
  return convertCallouts(stripFrontmatter(withoutBom));
}

module.exports = { convertCallouts, preprocessMarkdown, stripFrontmatter };
