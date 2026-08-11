'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');

const skillPath = path.join(__dirname, '../markdown-to-pdf');
const skillRequire = createRequire(path.join(skillPath, 'package.json'));
const converter = path.join(skillPath, 'scripts/markdown_to_pdf.cjs');

function runConverter(input, output) {
  return spawnSync(process.execPath, [converter, input, output], {
    cwd: path.dirname(input),
    encoding: 'utf8',
  });
}

async function extractPdfText(pdfPath) {
  const pdfjsPath = skillRequire.resolve('pdfjs-dist/legacy/build/pdf.mjs');
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

async function extractFirstPageItems(pdfPath) {
  const pdfjsPath = skillRequire.resolve('pdfjs-dist/legacy/build/pdf.mjs');
  const pdfjs = await import(pathToFileURL(pdfjsPath).href);
  const bytes = new Uint8Array(fs.readFileSync(pdfPath));
  const document = await pdfjs.getDocument({ data: bytes, disableWorker: true }).promise;
  const page = await document.getPage(1);
  return (await page.getTextContent()).items;
}

test('creates searchable A4 PDF with contained images and unwrapped code', async (context) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'markdown-to-pdf-test-'));
  context.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));
  const imagePath = path.join(tempDir, 'wide.svg');
  const markdownPath = path.join(tempDir, 'fixture.md');
  const pdfPath = path.join(tempDir, 'fixture.pdf');

  fs.writeFileSync(imagePath, '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400"><rect width="1200" height="400" fill="#174a78"/></svg>');
  fs.writeFileSync(markdownPath, `---\ntags: [test]\n---\n# 中文 Fixture\n\n![wide](./wide.svg)\n\n> [!warning] Permission warning\n> Keep the minimum permission.\n\n\`\`\`sh\necho ok\n┌──────────┬──────────────────────────────────────────────────────────────────────────────┐\n│ COMMAND  │ RESULT                                                                       │\n└──────────┴──────────────────────────────────────────────────────────────────────────────┘\n\`\`\`\n`);

  const result = runConverter(markdownPath, pdfPath);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert(fs.existsSync(pdfPath));
  const line = result.stdout.split('\n').find((item) => item.startsWith('DIAGNOSTICS_JSON='));
  assert(line, 'converter did not emit diagnostics');
  const diagnostics = JSON.parse(line.slice('DIAGNOSTICS_JSON='.length));
  assert.equal(diagnostics.failedImages.length, 0);
  assert.equal(diagnostics.imageLayouts.length, 1);
  assert.equal(diagnostics.imageLayouts[0].wrappedInFigure, true);
  assert.equal(diagnostics.imageLayouts[0].withinContainer, true);
  assert(diagnostics.imageLayouts[0].aspectError <= 0.01);
  assert(diagnostics.codeLayouts.every((item) => item.whiteSpace === 'pre' && item.fitsWithoutWrapping));
  assert(diagnostics.fonts.body.length > 0);

  const text = await extractPdfText(pdfPath);
  assert.match(text, /echo\s+ok/);
  assert.doesNotMatch(text, /\$\s*echo\s+ok/);
  assert.doesNotMatch(text, /tags:\s*\[test\]/);
  // GitHub's macOS runner image ships without a usable PingFang SC font
  // (stripped with the system font assets), so Chrome selects the font by
  // name but renders no glyphs: body text is invisible and unextractable
  // there. Real macOS installs are unaffected, so only skip on CI.
  if (!(process.platform === 'darwin' && process.env.CI)) {
    assert.match(text, /Permission warning/);
    assert.match(text, /Keep the minimum permission/);
    assert.match(text, /Page\s+1\s*\/\s*\d+/);
    const footer = (await extractFirstPageItems(pdfPath)).find((item) => item.str.includes('Page 1 /'));
    assert(footer && footer.height >= 5, `footer text is visually clipped (height: ${footer?.height})`);
  }
});

test('fails clearly when a referenced local image is missing', (context) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'markdown-to-pdf-missing-'));
  context.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));
  const markdownPath = path.join(tempDir, 'missing.md');
  fs.writeFileSync(markdownPath, '# Missing\n\n![missing](./not-found.png)\n');
  const result = runConverter(markdownPath, path.join(tempDir, 'missing.pdf'));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Local image not found/);
});
