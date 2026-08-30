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

Paste into the workbench console after any change to the lettering, the modifiers or `fitScale`. It fires every sound at every intensity across six widths, forces each animation to its end state, and compares the painted box against the panel. Animations are throttled in a background tab, which is why it finishes them explicitly rather than waiting.

```js
const m = await import('./comic-sfx.js?v=' + Date.now());
const game = document.getElementById('game'), dev = document.getElementById('device');
document.getElementById('deviceWrap').style.transform = 'scale(1)';
const sfx = new m.ComicSFX(game), out = []; let n = 0;
const settle = r => { for (const el of [r, ...r.querySelectorAll('*')])
  for (const a of el.getAnimations()) { try { a.finish(); } catch { a.currentTime = 200; } } };
const box = r => { let L=1e9,T=1e9,R=-1e9,B=-1e9;
  for (const el of r.querySelectorAll('*')) { const b = el.getBoundingClientRect();
    if (!b.width || !b.height) continue;
    L=Math.min(L,b.left); T=Math.min(T,b.top); R=Math.max(R,b.right); B=Math.max(B,b.bottom); }
  return {L,T,R,B}; };
for (const [w,h] of [[320,568],[375,720],[414,896],[768,900],[1280,720],[1600,900]]) {
  dev.style.width = w+'px'; dev.style.height = h+'px';
  await new Promise(r => setTimeout(r, 30));
  const g = game.getBoundingClientRect();
  for (const rec of m.CATALOG) {
    if (rec.motion === 'sweep') continue;               // designed to leave the frame
    for (const level of ['LIGHT','MEDIUM','HEAVY']) {
      const hit = sfx.fire(rec, { level }); settle(hit.element);
      const u = box(hit.element); n++;
      const over = Math.max(0,g.left-u.L) + Math.max(0,u.R-g.right)
                 + Math.max(0,g.top-u.T) + Math.max(0,u.B-g.bottom);
      if (over > 2) out.push(`${w}px ${level} ${rec.word} by ${Math.round(over)}px`);
      hit.remove();
    }
  }
}
console.log(out.length ? 'OVERFLOW: ' + out.join(' | ') : `clean — ${n} cases`);
```

## Fitting

Effects are measured after layout and scaled down if they would overrun the reading area, so nothing clips at any width. Anything that already fits keeps its exact specified size — desktop output is unchanged.

The measurement is the union of the glyph's painted rectangles, taken with the mount's transform cleared and *before* the entrance animation is attached. Both of those matter: each treatment transforms itself, and with `animation-fill-mode: both` an unstarted entrance is already showing its first keyframe, which for `slam` is `scale(2.7)`. The fit then allows for the tilt, `breathe` growth, and the fixed pixel displacement of `shake`, `split` and `vibe`.

If you add a modifier that moves or grows the finished glyph, add it to `fitScale` or it will push the effect back over the edge. There is a coverage check for this in the verification section below.
