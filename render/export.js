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
 * LINE's animated sticker rules, from creator.line.me — a pack is 8, 16 or 24
 * stickers up to 320x270 with one side at least 270, plus one main image and
 * one chat thumbnail. APNG, 5-20 frames, at most 4 seconds, under 1MB,
 * transparent, RGB. The thumbnail is a still PNG, and LINE adds the little
 * play symbol to it itself.
 */
const TARGETS = {
  line: {
    maxMs: 4000,
    renders: [
      { scope: 'each',  w: 320, h: 270, animated: true },
      { scope: 'cover', w: 240, h: 240, animated: true,  file: 'main.png', label: 'main image' },
      { scope: 'cover', w:  96, h:  74, animated: false, file: 'tab.png',  label: 'chat thumbnail' }
    ]
  },

  /* Pop-up stickers are a separate LINE product: the chat shows a still, and
     a second image plays across the whole chat screen. That full-screen frame
     is what the dim and halftone wash were designed for, so these render with
     env on and at HEAVY — the intensity that owns the viewport.
     Their rules are tighter than animated stickers: 3 seconds rather than 4,
     1-3 loops, and one side must be exactly 480. */
  'line-popup': {
    maxMs: 3000,
    renders: [
      { scope: 'each',  w: 370, h: 320, animated: false, suffix: '' },
      { scope: 'each',  w: 480, h: 480, animated: true,  suffix: '_popup',
        env: true, level: 'HEAVY' },
      { scope: 'cover', w: 240, h: 240, animated: false, file: 'main.png', label: 'main image' },
      { scope: 'cover', w: 480, h: 480, animated: true,  file: 'main_popup.png',
        label: 'pop-up main', env: true, level: 'HEAVY' },
      { scope: 'cover', w:  96, h:  74, animated: false, file: 'tab.png', label: 'chat thumbnail' }
    ]
  }
};

for (const t of Object.values(TARGETS)) {
  t.minFrames = 5; t.maxFrames = 20; t.maxBytes = 1024 * 1024;
}

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

/* Mount one effect at a given size and report its timeline. `start` is the
   first frame where the word is actually opaque — every entrance begins fully
   transparent, and LINE shows frame one as the still image in its store. */
async function setup(page, rec, style, seed, w, h, env) {
  return page.evaluate(async (rec, style, seed, W, H, env) => {
    const mod = await import('/comic-sfx.js');
    const stage = document.getElementById('stage');
    stage.style.width = W + 'px';
    stage.style.height = H + 'px';
    stage.innerHTML = '';
    window.__sfx = new mod.ComicSFX(stage, { env: !!env, seed, style });
    const hit = window.__sfx.fire(rec, {});

    /* Wall-clock time keeps running while we step the animation by hand, and
       each frame costs a screenshot round-trip. The runtime's own cleanup
       timers would therefore tear the effect down mid-capture and leave the
       tail of the sequence blank. During export we own the timeline. */
    window.__sfx.timers.forEach(clearTimeout);
    window.__sfx.timers.length = 0;

    const anims = [];
    for (const el of [hit.element, ...hit.element.querySelectorAll('*')])
      for (const a of el.getAnimations()) anims.push(a);
    window.__anims = anims;
    window.__hit = hit;

    const isExit = (a) => { const n = a.animationName || ''; return n === 'omSnap' || n === 'omDrift'; };
    const dur = anims.reduce((m, a) => {
      if (isExit(a)) return m;
      const t = a.effect && a.effect.getTiming();
      const d = t ? (t.delay || 0) + (typeof t.duration === 'number' ? t.duration : 0) : 0;
      return Math.max(m, d);
    }, 0);

    /* Effective opacity has to be read up the chain — it lives on the
       animated wrapper, so a child reports 1 while being invisible. */
    const opacityAt = (t) => {
      for (const a of anims) a.currentTime = isExit(a) ? 0 : t;
      let best = 0;
      for (const el of hit.element.querySelectorAll('*')) {
        const b = el.getBoundingClientRect();
        if (!b.width || !b.height) continue;
        let op = 1, p = el;
        while (p && p !== hit.element.parentElement) { op *= +getComputedStyle(p).opacity; p = p.parentElement; }
        if (op > best) best = op;
      }
      return best;
    };

    /* The first frame where the lettering is actually opaque. Every entrance
       begins fully transparent, and the store shows frame one as the still. */
    let start = 0;
    for (let t = 0; t <= dur; t += Math.max(4, dur / 60)) {
      if (opacityAt(t) >= 0.85) { start = t; break; }
    }

    /* A staggered word arrives in beats, so that moment only covers its first
       part — the store image would show one HA landed and the rest in flight.
       Every part runs the same entrance, so the whole cluster is formed one
       full stagger later. */
    if (rec.stagger) {
      const parts = (rec.stagger.parts || String(rec.word || '').split(' ')).length;
      const step = rec.stagger.step != null ? rec.stagger.step : 170;
      start = Math.min(dur, start + step * (parts - 1));
    }

    return { dur, start };
  }, rec, style, seed, w, h, env);
}

const seek = (page, t) => page.evaluate((t) => {
  for (const a of window.__anims) {
    const n = a.animationName || '';
    a.currentTime = (n === 'omSnap' || n === 'omDrift') ? 0 : t;
  }
}, t);

/* APNG stores its loop count in the acTL chunk, and UPNG always writes 0,
   which means loop forever. LINE requires 1-4. Patch the field in place and
   fix the chunk CRC — re-encoding just to change one integer would be silly. */
function crc32(buf) {
  let c, crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c = (crc ^ buf[i]) & 0xFF;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    crc = c ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function setLoops(buf, loops) {
  const at = buf.indexOf(Buffer.from('acTL'));
  if (at < 0) return buf;
  buf.writeUInt32BE(loops, at + 8);                       // num_plays follows num_frames
  buf.writeUInt32BE(crc32(buf.slice(at, at + 12)), at + 12);
  return buf;
}

/* Lossless first; quantise only as far as the size limit demands. */
function encodeAPNG(pngs, w, h, delays, maxBytes) {
  const rgba = pngs.map(buf => UPNG.toRGBA8(UPNG.decode(buf))[0]);
  let out = null, colours = 0;
  for (const c of [0, 256, 192, 128, 96, 64]) {
    out = Buffer.from(UPNG.encode(rgba, w, h, c, delays));
    colours = c;
    if (out.length <= maxBytes) break;
  }
  return { buf: out, colours: colours === 0 ? 'lossless' : colours };
}

async function main() {
  const args = process.argv.slice(2);
  const arg = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : args[i + 1]; };
  const targetName = arg('target', 'line');
  const T = TARGETS[targetName];
  if (!T) throw new Error('Unknown target: ' + targetName);
  const outDir = path.resolve(process.cwd(), arg('out', '../out/' + targetName));
  const packPath = arg('pack', '../sticker-pack.js');
  const style = arg('style', 'pop');
  const seed = arg('seed', 'pack1');
  const mainWord = arg('main', null);

  const pack = (await import(pathToFileURL(path.resolve(process.cwd(), packPath)).href)).PACK_1;
  const cover = mainWord ? pack.find(r => r.word.startsWith(mainWord)) : pack[0];
  if (!cover) throw new Error('No pack entry matching --main ' + mainWord);
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
    await page.setViewport({ width: 560, height: 560, deviceScaleFactor: 1 });
    await page.goto(base + '/render/frame.html', { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);

    const slug = (rec) => rec.word.replace(/[^A-Za-z0-9]/g, '') || 'sticker';
    const jobs = [];
    for (const spec of T.renders) {
      const recs = spec.scope === 'each' ? pack : [cover];
      for (const rec of recs) {
        jobs.push({
          rec, spec,
          label: spec.label || (rec.word + (spec.suffix === '_popup' ? ' pop-up' : '')),
          file: spec.file || slug(rec) + (spec.suffix || '') + '.png'
        });
      }
    }

    for (const job of jobs) {
      const { spec } = job;
      /* A still only ever shows the resting frame, but the fit reserves
         headroom for the entrance overshoot. Rendering stills under a motion
         that does not overshoot reclaims that room — at 96px wide it is the
         difference between an icon and a speck. The resting frame is
         identical either way. */
      const rec = Object.assign({}, job.rec,
        spec.animated ? null : { motion: 'buzz' },
        spec.level ? { level: spec.level } : null);

      const plan = await setup(page, rec, style, seed, spec.w, spec.h, !!spec.env);
      const stage = await page.$('#stage');

      if (!spec.animated) {
        await seek(page, plan.dur);
        const png = await stage.screenshot({ omitBackground: true, type: 'png' });
        fs.writeFileSync(path.join(outDir, job.file), png);
        results.push({
          label: job.label, file: job.file, size: spec.w + '×' + spec.h,
          frames: 1, ms: 0, kb: Math.round(png.length / 1024), colours: 'still',
          ok: png.length <= T.maxBytes
        });
        continue;
      }

      const hold = Math.max(200, Math.min(T.maxMs - plan.dur - 300, 900));
      const times = framePlan(plan.dur, hold, T.maxFrames).filter(t => t >= plan.start);
      if (times[0] !== plan.start) times.unshift(plan.start);

      const pngs = [];
      for (const t of times) { await seek(page, t); pngs.push(await stage.screenshot({ omitBackground: true, type: 'png' })); }

      const delays = times.map((t, i) =>
        Math.max(20, Math.round(i < times.length - 1 ? times[i + 1] - t : 260)));

      /* LINE will only accept a playback time of a whole number of seconds.
         Round up and give the remainder to the final frame, which is the
         static hold — stretching that reads as the word resting a moment
         longer, whereas scaling every delay would distort the motion. */
      const natural = delays.reduce((a, b) => a + b, 0);
      const total = Math.min(T.maxMs, Math.max(1000, Math.ceil(natural / 1000) * 1000));
      delays[delays.length - 1] += total - natural;

      const loops = Math.max(1, Math.min(4, Math.floor(T.maxMs / total)));
      const enc = encodeAPNG(pngs, spec.w, spec.h, delays, T.maxBytes);
      setLoops(enc.buf, loops);

      fs.writeFileSync(path.join(outDir, job.file), enc.buf);
      results.push({
        label: job.label, file: job.file, size: spec.w + '×' + spec.h,
        frames: times.length, ms: total, loops: loops,
        kb: Math.round(enc.buf.length / 1024), colours: enc.colours,
        ok: enc.buf.length <= T.maxBytes && times.length >= T.minFrames
            && times.length <= T.maxFrames && total <= T.maxMs
      });
    }
  } finally {
    await browser.close();
    server.close();
  }

  /* A contact sheet of what was actually written, so the output can be
     checked as files rather than trusted from a table. */
  const cells = results.map(r =>
    '<figure><figcaption>' + r.label + ' · ' + r.size + ' · ' + r.kb + 'KB</figcaption>' +
    '<div class="on dark"><img src="' + r.file + '" alt="' + r.label + '"></div>' +
    '<div class="on light"><img src="' + r.file + '" alt=""></div></figure>').join('\n');
  fs.writeFileSync(path.join(outDir, 'preview.html'),
`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>Exported pack — the real files</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
 body{margin:0;background:#141416;color:#CFC9BF;font-family:'IBM Plex Mono',monospace;padding:24px}
 h1{font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#9A9388;margin:0 0 4px}
 p{font-size:12px;color:#8A8378;margin:0 0 20px}
 .grid{display:flex;flex-wrap:wrap;gap:18px}
 figure{margin:0;display:flex;flex-direction:column;gap:5px}
 figcaption{font-size:11px;color:#9A9388}
 .on{display:grid;place-items:center;padding:10px}
 .on.dark{background:#1F2733}
 .on.light{background:#DDE6EF}
 img{display:block}
</style></head><body>
<h1>Exported pack, playing</h1>
<p>The actual files in this folder, each on a dark and a light chat background.</p>
<div class="grid">
${cells}
</div></body></html>`);

  const pad = (s, n) => String(s).padEnd(n);
  console.log('\n' + pad('', 16) + pad('file', 12) + pad('size', 10) + pad('frames', 8) +
              pad('length', 9) + pad('loops', 7) + pad('weight', 9) + pad('colours', 10) + 'within limits');
  for (const r of results) {
    console.log(pad(r.label, 16) + pad(r.file, 12) + pad(r.size, 10) + pad(r.frames, 8) +
                pad(r.ms ? (r.ms/1000) + 's' : '—', 9) + pad(r.loops || '—', 7) + pad(r.kb + 'KB', 9) +
                pad(r.colours, 10) + (r.ok ? 'yes' : 'NO'));
  }
  const bad = results.filter(r => !r.ok);
  const stickers = results.filter(r => !r.file.startsWith('main') && r.file !== 'tab.png' && !r.file.includes('_popup')).length;
  console.log('\n' + stickers + ' stickers + main image + thumbnail written to ' + outDir);
  if (![8, 16, 24].includes(stickers)) {
    console.warn('LINE packs must be 8, 16 or 24 stickers — this pack has ' + stickers + '.');
  }
  if (bad.length) { console.error(bad.length + ' outside limits'); process.exit(1); }
}

main().catch(e => { console.error(e); process.exit(1); });
