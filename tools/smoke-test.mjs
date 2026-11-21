// Smoke test of the editor in headless Chrome: import a photo through the file input, select a panel and drag it,
// wheel-zoom it, switch layout, preset and size, type a caption, and export. Prints PASS/FAIL per step.
//   node tools/smoke-test.mjs

import { resolve } from 'node:path';
import { withBrowser } from './capture-shots.mjs';

const results = [];
const expect = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await withBrowser(1280, 800, async ({ page, evaluate, open }) => {
  await open('');
  expect('opens with samples', (await evaluate('window.__studio.photoLibrary.length')) === 4);

  const doc = await page.send('DOM.getDocument');
  const input = await page.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#photo-input' });
  await page.send('DOM.setFileInputFiles', { nodeId: input.nodeId, files: [resolve('app/samples/pier.jpg')] });
  await sleep(800);
  expect('file input adds a photo', (await evaluate('window.__studio.photoLibrary.length')) === 5);
  expect('one photo fills all panels', await evaluate('window.__studio.coverDoc.panels.every((p) => p.photo === 4)'));

  const box = await evaluate(`(() => { const r = document.getElementById('overlay-canvas').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; })()`);
  const [left, top, width, height] = box;
  const x = left + width * 0.12;
  const y = top + height * 0.2;
  const before = await evaluate('JSON.stringify(window.__studio.coverDoc.panels[0])');
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  for (let i = 1; i <= 5; i++) await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x + i * 12, y: y + i * 8, button: 'left', buttons: 1 });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x + 60, y: y + 40, button: 'left', clickCount: 1 });
  await sleep(300);
  const selected = await evaluate('window.__studio.selectedPanel');
  const afterDrag = await evaluate(`JSON.stringify(window.__studio.coverDoc.panels[${selected}])`);
  expect('drag selects and pans a panel', afterDrag !== before, `panel ${selected + 1}: ${afterDrag}`);

  await page.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY: -400 });
  await sleep(300);
  const zoom = await evaluate(`window.__studio.coverDoc.panels[${selected}].zoom`);
  expect('wheel zooms the panel', zoom > 1.2, `zoom ${zoom.toFixed(2)}`);

  await evaluate(`document.querySelector('[data-layout="trio"]').click()`);
  await evaluate(`document.querySelector('[data-preset="neon-night"]').click()`);
  await evaluate(`document.querySelector('[data-size="1080x1350"]').click()`);
  await evaluate(`(() => { const c = document.getElementById('text-caption'); c.value = 'Test Drive'; c.dispatchEvent(new Event('input')); })()`);
  await sleep(500);
  const state = await evaluate('JSON.stringify([window.__studio.coverDoc.layoutId, window.__studio.coverDoc.presetId, window.__studio.coverDoc.width, window.__studio.coverDoc.height, window.__studio.coverDoc.caption])');
  expect('layout, preset, size and caption apply', state === '["trio","neon-night",1080,1350,"Test Drive"]', state);
  const canvasSize = await evaluate(`(() => { const c = document.getElementById('cover-canvas'); return c.width / c.height; })()`);
  expect('preview takes the portrait aspect', Math.abs(canvasSize - 0.8) < 0.01, canvasSize.toFixed(3));

  await evaluate(`document.getElementById('export-png').click()`);
  await sleep(2500);
  const exported = await evaluate('window.__lastExport');
  expect('export writes a PNG', exported === 'neon-cover-1080x1350.png', exported);
});

console.log(results.every(Boolean) ? 'ALL PASS' : 'SOME FAILED');
process.exit(results.every(Boolean) ? 0 : 1);
