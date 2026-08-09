'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { browserCandidates, fontStack } = require('../convert-markdown-to-pdf/scripts/lib/runtime.cjs');

test('explicit browser and CHROME_PATH have highest priority', () => {
  const candidates = browserCandidates({
    explicitPath: '/custom/chrome',
    platform: 'linux',
    env: { CHROME_PATH: '/env/chrome' },
    homedir: '/home/test',
  });
  assert.deepEqual(candidates.slice(0, 2), ['/custom/chrome', '/env/chrome']);
});

test('font stacks are CJK-aware on every supported platform', () => {
  assert.equal(fontStack('darwin')[0], 'PingFang SC');
  assert.equal(fontStack('win32')[0], 'Microsoft YaHei');
  assert.equal(fontStack('linux')[0], 'Noto Sans CJK SC');
});

test('explicit font is prepended without discarding fallbacks', () => {
  const fonts = fontStack('linux', 'Source Han Sans SC');
  assert.equal(fonts[0], 'Source Han Sans SC');
  assert(fonts.includes('Noto Sans CJK SC'));
  assert.equal(fonts.at(-1), 'sans-serif');
});
