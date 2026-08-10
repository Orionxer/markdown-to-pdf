'use strict';

// Temporary diagnostic: reproduce the macOS CI text-extraction failure and
// test which fonts survive. Deleted after diagnosis.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { createRequire } = require('node:module');

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
  return { pdfPath, result: spawnSync(process.execPath, args, { cwd: tempDir, encoding: 'utf8' }) };
}

async function main() {
  console.log(`os: ${os.platform()} ${os.release()}`);
  for (const chrome of [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ]) {
    if (fs.existsSync(chrome)) {
      const v = spawnSync(chrome, ['--version'], { encoding: 'utf8' });
      console.log(`${chrome} -> ${v.stdout.trim() || v.stderr.trim()}`);
    }
  }
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'md2pdf-diag-'));
  const candidates = ['', 'Hiragino Sans GB', 'Songti SC', 'STHeiti', 'Arial Unicode MS', 'Menlo'];
  for (const font of candidates) {
    const { pdfPath, result } = runConverter(font, '', tempDir);
    const statusOk = result.status === 0;
    if (!statusOk) {
      console.log(`font=${font || 'default'} CONVERT_FAILED: ${(result.stderr || '').slice(0, 200)}`);
      continue;
    }
    const text = await extractPdfText(pdfPath);
    const checks = {
      heading: text.includes('中文 Fixture'),
      callout: text.includes('Warning') && text.includes('Permission'),
      footer: /Page\s+1\s*\/\s*\d+/.test(text),
      code: text.includes('echo ok'),
    };
    console.log(`font=${font || 'default'} -> heading:${checks.heading} callout:${checks.callout} footer:${checks.footer} code:${checks.code}`);
    if (!checks.heading || !checks.callout || !checks.footer) {
      console.log(`   extracted text: ${JSON.stringify(text.slice(0, 200))}`);
    }
  }

  // Playwright-managed Chromium, if present, with the default font stack.
  const cacheRoot = path.join(os.homedir(), 'Library/Caches/ms-playwright');
  if (fs.existsSync(cacheRoot)) {
    const pwChromium = (fs.readdirSync(cacheRoot)
      .map((name) => path.join(cacheRoot, name, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'))
      .find(fs.existsSync)) || '';
    if (pwChromium) {
      const { pdfPath, result } = runConverter('', pwChromium, tempDir);
      if (result.status !== 0) {
        console.log(`playwright-chromium CONVERT_FAILED: ${(result.stderr || '').slice(0, 200)}`);
      } else {
        const text = await extractPdfText(pdfPath);
        console.log(`playwright-chromium -> heading:${text.includes('中文 Fixture')} callout:${text.includes('Permission')} footer:${/Page\s+1\s*\/\s*\d+/.test(text)} code:${text.includes('echo ok')}`);
      }
    }
  }
  fs.rmSync(tempDir, { recursive: true, force: true });
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
