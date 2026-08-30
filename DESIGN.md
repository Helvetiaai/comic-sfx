# Design specification

> This is the original design handoff, kept as the reference for *why* the
> system looks and behaves the way it does — every colour, duration and easing
> below is a final value, not a suggestion. For installation and API, see
> [README.md](README.md).

## Overview

A lightweight system for rendering comic-book sound effects — **BLAM!**, **THUD!**, **KABOOM!**, **CLICK.**, **SKREEECH!**, **BZZZT!** — over the reading area of a text-based game. It gives key moments physical, expressive punctuation when the player has audio off.

Visual reference: vintage printed comics and pulp covers, used as violent punctuation inside a grounded contemporary crime world. Restrained most of the time; sudden bursts of graphic excess on the beats that earn it. Not superhero comics, not clean retro nostalgia.

Everything is **real text in the DOM plus CSS keyframes**. No canvas, no SVG animation, no particle system, no runtime dependency. Effects are selectable, translatable, and reachable by a screen reader.

## About the design files

`comic-sfx.js` and `comic-sfx.css` began as a prototype of the intended look and behaviour, and have since become the shipping library. They are framework-free and drop in unchanged; there is no need to rebuild the system inside a host codebase, though you can wrap it in a component if that suits your conventions better.

The two things that are load-bearing are the **keyframes** in `comic-sfx.css` and the **CATALOG** data structure. Those are the design — everything else is delivery.

## Fidelity

**High-fidelity.** Colors, typefaces, sizes, durations and easings below are final values taken from the working prototype. Reproduce them exactly. The one thing left open is the game's own chrome — the prototype's mock game screen is placeholder framing, not a spec.

## Architecture

Three concepts, and they compose:

| Concept | What it decides | How many |
|---|---|---|
| **Treatment** (`dir`) | how the word is drawn | 3 — INK, BURST, SHRED |
| **Motion** | how the word arrives and behaves | 10 — one `@keyframes` block each |
| **Intensity** (`level`) | how much of the interface it is allowed to disrupt | 3 — LIGHT, MEDIUM, HEAVY |

A single `CATALOG` array maps each word to its treatment, motion, natural intensity, and a handful of modifier flags. **Adding a sound is one object in that array.** Adding a motion is one `@keyframes` block plus one line in the `MOTIONS` table.

### Treatments

**INK** — pure lettering, no framing shape. Passion One 900, bone-white fill, black outline at 5.5% of font size, one flat red drop shadow at 0.09em offset with a second black shadow at double that, sheared `skewX(-8deg)`. Survives at small sizes; the default for anything quiet.

**BURST** — the word sits inside a 28-point jagged `clip-path` burst. Two plates: teal offset down-right by ~17–20% of the inner font size, red on top. Rubik Mono One inside, bone fill, black outline. The loudest treatment.

**SHRED** — manga speed lettering. Anton at `scaleY(1.35)`, `skewX(-14deg)`, with a red ghost copy offset behind it by 20% of font size horizontally and 6% vertically. Built for motion words, not impacts.

### Intensity contract

This is the part that matters most: **intensity governs how much the effect is allowed to disrupt the interface**, not just how big it is.

| | Base size | Enter | Hold | Placement | Disruption |
|---|---|---|---|---|---|
| **LIGHT** | 38px | 220ms | 500ms | anchored to the line that caused it, `translate(-50%,-100%)` | none — composition does not move |
| **MEDIUM** | 104px | 300ms | 820ms | centred at 52%/46% of the panel, tilted | prose behind dims to `rgba(11,10,9,.62)` |
| **HEAVY** | 168px | 440ms | 1100ms | fills the panel, centred | screen shake + halftone wash; nothing else legible |

Each catalog entry multiplies base size by `size` and hold by `hold`. Rotation is randomised per fire: ±3° at HEAVY, −9° to +5° otherwise.

Budget guidance for the writers: HEAVY two or three times per chapter at most. It stops meaning anything if it is common.

### Motions

| Motion | Keyframe | Duration | Easing | Character |
|---|---|---|---|---|
| `crack` | `omCrack` | 0.72 × enter | `cubic-bezier(.15,.9,.25,1)` | starts at scale 1.4, already full size. A bang has no anticipation. |
| `slam` | `omSlam` | 1.0 × enter | `cubic-bezier(.2,.9,.25,1)` | scale 2.7 + 10px blur, drops to 0.88, settles |
| `drop` | `omDrop` | 1.35 × enter | `cubic-bezier(.3,.7,.3,1)` | falls from −70%, squashes to `scale(1.14,.8)`, settles |
| `sweep` | `omSweep` | 2.1 × enter | `cubic-bezier(.35,.05,.65,.95)` | −165% to +165%. Never stops, has no hold or exit. |
| `stretch` | `omStretch` | 1.1 × enter | `cubic-bezier(.15,.9,.2,1)` | `scaleX` .22 → 1.24 → 1 |
| `squeeze` | `omSqueeze` | 1.3 × enter | `cubic-bezier(.2,1.2,.35,1)` | `scale(1.3,.66)` → `scale(.9,1.16)` → 1 |
| `tick` | `omTick` | 150ms fixed | `cubic-bezier(.2,1.5,.4,1)` | small precise pop |
| `buzz` | `omBuzz` | 260ms fixed | `steps(6)` | stepped jitter, opacity flickers |
| `muffle` | `omMuffle` | 1.4 × enter | `cubic-bezier(.25,.8,.3,1)` | rises 18px, tops out at 0.7 opacity |
| `pop` | `omPop` | 1.0 × enter | `cubic-bezier(.18,1.7,.4,1)` | fallback overshoot |

### Modifier flags

Applied as wrapper elements around the entrance, outermost last:

- `breathe` — `omBreathe` over `enter + hold`, scale 1 → 1.07. Explosions keep expanding while they hold.
- `vibe` — `omVibe 90ms steps(2) infinite`. Trembles for as long as it is on screen.
- `shake` — `omShake`, 240ms for `'hard'` / 180ms for `'med'`, `steps(5)`, delayed by 45% of the entrance.
- `split` — the finished glyph is rendered three times: one hidden copy holding the layout, plus two absolutely positioned copies clipped along a ragged horizontal tear, animated apart by `omSplitA` / `omSplitB` (300ms, 70ms delay). Works on any treatment — KRAK! uses it over BURST, so the burst plate tears with the lettering.
- `flat` — single black drop shadow instead of the red/black double.
- `tint` — overrides the bone fill.
- `faint` — 70% opacity.

### Exits

- **SNAP** (default) — `omSnap 60ms steps(1)`, gone in one frame.
- **DRIFT** — `omDrift 260ms ease-in`, fades and rises 22px.

Both are scheduled with `animation-delay: enter + hold`. `sweep` has neither; the exit is built into the motion.

### Environment effects

- **Dim** — a `rgba(11,10,9,.62)` overlay under the lettering, fading in over 140ms whenever any MEDIUM or HEAVY effect is live. Reference-counted, so overlapping effects don't flicker it.
- **Wash** — HEAVY only. `radial-gradient(circle at 1.5px 1.5px, #E8482C 1.5px, transparent 1.8px)` on a 7px grid, animated by `omWash` (520ms, peaks at 0.85 opacity 8% in). A halftone blowout.
- **Screen shake** — HEAVY + `shake: 'hard'` only. `omStage 420ms cubic-bezier(.36,.07,.19,.97)` applied to the *game text element*, not the panel frame. Retrigger by clearing `animation`, reading `offsetWidth`, then reassigning.

## The catalog

| Word | Treatment | Motion | Intensity | Use |
|---|---|---|---|---|
| BLAM! | INK | crack | Heavy | Gunshot in a closed room. Arrives already at full size. |
| POW! | BURST | slam | Medium | A punch that lands. Shakes off the contact. |
| THUD! | INK | drop | Medium | Body or bag hitting a floor. Grey (`#CFC7BA`), not red. |
| KRAK! | BURST | crack | Heavy | Bone, glass, a chair leg. Tears along the middle. |
| SHTOK! | INK | tick | Light | Short and wet. Gone before you finish reading it. |
| BOOM! | BURST | slam | Heavy | Keeps growing while it holds. Expansion, not impact. |
| KABOOM! | BURST | slam | Heavy | Fire, gas, a car. The rare one. |
| WHOOSH! | SHRED | sweep | Light | Enters left, exits right. A swing that misses. |
| SKREEECH! | SHRED | stretch | Medium | Tyres, brakes, dragged metal. Left vibrating. |
| SPRRT! | SHRED | sweep | Light | Same pass-through, small and fast. |
| NNNGH! | SHRED | squeeze | Medium | Effort, not impact. |
| CLICK. | INK | tick | Light | Safety catch, lock, receiver going down. No red. |
| BZZZT! | INK | buzz | Light | Teal. Phone on metal, strip light, gate buzzer. |
| THUMP… | INK | muffle | Light | Something heavy, elsewhere in the building. |

Punctuation is part of the word and is deliberate: `CLICK.` is a full stop, `THUMP…` an ellipsis, everything else an exclamation. BURST strips punctuation before rendering (the shape supplies the emphasis).

## API

```js
import { ComicSFX, CATALOG } from './comic-sfx.js';

const sfx = new ComicSFX(readingAreaEl, {
  shakeTarget: textEl,   // jolted by HEAVY hits; usually the prose container
  exit: 'SNAP',          // 'SNAP' | 'DRIFT'
  zIndex: 5
});

sfx.fire('BLAM!');                                 // uses the catalog's own intensity
sfx.fire('CLICK.', { anchor: lineEl });            // LIGHT effects anchor to a line
sfx.fire('KABOOM!', { level: 'HEAVY', exit: 'DRIFT' });
sfx.fire('POW!', { dir: 'INK' });                  // force a treatment

const hit = sfx.fire('SKREEECH!');
hit.remove();                                       // cancel early
sfx.destroy();                                      // tear down the overlay
```

The container is given `position: relative` if it is static. The overlay is `pointer-events: none` and `overflow: hidden`, so effects are clipped to the reading area.

## State

Minimal, and all local to the overlay:

- **live effects** — DOM nodes, removed by a `setTimeout` at `enter + hold + exit`
- **loud count** — number of live MEDIUM/HEAVY effects; drives the dim overlay
- **timers** — cleared on `destroy()`

No global store, no data fetching. In a React codebase this is a ref-held instance plus a `useEffect` cleanup, or a small provider exposing `fire()`.

## Accessibility

Under `prefers-reduced-motion: reduce` the system collapses every entrance to a 90ms `omTick`, drops the screen shake, the wash, `vibe` and `breathe`, and keeps the hold and exit. The words still appear — only the motion is removed. Do not skip this; several motions are high-amplitude.

Consider also announcing effects politely via an `aria-live="polite"` region if the game is played with a screen reader, since the visual effect is the only signal.

## Design tokens

```
--sfx-red    #E8482C   primary ink
--sfx-teal   #00A6A6   misregistered second plate
--sfx-bone   #F4EFE6   letter fill
--sfx-ink    #0A0A09   outline and hard shadow
--sfx-grey   #CFC7BA   THUD! fill
```

Prototype chrome (reference only, not part of the SFX system): page `#100E0C`, panel `#0B0A09`, borders `#2A2622`, body text `#B9B1A5`, muted `#7E766C`.

Type:

```
Passion One 900     INK lettering, headings
Rubik Mono One      BURST lettering
Anton               SHRED lettering
IBM Plex Mono       all UI and body copy
```

Sizes and durations are in the tables above. There is no spacing scale in the SFX system itself — everything is derived from the effect's font size.

## Assets

None. No images, no icons, no SVG files. Three Google Fonts (Passion One, Rubik Mono One, Anton) plus IBM Plex Mono for the surrounding UI. Self-host them if the game ships offline.

## Files

- `comic-sfx.css` — all 19 `@keyframes`. The complete stylesheet.
- `comic-sfx.js` — `CATALOG`, `COLORS`, the timing constants and the `ComicSFX` class. ESM, also assigns `window.ComicSFX`.
- `demo.html` — minimal vanilla page: a mock reading area and a trigger pad.
- `index.html` — the workbench: edit the catalog, preview at real screen sizes, export.
- `design/prototype.dc.html` — the original visual prototype: a playground with treatment/intensity/exit switches plus the annotated spec sheet. Kept as design history; it carries three keyframes (`omSlide`, `omCaret`, `omLines`) that were prototype chrome and never shipped, so do not copy from it.
