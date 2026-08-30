# Comic SFX

Vintage comic-book sound effects — **BLAM!**, **KABOOM!**, **SKREEECH!**, **CLICK.** — rendered over the reading area of a text game. Built for moments that need physical punctuation when the player has audio off.

Everything is real text in the DOM plus CSS keyframes. No canvas, no SVG animation, no particle system, no dependencies. Effects are selectable, translatable and reachable by a screen reader.

Two files ship into your game. A browser-based workbench designs the sounds.

**[Open the workbench →](https://helvetiaai.github.io/comic-sfx/)**

---

## Install

Three ways in, in order of least commitment. There is no build step in any of them.

**Straight from a CDN** — nothing to install:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Helvetiaai/comic-sfx@main/comic-sfx.css">
<script type="module">
  import { ComicSFX } from 'https://cdn.jsdelivr.net/gh/Helvetiaai/comic-sfx@main/comic-sfx.js';
</script>
```

**As a dependency:**

```bash
npm install github:Helvetiaai/comic-sfx
```

**Or copy `comic-sfx.js` and `comic-sfx.css` into your project.** They are two standalone files with no imports of their own; vendoring them is a perfectly good answer for a game.

Whichever you pick, the fonts have to be loaded too:

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Passion+One:wght@900&family=Rubik+Mono+One&family=Anton&display=swap">
```

## Quick start

```js
import { ComicSFX } from './comic-sfx.js';   // or the CDN URL, or 'comic-sfx'

const sfx = new ComicSFX(document.querySelector('#reading-area'), {
  shakeTarget: document.querySelector('#prose')   // jolted by HEAVY hits
});

sfx.fire('BLAM!');
sfx.fire('CLICK.', { anchor: lineEl });           // quiet effects sit by a line
sfx.fire('KABOOM!', { level: 'HEAVY', exit: 'DRIFT' });
```

That is the whole integration. It works in React, Vue, Svelte or plain HTML — the class only needs a DOM element to mount into.

In React, hold the instance in a ref and tear it down on unmount:

```jsx
useEffect(() => {
  const sfx = new ComicSFX(ref.current, { shakeTarget: proseRef.current });
  sfxRef.current = sfx;
  return () => sfx.destroy();
}, []);
```

Open `demo.html` through a local server for a runnable example.

> **Self-host the fonts if your game ships offline.** The lettering falls back to a system font without Passion One, Rubik Mono One and Anton, and the effect stops working visually.

## The workbench

`index.html` is a visual editor for the catalog: pick a sound, adjust it, watch it fire over placeholder prose at phone, tablet or desktop width, and export the result. A plain-language readout under the preview describes the current sound as a sentence, so you never have to interpret a setting to know what it does.

```bash
npx serve .
```

Then open the address it prints. It needs a server because it loads the library as an ES module, which browsers block over `file://`. Pushing this repository to GitHub and enabling Pages also works — the workbench is the site's home page.

Your catalog is saved in the browser as you work. **Export catalog** produces the `CATALOG` array to paste back into `comic-sfx.js`.

## How it fits together

Three concepts, and they compose:

| Concept | What it decides | How many |
|---|---|---|
| **Treatment** (`dir`) | how the word is drawn | 3 — INK, BURST, SHRED |
| **Motion** | how the word arrives | 10, one `@keyframes` block each |
| **Intensity** (`level`) | how much of the interface it may disrupt | 3 — LIGHT, MEDIUM, HEAVY |

A single `CATALOG` array maps each word to a treatment, a motion, a natural intensity and a few modifier flags. **Adding a sound is one object in that array.** Adding a motion is one `@keyframes` block plus one line in the `MOTIONS` table.

Intensity is the part that matters most — it governs how much the effect is allowed to disrupt the interface, not just how big it is:

| | Base size | Placement | Disruption |
|---|---|---|---|
| **LIGHT** | 38px | anchored to the line that caused it | none — nothing else moves |
| **MEDIUM** | 104px | centred, tilted | prose behind it dims |
| **HEAVY** | 168px | fills the panel | screen shake + halftone wash |

Use HEAVY two or three times per chapter at most. It stops meaning anything if it is common.

## Catalog

| Word | Treatment | Motion | Intensity | Use |
|---|---|---|---|---|
| BLAM! | INK | crack | Heavy | Gunshot in a closed room |
| POW! | BURST | slam | Medium | A punch that lands |
| THUD! | INK | drop | Medium | Body or bag hitting a floor |
| KRAK! | BURST | crack | Heavy | Bone, glass, a chair leg — tears in half |
| SHTOK! | INK | tick | Light | Short and wet |
| BOOM! | BURST | slam | Heavy | Keeps growing while it holds |
| KABOOM! | BURST | slam | Heavy | Fire, gas, a car. The rare one |
| WHOOSH! | SHRED | sweep | Light | A swing that misses |
| SKREEECH! | SHRED | stretch | Medium | Tyres, brakes, dragged metal |
| SPRRT! | SHRED | sweep | Light | Small and fast |
| NNNGH! | SHRED | squeeze | Medium | Effort, not impact |
| CLICK. | INK | tick | Light | Safety catch, lock, receiver going down |
| BZZZT! | INK | buzz | Light | Teal. Phone on metal, gate buzzer |
| THUMP… | INK | muffle | Light | Something heavy, elsewhere in the building |

Punctuation is part of the word and deliberate. BURST strips it before rendering — the shape supplies the emphasis.

## API

### `new ComicSFX(container, options?)`

| Option | Default | |
|---|---|---|
| `shakeTarget` | `null` | element jolted by HEAVY hits, usually the prose container |
| `exit` | `'SNAP'` | `'SNAP'` cuts out in one frame, `'DRIFT'` fades upward |
| `zIndex` | `5` | layer z-index |

The container is given `position: relative` if it is static. The overlay is `pointer-events: none` and `overflow: hidden`, so effects are clipped to the reading area.

### `sfx.fire(sound, options?)`

`sound` is a word from the catalog, or a catalog-shaped object fired ad hoc without registering it.

```js
sfx.fire('POW!', { dir: 'INK' });                    // force a treatment
sfx.fire({ word: 'GLORP!', dir: 'INK', motion: 'drop' });
const hit = sfx.fire('SKREEECH!');
hit.remove();                                        // cancel early
```

Options: `level`, `dir`, `exit`, `anchor` (an element for LIGHT effects to sit beside). Returns `{ element, remove() }`.

### `sfx.destroy()`

Clears every timer and removes the overlay. Safe to call twice. In React this is your `useEffect` cleanup.

### `renderGlyph(word, dir, size, opts?)`

Builds the lettering as a detached element without animating or mounting it — for pickers, style guides and static art.

### Catalog entry

```js
{ word: 'BLAM!', group: 'impact', level: 'HEAVY', dir: 'INK',
  motion: 'crack', size: 1.15, shake: 'hard' }
```

`size` and `hold` multiply the intensity's base size and duration. Flags: `shake` (`'med'` / `'hard'`), `split` (tears the word in half), `vibe` (trembles while on screen), `breathe` (keeps growing through the hold), `flat` (single black shadow instead of the red double), `tint` (overrides the bone fill), `faint` (70% opacity), `exit`.

### Styles

A style is the ink — which plates the burst is printed from, how letters are filled and outlined, what colour the ghost behind speed lettering is. Nothing about timing or motion lives there.

```js
new ComicSFX(el, { style: 'pop' });   // whole overlay
sfx.fire('POW!', { style: 'pop' });   // one effect
{ word: 'POW!', dir: 'BURST', style: 'pop' }   // one catalog entry
```

Two ship. **`noir`** is the default and the original: a red plate with a misregistered teal one behind it, bone letters, restrained — built for a grounded crime story. **`pop`** is the loud primary version people picture when they hear "comic book sound effect": a yellow burst inside a red ring inside a heavy black outline, red letters with a white ring, halftone dots.

Adding a style is one object in `STYLES`. Plates are drawn back to front, where `scale` grows a plate concentrically to make an outline — `clip-path` has no stroke of its own — and `dx`/`dy` offset one to make a misregistered print instead.

### Stagger

`stagger` renders a word as several parts that arrive one after another — three Z's drifting up, PEW PEW landing twice, HA HA HA:

```js
{ word: 'ZZZ…', dir: 'INK', motion: 'muffle',
  stagger: { parts: ['Z','Z','Z'], step: 190, dx: 0.1, dy: 0.4, scale: 1.18 } }
```

`parts` defaults to splitting the word on spaces. `step` is milliseconds between parts; `dx` and `dy` are the gap and the rise per part, in units of the font size; `scale` is a size multiplier applied per part. Every part is a full glyph, so treatments and flags all work inside a stagger. The hold and exit wait for the last part, and the parts leave together. Under `prefers-reduced-motion` they all arrive at once.

## Accessibility

Under `prefers-reduced-motion: reduce` the system collapses every entrance to a 90ms pop and drops the screen shake, the halftone wash, `vibe` and `breathe`. The hold and exit stay, so the words still appear — only the motion is removed. This is built in and several of the motions are high-amplitude, so do not disable it.

If your game is played with a screen reader, announce effects through an `aria-live="polite"` region as well: the visual effect is otherwise the only signal.

## Fitting

Base sizes are absolute pixels because that is what the design specifies — a HEAVY effect is 168px. A 168px word does not fit a 375px phone, so every effect is measured once it is laid out and scaled down if it would run past the reading area.

The standard it holds to is that **nothing legible is ever clipped**, at any point from the first frame to the last. That is more than fitting the resting size, so the calculation also covers the entrance overshoot (`crack` opens at 1.4× and is opaque there), the stroke and drop shadow — which paint outside every geometry API and add roughly 29% of the font size — the tilt, `breathe` growth, and the pixel displacement from `shake`, `split` and `vibe`.

Deliberately transparent, heavily blurred frames are exempt: `slam` opens at 2.7× behind a 10px blur at zero opacity, and fitting that would shrink explosions to nothing for an overshoot nobody can see. It is fitted from the frame where it becomes legible instead.

Anything that already fits is left at its exact specified size, so nothing changes on desktop. `fire()` reports what happened:

```js
const hit = sfx.fire('KABOOM!');
hit.size;      // 193 — the size the design asked for
hit.rendered;  // 87  — what fitted on this screen
hit.fit;       // 0.45 — 1 when nothing had to be given up
```

A word shrinking below roughly 70% is a writing signal rather than a bug: it means the word is too long to land at that intensity on that screen. The workbench surfaces this for the sound you are editing.

## Known limits

- Native engines (Unity, Godot, Unreal) need a real reimplementation — this renders through the DOM.
- Requires `clip-path`, `-webkit-text-stroke` and `paint-order`: current Chrome, Firefox, Safari and Edge.

## Files

| | |
|---|---|
| `comic-sfx.js` | `CATALOG`, `COLORS`, timing constants and the `ComicSFX` class |
| `comic-sfx.css` | all 19 `@keyframes` — the complete stylesheet |
| `index.html` | the workbench |
| `demo.html` | minimal vanilla example |
| `DESIGN.md` | the full design specification and rationale |
| `AGENTS.md` | orientation for coding agents working in this repo |
| `design/prototype.dc.html` | the original visual prototype |

## Licence

MIT — see [LICENSE](LICENSE).
