# Working in this repository

Notes for coding agents. Humans should read [README.md](README.md) first; this file only covers what is not obvious from it.

## What this is

A dependency-free library that renders comic-book sound effects — BLAM!, KABOOM!, SKREEECH! — over the reading area of a text game, using real DOM text plus CSS keyframes. Plus a browser workbench for designing the catalog.

**No build step, no dependencies, no tests, no framework.** Do not add any of these without being asked. `npm install` is not required to work on this repo.

## Layout

| Path | What it is |
|---|---|
| `comic-sfx.js` | the library — `CATALOG`, `COLORS`, timing constants, `renderGlyph()`, `ComicSFX` |
| `comic-sfx.css` | all 19 `@keyframes`. The complete stylesheet; everything else is set inline by the JS |
| `index.html` | the workbench. A *consumer* of the library — it imports, never copies |
| `demo.html` | minimal example |
| `DESIGN.md` | the design spec. Final values, not suggestions |
| `design/prototype.dc.html` | design history. Never copy from it — it carries three keyframes (`omSlide`, `omCaret`, `omLines`) that never shipped |

## The three concepts

Everything composes from these, and they are orthogonal:

- **Treatment** (`dir`) — how the word is drawn: `INK`, `BURST`, `SHRED`
- **Motion** — how it arrives: one `@keyframes` block per motion, listed in the `MOTIONS` table
- **Intensity** (`level`) — how much of the interface it may disrupt: `LIGHT`, `MEDIUM`, `HEAVY`

Intensity is a *disruption* contract, not a size setting. LIGHT must not move anything else on screen. HEAVY owns the viewport. Changing what a level is allowed to do is a design change, not an implementation detail — check `DESIGN.md` before touching it.

## Common tasks

**Add a sound** — one object appended to `CATALOG` in `comic-sfx.js`. Nothing else. Words must be unique; the lookup is keyed by `word`.

**Add a motion** — one `@keyframes` block in `comic-sfx.css` and one line in `MOTIONS` in `comic-sfx.js`, in the form `[keyframeName, multiplierOnENTER, easing, fixedDurationOrNull]`. Then add its plain-language strings to `MOTION_NAME`, `MOTION_SHORT`, `MOTION_DESC` and `MOTION_PHRASE` in `index.html`, or the workbench will show it unlabelled. Entrance keyframes start at `opacity: 0` and end on the resting state, and are always used with `animation-fill-mode: both`.

**Change lettering** — the three `*Glyph()` functions in `comic-sfx.js`. All sizes derive from the effect's font size; there is no spacing scale.

## Rules

1. **Never duplicate the engine.** The workbench previously inlined its own copy of the catalog and keyframes and it drifted. `index.html` imports from `./comic-sfx.js` and links `./comic-sfx.css`. Keep it that way.
2. **Keep the reduced-motion path.** `prefers-reduced-motion: reduce` collapses every entrance to a 90ms pop and drops the shake, wash, `vibe` and `breathe`, while keeping the hold and exit. Several motions are high-amplitude; this is not optional.
3. **Track every timer** on `this.timers` so `destroy()` can clear it.
4. **The keyframes and the `CATALOG` shape are the design.** Restructure the code freely; do not quietly retune durations, easings or colours.
5. **No new runtime dependencies.** That constraint is the point of the library.

## Verifying a change

There is no test suite. Run the workbench and look:

```bash
npx serve .
```

Then, at minimum: fire a HEAVY sound (BLAM!) and confirm the screen shake, halftone wash and dim overlay; fire KRAK! for `split`; fire WHOOSH! for a `sweep`, which has no hold or exit; switch the preview to Phone and back. Check the browser console is clean.

To confirm the library still parses and exports what it should:

```bash
node -e "import('./comic-sfx.js').then(m => console.log(Object.keys(m).join(', ')))"
```

Expected: `CATALOG, COLORS, ComicSFX, ENTER, HOLD, MOTIONS, MOTION_LABEL, SIZE, renderGlyph`.

### Overflow coverage

Paste into the workbench console after any change to the lettering, the modifiers or `fitScale`. Three things about it are load-bearing, and each one hid a real bug during development:

- **It seeks animations explicitly.** They are throttled in a background tab, so an unstarted entrance sits on its first keyframe and you measure `scale(2.7)` instead of the resting size.
- **It samples through the entrance, not only at rest.** Clipping on arrival is the failure people actually see.
- **It resolves opacity and blur up the ancestor chain.** Both live on the animated wrapper, so a child reports `opacity: 1` while invisible, and invisible frames must not count as clipping.

It also drives the preview at two scales, because comparing a `getBoundingClientRect` measurement against `clientWidth` breaks silently wherever an ancestor is scaled.

```js
const m = await import('./comic-sfx.js?v=' + Date.now());
await document.fonts.ready;
const game = document.getElementById('game'), dev = document.getElementById('device');
const wrap = document.getElementById('deviceWrap');
const eff = (el, root) => { let op = 1, bl = 0, n = el;
  while (n && n !== root.parentElement) { const cs = getComputedStyle(n);
    op *= +cs.opacity;
    const b = /blur\(([\d.]+)px\)/.exec(cs.filter || ''); if (b) bl = Math.max(bl, +b[1]);
    n = n.parentElement; }
  return { op, bl }; };
const worst = (root, g) => { let bad = 0;
  for (const f of [0,.05,.1,.15,.2,.25,.3,.34,.42,.5,.6,.7,.85,1]) {
    for (const el of [root, ...root.querySelectorAll('*')])
      for (const a of el.getAnimations()) {
        const d = (a.effect && a.effect.getTiming().duration) || 0;
        if (d && isFinite(d)) a.currentTime = d * f; }
    let L=1e9, T=1e9, R=-1e9, B=-1e9;
    for (const el of root.querySelectorAll('*')) { const b = el.getBoundingClientRect();
      if (!b.width || !b.height) continue;
      const e = eff(el, root); if (e.op < 0.6 || e.bl > 3) continue;   // not yet legible
      L=Math.min(L,b.left); T=Math.min(T,b.top); R=Math.max(R,b.right); B=Math.max(B,b.bottom); }
    if (R < -1e8) continue;
    bad = Math.max(bad, Math.max(0,g.left-L) + Math.max(0,R-g.right)
                      + Math.max(0,g.top-T) + Math.max(0,B-g.bottom)); }
  return bad; };
const sfx = new m.ComicSFX(game), out = []; let n = 0;
for (const [w, h] of [[320,568],[375,720],[414,896],[768,900],[1280,720],[1600,900]])
  for (const sc of [1, 0.6]) {
    dev.style.width = w+'px'; dev.style.height = h+'px'; wrap.style.transform = 'scale('+sc+')';
    await new Promise(r => setTimeout(r, 30));
    const g = game.getBoundingClientRect();
    for (const rec of m.CATALOG) {
      if (rec.motion === 'sweep') continue;          // designed to leave the frame
      for (const level of ['LIGHT','MEDIUM','HEAVY']) {
        const hit = sfx.fire(rec, { level }); n++;
        const o = worst(hit.element, g) / sc;
        if (o > 2) out.push(`${w}px@${sc} ${level} ${rec.word} ${Math.round(o)}px`);
        hit.remove(); } } }
console.log(out.length ? 'OVERFLOW: ' + out.join(' | ') : `clean — ${n} cases`);
```

Expected: `clean — 432 cases`.

## Fitting

Effects are measured after layout and scaled down if they would overrun the reading area, so nothing clips at any width. Anything that already fits keeps its exact specified size — desktop output is unchanged.

The standard is that nothing *legible* is clipped at any frame, not merely that the resting size fits. Four things the obvious implementation misses:

1. **Measure the container the same way you measure the glyph.** `getBoundingClientRect` honours ancestor transforms and `clientWidth` does not; mixing them breaks the fit wherever anything is scaled, which is exactly what a device preview does.
2. **Measure with the mount transform cleared and before the entrance is attached.** With `animation-fill-mode: both`, an unstarted `slam` already reports `scale(2.7)`.
3. **Add the paint no geometry API reports.** The stroke and hard drop shadow fall outside the layout box and are worth about 29% of the font size.
4. **Allow for the entrance overshoot** through the `PEAK` table, plus tilt, `breathe` growth, and the fixed pixel displacement of `shake`, `split` and `vibe`.

`PEAK` holds the scale at which each motion becomes *legible*, not its raw maximum. `slam` opens at 2.7 but at zero opacity behind a 10px blur, so fitting its true peak would shrink explosions to nothing for an overshoot nobody sees; `crack` is opaque by 5% while still near 1.4, which is why it clipped.

If you add a modifier that moves or grows the finished glyph, add it to `fitScale` or it will push the effect back over the edge. There is a coverage check for this in the verification section below.
