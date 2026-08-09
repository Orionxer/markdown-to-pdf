#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const sharp = require('sharp');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options });
  if (result.status !== 0) throw new Error(`${command} failed (${result.status})\n${result.stdout}\n${result.stderr}`);
  return result;
}

async function countCornerColors(pagePaths) {
  const counts = { red: 0, green: 0, blue: 0, magenta: 0 };
  for (const pagePath of pagePaths) {
    const { data } = await sharp(pagePath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let index = 0; index < data.length; index += 3) {
      const [red, green, blue] = [data[index], data[index + 1], data[index + 2]];
      if (red > 180 && green < 90 && blue < 90) counts.red += 1;
      if (red < 90 && green > 140 && blue < 90) counts.green += 1;
      if (red < 90 && green < 110 && blue > 160) counts.blue += 1;
      if (red > 160 && green < 90 && blue > 160) counts.magenta += 1;
    }
  }
  return counts;
}

async function extractPdfText(pdfPath) {
  const pdfjsPath = require.resolve('pdfjs-dist/legacy/build/pdf.mjs');
  const pdfjs = await import(pathToFileURL(pdfjsPath).href);
  const bytes = new Uint8Array(fs.readFileSync(pdfPath));
  const document = await pdfjs.getDocument({ data: bytes, disableWorker: true }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str).join(' '));
  }
  return pages.join('\n').normalize('NFKC');
}

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'markdown-to-pdf-visual-'));
  try {
    const imagePath = path.join(tempDir, 'wide.png');
    const markdownPath = path.join(tempDir, 'fixture.md');
    const pdfPath = path.join(tempDir, 'fixture.pdf');
    const renderPrefix = path.join(tempDir, 'page');
    const converter = path.join(__dirname, 'markdown_to_pdf.cjs');
    const wideSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="800">
      <rect width="2400" height="800" fill="#f4f4f4"/>
      <rect x="0" y="0" width="180" height="180" fill="#ff0000"/>
      <rect x="2220" y="0" width="180" height="180" fill="#00b800"/>
      <rect x="0" y="620" width="180" height="180" fill="#0000ff"/>
      <rect x="2220" y="620" width="180" height="180" fill="#ff00ff"/>
      <rect x="15" y="15" width="2370" height="770" fill="none" stroke="#111" stroke-width="30"/>
    </svg>`;
    await sharp(Buffer.from(wideSvg)).png().toFile(imagePath);
    fs.writeFileSync(markdownPath, `---\ntags: [visual]\n---\n# Fixture\n\n中文正文。\n![wide](./wide.png)\n\n> [!warning] Keep permissions narrow\n> Use the minimum necessary access.\n\n\`\`\`sh\necho ok\n┌───────┬───────────────────────────┬───────┬────────┬───────────┬──────────────────┬────────┐\n│ INDEX │           TITLE           │ STATE │ AUTHOR │ MILESTONE │     UPDATED      │ LABELS │\n├───────┼───────────────────────────┼───────┼────────┼───────────┼──────────────────┼────────┤\n│ 3     │        New PR Test        │ open  │ test   │           │ 2026-08-06 10:53 │        │\n└───────┴───────────────────────────┴───────┴────────┴───────────┴──────────────────┴────────┘\n\`\`\`\n`);

    const conversion = run(process.execPath, [converter, markdownPath, pdfPath]);
    const diagnosticsLine = conversion.stdout.split('\n').find((line) => line.startsWith('DIAGNOSTICS_JSON='));
    assert(diagnosticsLine, 'converter emitted no diagnostics');
    const diagnostics = JSON.parse(diagnosticsLine.slice('DIAGNOSTICS_JSON='.length));
    assert.equal(diagnostics.imageLayouts.length, 1);
    assert.equal(diagnostics.imageLayouts[0].wrappedInFigure, true);
    assert.equal(diagnostics.imageLayouts[0].withinContainer, true);
    assert(diagnostics.imageLayouts[0].aspectError <= 0.01);

    run(process.env.PDFTOPPM || 'pdftoppm', ['-png', '-r', '96', pdfPath, renderPrefix]);
    const pages = fs.readdirSync(tempDir).filter((name) => /^page-\d+\.png$/.test(name)).sort().map((name) => path.join(tempDir, name));
    assert(pages.length > 0, 'converter produced no rendered pages');
    const counts = await countCornerColors(pages);
    for (const [color, count] of Object.entries(counts)) assert(count > 100, `wide image lost its ${color} corner`);

    const text = await extractPdfText(pdfPath);
    assert.match(text, /echo\s+ok/);
    assert.doesNotMatch(text, /\$\s*echo\s+ok/);
    assert.doesNotMatch(text, /tags:\s*\[visual\]/);
    assert.match(text, /Warning:\s*Keep permissions narrow/);
    console.log(`PASS image corners ${JSON.stringify(counts)}`);
    console.log('PASS frontmatter removed and callout rendered');
    console.log('PASS code blocks remain searchable without injected prompts');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
