'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function browserCandidates({
  explicitPath = '',
  platform = process.platform,
  env = process.env,
  homedir = os.homedir(),
} = {}) {
  const common = [explicitPath, env.CHROME_PATH];
  const platformPaths = {
    darwin: [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ],
    linux: [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/microsoft-edge',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium',
    ],
    win32: [
      env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'),
      env.PROGRAMFILES && path.join(env.PROGRAMFILES, 'Google/Chrome/Application/chrome.exe'),
      env['PROGRAMFILES(X86)'] && path.join(env['PROGRAMFILES(X86)'], 'Microsoft/Edge/Application/msedge.exe'),
      path.join(homedir, 'AppData/Local/Chromium/Application/chrome.exe'),
    ],
  }[platform] || [];
  return [...new Set([...common, ...platformPaths].filter(Boolean))];
}

function findSystemBrowser(options = {}) {
  return browserCandidates(options).find((candidate) => fs.existsSync(candidate)) || '';
}

function fontStack(platform = process.platform, explicitFont = '') {
  const platformFonts = {
    darwin: ['PingFang SC', 'Hiragino Sans GB', 'Noto Sans CJK SC'],
    win32: ['Microsoft YaHei', 'Noto Sans CJK SC', 'SimSun'],
    linux: ['Noto Sans CJK SC', 'Noto Sans SC', 'Source Han Sans SC', 'WenQuanYi Micro Hei'],
  }[platform] || ['Noto Sans CJK SC', 'Noto Sans SC'];
  return [...new Set([explicitFont, ...platformFonts, 'sans-serif'].filter(Boolean))];
}

function monospaceStack(platform = process.platform) {
  const platformFonts = {
    darwin: ['Menlo', 'SFMono-Regular'],
    win32: ['Consolas', 'Cascadia Mono'],
    linux: ['DejaVu Sans Mono', 'Noto Sans Mono CJK SC'],
  }[platform] || [];
  return [...platformFonts, 'monospace'];
}

module.exports = { browserCandidates, findSystemBrowser, fontStack, monospaceStack };
