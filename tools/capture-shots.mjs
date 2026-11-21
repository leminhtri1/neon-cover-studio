// Drives headless Chrome over the DevTools protocol (Node 22's global WebSocket, no packages) to take the
// maker's screenshots: it serves app/ with serve.ts, opens screenshot scenes, clicks the app's own Export PNG
// button and keeps the PNG the app downloaded, screenshots the editor, and scales covers down to JPEGs that
// fit the gate's limits (long side <= 1280, <= 256 KiB) with Chrome's own canvas.
//
//   node tools/capture-shots.mjs export "<query>" out/cover.png
//   node tools/capture-shots.mjs editor "<query>" out/editor.jpg [width height]
//   node tools/capture-shots.mjs shrink out/cover.png screenshots/1-cover.jpg 1280 720

import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, readdirSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const APP_PORT = 8100 + Math.floor(Math.random() * 200);
const DEBUG_PORT = 9300 + Math.floor(Math.random() * 600);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(check, timeout = 30000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    try {
      const value = await check();
      if (value) return value;
    } catch { /* not yet */ }
    await sleep(150);
  }
  throw new Error('timed out');
}

function connect(url) {
  const ws = new WebSocket(url);
  let nextId = 1;
  const pending = new Map();
  const listeners = [];
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve: ok, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : ok(msg.result);
    } else if (msg.method) listeners.forEach((fn) => fn(msg));
  });
  return new Promise((ready) => ws.addEventListener('open', () => ready({
    send: (method, params = {}) => new Promise((ok, reject) => {
      const id = nextId++;
      pending.set(id, { resolve: ok, reject });
      ws.send(JSON.stringify({ id, method, params }));
    }),
    on: (fn) => listeners.push(fn),
    close: () => ws.close(),
  })));
}

export async function withBrowser(width, height, task) {
  const server = spawn(process.execPath, ['serve.ts', '--port', String(APP_PORT)], { stdio: 'ignore' });
  const profile = join(tmpdir(), `ncs-chrome-${Date.now()}`);
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--hide-scrollbars', '--force-device-scale-factor=1', `--window-size=${width},${height}`, 'about:blank'],
  { stdio: 'ignore' });
  try {
    const version = await waitFor(async () => (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).json());
    const browser = await connect(version.webSocketDebuggerUrl);
    const target = await waitFor(async () => (await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json()).find((t) => t.type === 'page'));
    const page = await connect(target.webSocketDebuggerUrl);
    await page.send('Page.enable');
    await page.send('Runtime.enable');
    await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    page.on((msg) => {
      if (msg.method === 'Runtime.consoleAPICalled') console.log('[page]', msg.params.args.map((a) => a.value ?? a.description).join(' '));
      if (msg.method === 'Runtime.exceptionThrown') console.log('[page error]', JSON.stringify(msg.params.exceptionDetails).slice(0, 600));
    });
    const evaluate = async (expression) => (await page.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result.value;
    const open = async (query) => {
      await waitFor(async () => (await fetch(`http://127.0.0.1:${APP_PORT}/`)).ok);
      await page.send('Page.navigate', { url: `http://127.0.0.1:${APP_PORT}/${query}` });
      await waitFor(() => evaluate('window.__studioReady === true'));
      await sleep(600);
    };
    return await task({ browser, page, evaluate, open });
  } finally {
    chrome.kill();
    server.kill();
    await sleep(500);
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* chrome may still hold it */ }
  }
}

async function exportCover(query, outPath) {
  const downloads = resolve(join(tmpdir(), `ncs-dl-${Date.now()}`));
  mkdirSync(downloads, { recursive: true });
  await withBrowser(1600, 1000, async ({ browser, evaluate, open }) => {
    await browser.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads, eventsEnabled: true });
    let done = false;
    browser.on((msg) => { if (msg.method === 'Browser.downloadProgress' && msg.params.state === 'completed') done = true; });
    await open(query);
    const started = Date.now();
    await evaluate("document.getElementById('export-png').click()");
    await waitFor(() => done, 60000);
    console.log(`export took ${Date.now() - started} ms`);
  });
  const file = readdirSync(downloads).find((f) => f.endsWith('.png'));
  mkdirSync(resolve(outPath, '..'), { recursive: true });
  copyFileSync(join(downloads, file), outPath);
  console.log(`saved ${file} -> ${outPath}`);
}

async function captureEditor(query, outPath, width = 1280, height = 800) {
  await withBrowser(width, height, async ({ page, open }) => {
    await open(query);
    await sleep(800);
    const shot = await page.send('Page.captureScreenshot', { format: outPath.endsWith('.png') ? 'png' : 'jpeg', quality: 88 });
    writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
    console.log(`editor -> ${outPath} (${Buffer.from(shot.data, 'base64').length} bytes)`);
  });
}

async function shrinkImage(inPath, outPath, width, height) {
  const dataUrl = `data:image/png;base64,${readFileSync(inPath).toString('base64')}`;
  await withBrowser(800, 600, async ({ evaluate, open }) => {
    await open('');
    const result = await evaluate(`(async () => {
      const img = new Image();
      img.src = ${JSON.stringify(dataUrl)};
      await img.decode();
      const c = document.createElement('canvas');
      c.width = ${width}; c.height = ${height};
      const ctx = c.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, ${width}, ${height});
      for (let q = 0.92; q > 0.4; q -= 0.03) {
        const url = c.toDataURL('image/jpeg', q);
        if ((url.length - 23) * 0.75 < 255000) return url;
      }
      return c.toDataURL('image/jpeg', 0.4);
    })()`);
    const bytes = Buffer.from(result.split(',')[1], 'base64');
    writeFileSync(outPath, bytes);
    console.log(`shrunk -> ${outPath} ${width}x${height} (${bytes.length} bytes)`);
  });
}

const runAsCli = Boolean(process.argv[1]) && process.argv[1].replace(/\\/g, '/').endsWith('capture-shots.mjs');
const [command, a, b, c, d] = runAsCli ? process.argv.slice(2) : [];
if (command === 'export') await exportCover(a, b);
else if (command === 'editor') await captureEditor(a, b, c ? Number(c) : undefined, d ? Number(d) : undefined);
else if (command === 'shrink') await shrinkImage(a, b, Number(c), Number(d));
else if (runAsCli) console.log("usage: export|editor|shrink ...");
if (runAsCli) process.exit(0);
