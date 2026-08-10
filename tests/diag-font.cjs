'use strict';

// Temporary diagnostic: reproduce the macOS CI text-extraction failure and
// test which fonts survive. Deleted after diagnosis.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { createRequire } = require('node:module');
const { createHash } = require('node:crypto');

const skillPath = path.join(__dirname, '..', 'markdown-to-pdf');
const skillRequire = createRequire(path.join(skillPath, 'package.json'));
const converter = path.join(skillPath, 'scripts/markdown_to_pdf.cjs');

const FIXTURE = `---\ntags: [test]\n---\n# 中文 Fixture\n\n> [!warning] Permission warning\n> Keep the minimum permission.\n\n\`\`\`sh\necho ok\n┌────────────┐\n│ COMMAND    │\n└────────────┘\n\`\`\`\n`;

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

function runConverter(font, browser, tempDir) {
  const markdownPath = path.join(tempDir, 'fixture.md');
  const pdfPath = path.join(tempDir, `out-${font || 'default'}${browser ? '-browser' : ''}.pdf`);
  fs.writeFileSync(markdownPath, FIXTURE);
  const args = [converter, markdownPath, pdfPath];
  if (font) args.push('--font', font);
  if (browser) args.push('--browser', browser);
  const result = spawnSync(process.execPath, args, { cwd: tempDir, encoding: 'utf8' });
  const line = result.stdout?.split('\n').find((item) => item.startsWith('DIAGNOSTICS_JSON='));
  return { pdfPath, result, diagnostics: line ? JSON.parse(line.slice('DIAGNOSTICS_JSON='.length)) : null };
}

function fontFingerprint() {
  console.log('--- pingfang search ---');
  const candidates = [
    '/System/Library/Fonts',
    '/System/Library/Fonts/Private',
    '/Library/Fonts',
    '/System/Library/AssetsV2/com_apple_MobileAsset_Font8',
  ];
  for (const dir of candidates) {
    if (!fs.existsSync(dir)) continue;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      const assetData = entry.isDirectory() && dir.includes('AssetsV2')
        ? path.join(full, 'AssetData')
        : '';
      const target = assetData && fs.existsSync(assetData) ? assetData : full;
      if (!fs.statSync(target).isDirectory()) continue;
      for (const inner of fs.readdirSync(target)) {
        if (!/pingfang/i.test(inner)) continue;
        const file = path.join(target, inner);
        if (fs.statSync(file).isDirectory()) { console.log(`fontdir ${file}`); continue; }
        const stat = fs.statSync(file);
        const sha = createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 16);
        console.log(`fontfile ${file} size=${stat.size} sha=${sha}`);
      }
    }
  }
  console.log('--- fingerprints ---');
  const files = [
    '/System/Library/Fonts/Hiragino Sans GB.ttc',
    '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
    '/System/Library/Fonts/Menlo.ttc',
  ];
  for (const file of files) {
    if (!fs.existsSync(file)) { console.log(`fontfile MISSING: ${file}`); continue; }
    const stat = fs.statSync(file);
    const sha = createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 16);
    console.log(`fontfile ${path.basename(file)} size=${stat.size} sha=${sha}`);
  }
}

async function visibilityCheck(pdfPath, tempDir) {
  // Render page 1 to PNG with sips, then count dark pixels in the heading band.
  const pngPath = path.join(tempDir, 'page1.png');
  const sips = spawnSync('/usr/bin/sips', ['-s', 'format', 'png', pdfPath, '--out', pngPath], { encoding: 'utf8' });
  if (sips.status !== 0 || !fs.existsSync(pngPath)) {
    console.log(`   visibility: sips failed (${sips.stderr.trim().slice(0, 120)})`);
    return;
  }
  const sharp = require(path.join(skillPath, 'node_modules/sharp'));
  const { data, info } = await sharp(pngPath).flatten({ background: '#ffffff' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  // Heading sits in the top ~15% of the page; count dark pixels there.
  const bandHeight = Math.floor(info.height * 0.15);
  let dark = 0;
  for (let y = 0; y < bandHeight; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const offset = (y * info.width + x) * 3;
      if (data[offset] < 120 && data[offset + 1] < 140 && data[offset + 2] < 160) dark += 1;
    }
  }
  console.log(`   visibility: ${dark} dark pixels in heading band (${info.width}x${info.height})`);
}

async function main() {
  console.log(`os: ${os.platform()} ${os.release()}`);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'md2pdf-diag-'));
  fontFingerprint();

  for (const chrome of ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']) {
    const v = spawnSync(chrome, ['--version'], { encoding: 'utf8' });
    console.log(`${chrome} -> ${v.stdout.trim() || v.stderr.trim()}`);
  }

  const candidates = ['', 'Hiragino Sans GB', 'Arial Unicode MS'];
  for (const font of candidates) {
    const { pdfPath, result, diagnostics } = runConverter(font, '', tempDir);
    if (result.status !== 0) { console.log(`font=${font || 'default'} CONVERT_FAILED: ${(result.stderr || '').slice(0, 200)}`); continue; }
    const text = await extractPdfText(pdfPath);
    const flat = text.replace(/\s+/g, ' ');
    const checks = {
      heading: flat.includes('中文 Fixture'),
      callout: flat.includes('Warning') && flat.includes('Permission'),
      footer: /Page\s+1\s*\/\s*\d+/.test(text),
      code: flat.includes('echo ok'),
    };
    const glyphs = diagnostics.fonts.body.map((f) => `${f.familyName}(${f.postScriptName}):${f.glyphCount}`).join(', ');
    console.log(`font=${font || 'default'} -> heading:${checks.heading} callout:${checks.callout} footer:${checks.footer} code:${checks.code} | bodyGlyphs: ${glyphs}`);
    console.log(`   extracted: ${JSON.stringify(text.slice(0, 220))}`);
    await visibilityCheck(pdfPath, tempDir);
  }

  // Playwright-managed Chromium (CFT 151) with the default font stack.
  let pwChromium = '';
  try {
    pwChromium = skillRequire('playwright').chromium.executablePath();
  } catch { /* playwright not installed */ }
  if (fs.existsSync(pwChromium)) {
    const { pdfPath, result, diagnostics } = runConverter('', pwChromium, tempDir);
    if (result.status !== 0) { console.log(`playwright-chromium CONVERT_FAILED: ${(result.stderr || '').slice(0, 200)}`); }
    else {
      const text = await extractPdfText(pdfPath);
      const flat = text.replace(/\s+/g, ' ');
      console.log(`playwright-chromium(${pwChromium}) -> heading:${flat.includes('中文 Fixture')} callout:${flat.includes('Permission')} footer:${/Page\s+1\s*\/\s*\d+/.test(text)} code:${flat.includes('echo ok')} | browser: ${diagnostics.browser}`);
    }
  }
  fs.rmSync(tempDir, { recursive: true, force: true });
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
