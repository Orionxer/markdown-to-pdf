#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { calloutExtension, preprocessMarkdown } = require('./lib/markdown.cjs');
const { findSystemBrowser, fontStack, monospaceStack } = require('./lib/runtime.cjs');

function usage() {
  console.log(`Usage: node scripts/markdown_to_pdf.cjs INPUT.md [OUTPUT.pdf] [options]

Options:
  --title TEXT       PDF title (defaults to first H1 or input filename)
  --font FAMILY      Preferred body font; CJK-capable fallbacks remain enabled
  --browser PATH     Chrome, Edge, or Chromium executable
  --help             Show this help`);
}

function parseArgs(argv) {
  const positional = [];
  const options = { font: '', title: '', browser: '' };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') return { help: true };
    if (['--title', '--font', '--browser'].includes(arg)) {
      if (!argv[index + 1]) throw new Error(`${arg} requires a value`);
      options[arg.slice(2)] = argv[++index];
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      positional.push(arg);
    }
  }
  if (!positional[0]) throw new Error('INPUT.md is required');
  return { input: positional[0], output: positional[1], ...options };
}

function loadDependencies() {
  try {
    return {
      marked: require('marked').marked,
      chromium: require('playwright').chromium,
      sharp: (() => { try { return require('sharp'); } catch { return null; } })(),
    };
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      throw new Error(`Runtime dependencies are missing. Run npm install in ${path.resolve(__dirname, '..')}.`);
    }
    throw error;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function cssFontList(fonts) {
  return fonts.map((font) => /^(?:sans-serif|serif|monospace)$/.test(font)
    ? font
    : `"${font.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`).join(',');
}

async function embedLocalImages(markdown, sourceDir, sharp) {
  const pattern = /!\[([^\]]*)\]\((?:<([^>]+)>|([^\s)]+))(?:\s+["'][^"']*["'])?\)/g;
  const replacements = [];
  for (const match of markdown.matchAll(pattern)) {
    const target = match[2] || match[3];
    if (/^(?:https?:|data:)/i.test(target)) {
      replacements.push(match[0]);
      continue;
    }
    const imagePath = path.resolve(sourceDir, decodeURIComponent(target));
    if (!fs.existsSync(imagePath)) throw new Error(`Local image not found: ${imagePath}`);
    const extension = path.extname(imagePath).toLowerCase();
    let data = await fsp.readFile(imagePath);
    let mime = {
      '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
      '.gif': 'image/gif', '.svg': 'image/svg+xml', '.bmp': 'image/bmp', '.tif': 'image/tiff', '.tiff': 'image/tiff',
    }[extension] || 'application/octet-stream';
    if (sharp && ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tif', '.tiff'].includes(extension)) {
      data = await sharp(data)
        .resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true })
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 91, chromaSubsampling: '4:4:4', mozjpeg: true })
        .toBuffer();
      mime = 'image/jpeg';
    }
    replacements.push(`![${match[1]}](data:${mime};base64,${data.toString('base64')})`);
  }
  let index = 0;
  return markdown.replace(pattern, () => replacements[index++]);
}

function stylesheet(bodyFonts, codeFonts) {
  const body = cssFontList(bodyFonts);
  const code = cssFontList(codeFonts);
  return `
    @page { size:A4; margin:19mm 19mm 18mm; }
    * { box-sizing:border-box; }
    html { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    body { width:172mm; max-width:100%; margin:0; font-family:${body}; font-size:10.2pt; line-height:1.68; color:#273444; overflow-wrap:break-word; }
    h1,h2,h3,h4,h5,h6 { font-family:${body}; break-after:avoid-page; color:#174a78; }
    h1 { margin:0 0 11pt; font-size:23pt; line-height:1.35; font-weight:600; }
    h2 { margin:16pt 0 7pt; font-size:16pt; line-height:1.42; font-weight:600; }
    h3 { margin:11pt 0 5pt; font-size:12.5pt; line-height:1.5; color:#2e638e; font-weight:600; }
    h4 { margin:8pt 0 4pt; font-size:11pt; color:#40566e; font-weight:600; }
    p { margin:0 0 7pt; } strong { font-weight:600; }
    a { color:#0969c3; text-decoration:underline; text-underline-offset:1px; }
    ul,ol { margin:0 0 8pt; padding-left:21pt; } li { margin:1.5pt 0; }
    table { width:100%; margin:4pt 0 10pt; border-collapse:collapse; break-inside:avoid-page; font-size:8.5pt; line-height:1.5; }
    th,td { border:.45pt solid #afc4d6; padding:5pt 7pt; vertical-align:middle; }
    th { background:#2e6c9e; color:white; text-align:left; font-weight:600; }
    tbody tr:nth-child(odd) { background:#f5f8fb; } tbody tr:nth-child(even) { background:#eaf1f7; }
    blockquote { margin:4pt 0 10pt; padding:7pt 9pt; border-left:3pt solid #4c8dbd; background:#edf4fa; color:#40566e; break-inside:avoid-page; }
    blockquote p:last-child { margin-bottom:0; }
    .callout { margin:4pt 0 10pt; padding:7pt 9pt; border-left:3pt solid; border-radius:0 3pt 3pt 0; break-inside:avoid-page; }
    .callout-title { margin:0 0 3pt; font-weight:600; }
    .callout > *:last-child { margin-bottom:0; }
    .callout-note { background:#eef6fc; border-color:#5b9bd5; } .callout-note .callout-title { color:#2c6aa0; }
    .callout-abstract { background:#ecf9f7; border-color:#43b3a9; } .callout-abstract .callout-title { color:#23857c; }
    .callout-info { background:#eaf4fc; border-color:#4f9bd9; } .callout-info .callout-title { color:#2b6f9f; }
    .callout-todo { background:#eef6fc; border-color:#5b9bd5; } .callout-todo .callout-title { color:#2c6aa0; }
    .callout-tip { background:#ecf9ee; border-color:#52a85b; } .callout-tip .callout-title { color:#2f7d38; }
    .callout-success { background:#e9f8ee; border-color:#3fa45a; } .callout-success .callout-title { color:#247a40; }
    .callout-question { background:#f1eefc; border-color:#8b7fd4; } .callout-question .callout-title { color:#5b4faf; }
    .callout-warning { background:#fff7e0; border-color:#e2a43b; } .callout-warning .callout-title { color:#a2690a; }
    .callout-failure { background:#fdf0f0; border-color:#d9685c; } .callout-failure .callout-title { color:#a13d32; }
    .callout-danger { background:#fdeeee; border-color:#dd6b5c; } .callout-danger .callout-title { color:#a83226; }
    .callout-bug { background:#fdeef3; border-color:#d95f8e; } .callout-bug .callout-title { color:#a92d5e; }
    .callout-example { background:#f5eefb; border-color:#a06fd5; } .callout-example .callout-title { color:#7434a8; }
    .callout-quote { background:#f5f7f8; border-color:#8b9aa6; } .callout-quote .callout-title { color:#5c6b77; }
    code { font-family:${code}; font-size:.88em; color:#a13a1b; }
    pre { margin:3pt 0 11pt; padding:10pt 12pt; border:.8pt solid #314152; border-radius:3pt; background:#17212b; color:#e6edf3; break-inside:avoid-page; white-space:pre; overflow:hidden; overflow-wrap:normal; word-break:normal; }
    pre code { display:block; width:max-content; min-width:100%; color:#e6edf3; font-family:${code}; font-size:8.8pt; line-height:1.55; }
    img { max-width:100%; height:auto; }
    figure { width:100%; margin:5pt 0 10pt; text-align:center; break-inside:avoid-page; }
    figure img { display:block; width:auto; height:auto; max-width:100%; max-height:118mm; margin:0 auto; object-fit:contain; }
    figcaption { margin-top:3pt; color:#6b7c93; font-size:8pt; line-height:1.35; }
  `;
}

async function platformFonts(cdp, documentNode, selector) {
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: documentNode.nodeId, selector });
  if (!nodeId) return [];
  const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
  return fonts;
}

async function launchBrowser(chromium, explicitPath) {
  const systemBrowser = findSystemBrowser({ explicitPath });
  try {
    return {
      browser: await chromium.launch({ headless: true, ...(systemBrowser ? { executablePath: systemBrowser } : {}) }),
      executablePath: systemBrowser || 'playwright-managed-chromium',
    };
  } catch (error) {
    throw new Error(`Chrome/Chromium could not be launched. Install Chrome, set CHROME_PATH, pass --browser PATH, or run npx playwright install chromium.\n${error.message}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return usage();

  const input = path.resolve(args.input);
  if (!fs.existsSync(input)) throw new Error(`Input does not exist: ${input}`);
  const output = path.resolve(args.output || path.join(process.cwd(), 'output_pdf', `${path.parse(input).name}.pdf`));
  await fsp.mkdir(path.dirname(output), { recursive: true });

  const { marked, chromium, sharp } = loadDependencies();
  const bodyFonts = fontStack(process.platform, args.font);
  const codeFonts = monospaceStack(process.platform);
  let markdown = preprocessMarkdown(await fsp.readFile(input, 'utf8'));
  const firstHeading = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const title = args.title || firstHeading || path.parse(input).name;
  markdown = await embedLocalImages(markdown, path.dirname(input), sharp);
  marked.setOptions({ gfm: true, breaks: false });
  marked.use({ extensions: [calloutExtension] });
  const content = await marked.parse(markdown);
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${stylesheet(bodyFonts, codeFonts)}</style></head><body>${content}</body></html>`;

  const launched = await launchBrowser(chromium, args.browser);
  const { browser } = launched;
  try {
    const page = await browser.newPage({ viewport: { width: 1240, height: 1754 } });
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(async () => {
      for (const paragraph of [...document.querySelectorAll('p')]) {
        const images = [...paragraph.querySelectorAll(':scope > img')];
        if (!images.length) continue;
        const fragment = document.createDocumentFragment();
        let textParagraph = document.createElement('p');
        const flushText = () => {
          const hasContent = [...textParagraph.childNodes].some((node) =>
            node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE && node.textContent.trim());
          if (hasContent) fragment.append(textParagraph);
          textParagraph = document.createElement('p');
        };
        for (const node of [...paragraph.childNodes]) {
          if (node.nodeType !== Node.ELEMENT_NODE || node.nodeName !== 'IMG') {
            textParagraph.append(node);
            continue;
          }
          flushText();
          const figure = document.createElement('figure');
          const caption = document.createElement('figcaption');
          caption.textContent = node.alt || '';
          figure.append(node, caption);
          fragment.append(figure);
        }
        flushText();
        paragraph.replaceWith(fragment);
      }
      await Promise.all([...document.images].map((image) => image.complete
        ? Promise.resolve()
        : new Promise((resolve) => { image.onload = image.onerror = resolve; })));
      await document.fonts.ready;
      for (const code of document.querySelectorAll('pre > code')) {
        const pre = code.parentElement;
        const style = getComputedStyle(pre);
        const availableWidth = pre.clientWidth - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight);
        const baseFontSize = Number.parseFloat(getComputedStyle(code).fontSize);
        if (code.scrollWidth > availableWidth) {
          code.style.fontSize = `${baseFontSize * availableWidth / code.scrollWidth * 0.985}px`;
        }
      }
    });

    const failedImages = await page.evaluate(() => [...document.images]
      .filter((image) => !image.naturalWidth).map((image) => image.src.slice(0, 160)));
    if (failedImages.length) throw new Error(`Images failed to load: ${failedImages.join(', ')}`);

    const imageLayouts = await page.evaluate(() => [...document.images].map((image, index) => {
      const rect = image.getBoundingClientRect();
      const figure = image.closest('figure');
      const containerRect = figure?.getBoundingClientRect();
      const naturalAspect = image.naturalWidth / image.naturalHeight;
      const renderedAspect = rect.width / rect.height;
      return {
        index,
        alt: image.alt || '',
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        renderedWidth: Math.round(rect.width * 100) / 100,
        renderedHeight: Math.round(rect.height * 100) / 100,
        aspectError: Math.abs(renderedAspect / naturalAspect - 1),
        wrappedInFigure: Boolean(figure),
        withinContainer: Boolean(containerRect) && rect.width <= containerRect.width + 0.5
          && rect.left >= containerRect.left - 0.5 && rect.right <= containerRect.right + 0.5,
        objectFit: getComputedStyle(image).objectFit,
      };
    }));
    const invalidImages = imageLayouts.filter((item) => !item.wrappedInFigure
      || !item.withinContainer || item.objectFit !== 'contain' || item.aspectError > 0.01);
    if (invalidImages.length) throw new Error(`Images may be clipped or distorted: ${JSON.stringify(invalidImages)}`);

    const codeLayouts = await page.evaluate(() => [...document.querySelectorAll('pre > code')].map((code, index) => {
      const pre = code.parentElement;
      const style = getComputedStyle(pre);
      const availableWidth = pre.clientWidth - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight);
      return {
        index,
        lineCount: code.textContent.split('\n').length - (code.textContent.endsWith('\n') ? 1 : 0),
        fontSize: Number.parseFloat(getComputedStyle(code).fontSize),
        contentWidth: code.scrollWidth,
        availableWidth,
        whiteSpace: getComputedStyle(pre).whiteSpace,
        fitsWithoutWrapping: code.scrollWidth <= availableWidth + 1,
      };
    }));
    const invalidCode = codeLayouts.filter((item) => item.whiteSpace !== 'pre' || !item.fitsWithoutWrapping);
    if (invalidCode.length) throw new Error(`Code blocks may wrap or be clipped: ${JSON.stringify(invalidCode)}`);

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    const { root: documentNode } = await cdp.send('DOM.getDocument');
    const fonts = {
      body: await platformFonts(cdp, documentNode, 'body'),
      heading: await platformFonts(cdp, documentNode, 'h1'),
      code: await platformFonts(cdp, documentNode, 'pre code'),
    };
    if (args.font && !fonts.body.some((item) => item.familyName === args.font)) {
      throw new Error(`${args.font} was requested but the browser did not select it. Install the font or choose another --font.`);
    }

    const footerTitle = escapeHtml(title.length > 36 ? `${title.slice(0, 36)}…` : title);
    await page.pdf({
      path: output,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `<div style='width:100%;margin:0 19mm;padding-top:4px;border-top:.5px solid #d9e2ec;color:#7b8da4;font-family:${cssFontList(bodyFonts)};font-size:7px;display:flex;justify-content:space-between'><span>${footerTitle}</span><span>Page <span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
    });

    console.log(output);
    console.log(`DIAGNOSTICS_JSON=${JSON.stringify({
      output,
      browser: launched.executablePath,
      bodyFontStack: bodyFonts,
      codeFontStack: codeFonts,
      failedImages,
      imageLayouts,
      codeLayouts,
      fonts,
    })}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
