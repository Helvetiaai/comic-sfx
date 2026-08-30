#!/usr/bin/env node
/* export.js — renders comic-sfx effects to animated files.
 *
 *   node export.js --target line --out ../out/line
 *
 * Why a browser: the effects are DOM text and CSS keyframes, so the only
 * thing that can draw them correctly is the thing that was going to draw
 * them anyway. Nothing is reimplemented.
 *
 * Why this is exact rather than a screen recording: CSS animations are
 * seekable. Each frame is produced by setting currentTime and taking a
 * screenshot, so output does not depend on the machine keeping up, and two
 * runs of the same sticker are identical — provided a seed is set, which is
 * what makes the rotation deterministic.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import UPNG from 'upng-js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

/* ── output targets ───────────────────────────────────────────────────────
 * A target is data: the store's limits, not a branch in the code.
 * LINE's animated sticker rules, from creator.line.me: APNG, up to 320x270
 * with one side at least 270, 5-20 frames, at most 4 seconds, under 1MB,
 * transparent, RGB. The first frame is what the store shows as the still
 * image, which is why we do not start sampling from an invisible frame.
 */
const TARGETS = {
  line: {
    w: 320, h: 270,
    minFrames: 5, maxFrames: 20,
    maxMs: 4000, maxBytes: 1024 * 1024,
    format: 'apng'
  }
};

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml'
};

function serve(root) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]);
    const file = path.join(root, rel === '/' ? '/index.html' : rel);
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (err, buf) => {
      if (err) { res.writeHead(404).end('not found'); return; }
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
      res.end(buf);
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'
  ].filter(Boolean);
  for (const c of candidates) if (fs.existsSync(c)) return c;
  throw new Error('No Chrome found. Set CHROME_PATH to your browser executable.');
}

/* ── frame plan ───────────────────────────────────────────────────────────
 * The motion is front-loaded and the hold barely moves, so frames are spent
 * on the entrance and the hold gets a few long ones. APNG carries a delay per
 * frame, which is what makes twenty frames enough for something that lands in
 * a third of a second.
 */
function framePlan(dur, hold, cap) {
  const nEnter = Math.min(cap - 4, 13);
  const nHold = Math.min(cap - nEnter, 5);
  const times = [];
  for (let i = 0; i < nEnter; i++) times.push((dur * i) / (nEnter - 1));
  for (let i = 1; i <= nHold; i++) times.push(dur + (hold * i) / nHold);
  return times;
}

async function main() {
  const args = process.argv.slice(2);
  const arg = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : args[i + 1]; };
  const targetName = arg('target', 'line');
  const target = TARGETS[targetName];
  if (!target) throw new Error('Unknown target: ' + targetName);
  const outDir = path.resolve(process.cwd(), arg('out', '../out/' + targetName));
  const packPath = arg('pack', '../sticker-pack.js');
  const style = arg('style', 'pop');
  const seed = arg('seed', 'pack1');

  const pack = (await import(pathToFileURL(path.resolve(process.cwd(), packPath)).href)).PACK_1;
  fs.mkdirSync(outDir, { recursive: true });

  const server = await serve(ROOT);
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    args: ['--force-color-profile=srgb', '--disable-lcd-text', '--font-render-hinting=none']
  });

  const results = [];
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: target.w, height: target.h, deviceScaleFactor: 1 });
    await page.goto(base + '/render/frame.html', { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);

    for (const rec of pack) {
      const stage = await page.$('#stage');

      /* Set up one effect and report the timeline. The first sampled frame is
         the first one where the word is actually opaque: LINE shows frame one
         as the still image in the store, and the true t=0 of every entrance
         is fully transparent. */
      const plan = await page.evaluate(async (rec, style, seed, W, H) => {
        const mod = await import('/comic-sfx.js');
        const stage = document.getElementById('stage');
        stage.style.width = W + 'px';
        stage.style.height = H + 'px';
        stage.innerHTML = '';
        window.__sfx = new mod.ComicSFX(stage, { env: false, seed, style });
        const hit = window.__sfx.fire(rec, {});
        window.__hit = hit;

        const anims = [];
        for (const el of [hit.element, ...hit.element.querySelectorAll('*')])
          for (const a of el.getAnimations()) anims.push(a);
        window.__anims = anims;

        const dur = anims.reduce((m, a) => {
          const t = a.effect && a.effect.getTiming();
          const d = t ? (t.delay || 0) + (typeof t.duration === 'number' ? t.duration : 0) : 0;
          const name = a.animationName || '';
          return (name === 'omSnap' || name === 'omDrift') ? m : Math.max(m, d);
        }, 0);

        // effective opacity has to be read up the chain: it lives on the
        // animated wrapper, so a child reports 1 while being invisible
        const opacityAt = (t) => {
          for (const a of anims) {
            const name = a.animationName || '';
            a.currentTime = (name === 'omSnap' || name === 'omDrift') ? 0 : t;
          }
          let worst = 0;
          for (const el of hit.element.querySelectorAll('*')) {
            const b = el.getBoundingClientRect();
            if (!b.width || !b.height) continue;
            let op = 1, n = el;
            while (n && n !== hit.element.parentElement) { op *= +getComputedStyle(n).opacity; n = n.parentElement; }
            if (op > worst) worst = op;
          }
          return worst;
        };
        let start = 0;
        for (let t = 0; t <= dur; t += Math.max(4, dur / 40)) {
          if (opacityAt(t) >= 0.85) { start = t; break; }
        }
        return { dur, start };
      }, rec, style, seed, target.w, target.h);

      const hold = Math.max(200, Math.min(target.maxMs - plan.dur, 900));
      const times = framePlan(plan.dur, hold, target.maxFrames)
        .filter(t => t >= plan.start);
      if (times[0] !== plan.start) times.unshift(plan.start);

      const frames = [];
      for (const t of times) {
        await page.evaluate((t) => {
          for (const a of window.__anims) {
            const name = a.animationName || '';
            a.currentTime = (name === 'omSnap' || name === 'omDrift') ? 0 : t;
          }
        }, t);
        const png = await stage.screenshot({ omitBackground: true, type: 'png' });
        frames.push(png);
      }

      // per-frame delays, from the gaps between the sampled times
      const delays = times.map((t, i) =>
        Math.max(20, Math.round((i < times.length - 1 ? times[i + 1] - t : 260))));
      const total = delays.reduce((a, b) => a + b, 0);

      const rgba = frames.map(buf => {
        const img = UPNG.decode(buf);
        return UPNG.toRGBA8(img)[0];
      });

      // lossless first; quantise only as far as the size limit demands
      let out = null, colours = 0;
      for (const c of [0, 256, 192, 128, 96, 64]) {
        out = Buffer.from(UPNG.encode(rgba, target.w, target.h, c, delays));
        colours = c;
        if (out.length <= target.maxBytes) break;
      }

      const name = rec.word.replace(/[^A-Za-z0-9]/g, '') || 'sticker';
      const file = path.join(outDir, name + '.png');
      fs.writeFileSync(file, out);
      results.push({
        word: rec.word, file: path.basename(file), frames: times.length,
        ms: total, kb: Math.round(out.length / 1024),
        colours: colours === 0 ? 'lossless' : colours,
        ok: out.length <= target.maxBytes && times.length >= target.minFrames
            && times.length <= target.maxFrames && total <= target.maxMs
      });
    }
  } finally {
    await browser.close();
    server.close();
  }

  const pad = (s, n) => String(s).padEnd(n);
  console.log('\n' + pad('word', 12) + pad('frames', 8) + pad('length', 9) + pad('size', 9) + pad('colours', 10) + 'within limits');
  for (const r of results) {
    console.log(pad(r.word, 12) + pad(r.frames, 8) + pad(r.ms + 'ms', 9) +
                pad(r.kb + 'KB', 9) + pad(r.colours, 10) + (r.ok ? 'yes' : 'NO'));
  }
  const bad = results.filter(r => !r.ok);
  console.log('\n' + results.length + ' written to ' + outDir);
  if (bad.length) { console.error(bad.length + ' outside limits'); process.exit(1); }
}

main().catch(e => { console.error(e); process.exit(1); });
