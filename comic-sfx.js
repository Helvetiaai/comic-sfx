/* comic-sfx.js — vintage comic SFX overlay for a text game.
 * No dependencies. Requires comic-sfx.css for the @keyframes.
 *
 *   import { ComicSFX } from './comic-sfx.js';
 *   const sfx = new ComicSFX(document.querySelector('#game'));
 *   sfx.fire('BLAM!');
 *   sfx.fire('CLICK.', { anchor: lineEl });
 *   sfx.fire('KABOOM!', { level: 'HEAVY', exit: 'DRIFT' });
 *   sfx.fire({ word: 'GLORP!', dir: 'INK', motion: 'drop' });   // ad hoc
 *
 * Adding a sound is one object in CATALOG. Adding a motion is one @keyframes
 * block in the CSS plus one line in MOTIONS.
 */

/* ── palette ─────────────────────────────────────────────────────────────── */
export const COLORS = {
  red:  '#E8482C',   // primary ink
  teal: '#00A6A6',   // misregistered second plate
  bone: '#F4EFE6',   // paper-white letter fill
  ink:  '#0A0A09'    // outline / hard shadow
};

/* ── STYLES ──────────────────────────────────────────────────────────────────
 * A style is the ink: which plates the burst is printed from, how the letters
 * are filled and outlined, what the ghost copy behind speed lettering is.
 * Nothing about timing, motion or intensity lives here.
 *
 * `noir` is the original and stays the default, so an existing game's look
 * does not move. `pop` is the loud primary-coloured version people picture
 * when they hear "comic book sound effect".
 *
 * Plates are drawn back to front. `scale` grows a plate concentrically, which
 * is how an outline is made — clip-path has no stroke of its own. `dx`/`dy`
 * offset a plate instead, which is how a misregistered print is made.
 * Both are in units of the burst's inner font size.
 */
export const STYLES = {
  noir: {
    plates: [
      { fill: '#00A6A6', dx: 0.20, dy: 0.17 },   // the misregistered teal plate
      { fill: '#E8482C' }
    ],
    burstText: { fill: '#F4EFE6', stroke: '#0A0A09', strokeW: 0.10 },
    inkText:   { fill: '#F4EFE6', stroke: '#0A0A09', strokeW: 0.055,
                 shadow: '#E8482C', shadowFlat: '#0A0A09' },
    shred:     { ghost: '#E8482C', fill: '#F4EFE6', stroke: '#0A0A09', strokeW: 0.08 },
    halftone:  null
  },

  pop: {
    plates: [
      { fill: '#0A0A09', scale: 1.13 },          // heavy black outline
      { fill: '#E52521', scale: 1.055 },         // a red ring inside it
      { fill: '#FFD629' }                        // yellow ground
    ],
    burstText: { fill: '#E52521', stroke: '#0A0A09', strokeW: 0.085,
                 outline: { color: '#FFFFFF', w: 0.20 } },
    inkText:   { fill: '#FFD629', stroke: '#0A0A09', strokeW: 0.062,
                 shadow: '#E52521', shadowFlat: '#0A0A09',
                 outline: { color: '#FFFFFF', w: 0.13 } },
    shred:     { ghost: '#1D5FD0', fill: '#FFD629', stroke: '#0A0A09', strokeW: 0.085,
                 outline: { color: '#FFFFFF', w: 0.16 } },
    halftone:  { color: 'rgba(10,10,9,.22)', step: 0.16 }
  }
};

/* ── THE CATALOG ─────────────────────────────────────────────────────────────
 * One entry per sound. Everything about a word lives here.
 *   word    the literal text, punctuation included
 *   group   trigger-pad section: impact | explosion | motion | mech
 *   level   its natural intensity: LIGHT | MEDIUM | HEAVY
 *   dir     treatment: INK | BURST | SHRED
 *   motion  one of the keys in MOTIONS
 *   size    multiplier on the intensity's base size          (default 1)
 *   hold    multiplier on the intensity's hold duration      (default 1)
 *   shake   'hard' | 'med' — jolts the lettering; 'hard' at HEAVY also shakes
 *           the game text if you pass a shakeTarget
 *   flat    single black drop shadow instead of the red/black double
 *   tint    override the bone fill
 *   faint   render at 70% opacity
 *   split   tear the word in half and separate the pieces
 *   vibe    keep trembling for as long as it is on screen
 *   breathe keep growing while it holds
 *   use     documentation only
 */
export const CATALOG = [
  { word: 'BLAM!', group: 'impact', level: 'HEAVY', dir: 'INK', motion: 'crack', size: 1.15, shake: 'hard',
    use: 'Gunshot in a closed room. Arrives already at full size — a bang has no anticipation.' },
  { word: 'POW!', group: 'impact', level: 'MEDIUM', dir: 'BURST', motion: 'slam', size: 1, shake: 'med',
    use: 'A punch that lands. Burst plate behind it, shakes off the contact.' },
  { word: 'THUD!', group: 'impact', level: 'MEDIUM', dir: 'INK', motion: 'drop', size: 1, flat: true, tint: '#CFC7BA', shake: 'med',
    use: 'Body or bag hitting a floor. Falls in, squashes wide, settles. Grey, not red.' },
  { word: 'KRAK!', group: 'impact', level: 'HEAVY', dir: 'BURST', motion: 'crack', size: 0.95, split: true, shake: 'hard',
    use: 'Bone, glass, a chair leg. The word tears along the middle and the halves separate.' },
  { word: 'SHTOK!', group: 'impact', level: 'LIGHT', dir: 'INK', motion: 'tick', size: 0.78, flat: true,
    use: 'Short and wet. Small, flat, gone before you finish reading it.' },
  { word: 'BOOM!', group: 'explosion', level: 'HEAVY', dir: 'BURST', motion: 'slam', size: 1.1, breathe: true, shake: 'hard',
    use: 'Slams in and keeps growing while it holds. Expansion, not impact.' },
  { word: 'KABOOM!', group: 'explosion', level: 'HEAVY', dir: 'BURST', motion: 'slam', size: 1.15, breathe: true, shake: 'hard',
    use: 'The rare one. Fire, gas, a car. Twice a chapter at most.' },
  { word: 'WHOOSH!', group: 'motion', level: 'LIGHT', dir: 'SHRED', motion: 'sweep', size: 0.9,
    use: 'Never stops. Enters left, exits right — a swing that misses.' },
  { word: 'SKREEECH!', group: 'motion', level: 'MEDIUM', dir: 'SHRED', motion: 'stretch', size: 0.95, vibe: true, hold: 1.25,
    use: 'Pulled out of nothing horizontally and left vibrating. Tyres, brakes, dragged metal.' },
  { word: 'SPRRT!', group: 'motion', level: 'LIGHT', dir: 'SHRED', motion: 'sweep', size: 0.7,
    use: 'Same pass-through as WHOOSH, small and fast.' },
  { word: 'NNNGH!', group: 'motion', level: 'MEDIUM', dir: 'SHRED', motion: 'squeeze', size: 0.9, vibe: true, hold: 1.4,
    use: 'Compressed flat, then strains open and trembles. Effort, not impact.' },
  { word: 'CLICK.', group: 'mech', level: 'LIGHT', dir: 'INK', motion: 'tick', size: 0.6, flat: true, hold: 0.7,
    use: 'Safety catch, lock, receiver going down. Full stop, no exclamation, no red.' },
  { word: 'BZZZT!', group: 'mech', level: 'LIGHT', dir: 'INK', motion: 'buzz', size: 0.7, tint: '#00A6A6', vibe: true,
    use: 'Stepped six-frame jitter in teal. Phone on metal, strip light, gate buzzer.' },
  { word: 'THUMP\u2026', group: 'mech', level: 'LIGHT', dir: 'INK', motion: 'muffle', size: 0.85, flat: true, faint: true, hold: 1.3,
    use: 'Rises from below at 70% opacity. Something heavy, elsewhere in the building.' }
];

export const MOTION_LABEL = {
  crack:   'snaps in at full size, no wind-up',
  slam:    'oversize slam, then shake',
  drop:    'falls, squashes, settles',
  sweep:   'passes through the frame',
  stretch: 'stretched out from nothing',
  squeeze: 'compressed, then strains open',
  tick:    'small precise pop',
  buzz:    'stepped jitter, electric',
  muffle:  'rises from below, half-opacity',
  pop:     'overshoot pop'
};

/* ── intensity contract ──────────────────────────────────────────────────────
 * LIGHT  local punctuation      — sits by the line that caused it, no disruption
 * MEDIUM breaks the composition — dims the prose behind it, tilts across the panel
 * HEAVY  owns the viewport      — screen shake, halftone wash, nothing else legible
 */
export const SIZE  = { LIGHT: 38,  MEDIUM: 104, HEAVY: 168 };
export const ENTER = { LIGHT: 220, MEDIUM: 300, HEAVY: 440 };
export const HOLD  = { LIGHT: 500, MEDIUM: 820, HEAVY: 1100 };

/* motion -> [keyframe name, multiplier on ENTER, easing, fixed duration or null] */
export const MOTIONS = {
  crack:   ['omCrack',   0.72, 'cubic-bezier(.15,.9,.25,1)',  null],
  slam:    ['omSlam',    1,    'cubic-bezier(.2,.9,.25,1)',   null],
  drop:    ['omDrop',    1.35, 'cubic-bezier(.3,.7,.3,1)',    null],
  sweep:   ['omSweep',   2.1,  'cubic-bezier(.35,.05,.65,.95)', null],
  stretch: ['omStretch', 1.1,  'cubic-bezier(.15,.9,.2,1)',   null],
  squeeze: ['omSqueeze', 1.3,  'cubic-bezier(.2,1.2,.35,1)',  null],
  tick:    ['omTick',    1,    'cubic-bezier(.2,1.5,.4,1)',   150],
  buzz:    ['omBuzz',    1,    'steps(6)',                    260],
  muffle:  ['omMuffle',  1.4,  'cubic-bezier(.25,.8,.3,1)',   null],
  pop:     ['omPop',     1,    'cubic-bezier(.18,1.7,.4,1)',  null]
};

const BURST_PTS = 'polygon(50% 0,58% 15%,73% 6%,71% 24%,89% 20%,80% 34%,100% 40%,84% 50%,100% 62%,80% 67%,90% 82%,71% 78%,73% 96%,58% 86%,50% 100%,42% 86%,27% 96%,29% 78%,10% 82%,20% 67%,0 62%,16% 50%,0 40%,20% 34%,11% 20%,29% 24%,27% 6%,42% 15%)';

const BY_WORD = CATALOG.reduce(function (m, e) { m[e.word] = e; return m; }, {});
const FALLBACK = { dir: 'INK', motion: 'pop', size: 1, level: 'MEDIUM' };

function el(tag, style, text) {
  const n = document.createElement(tag);
  if (style) Object.assign(n.style, style);
  if (text != null) n.textContent = text;
  return n;
}

/* Rotation is randomised per fire, which is right in a game and wrong
   anywhere output has to be reproducible — export the same sticker twice and
   you would get two different files. Passing a seed swaps the source of
   randomness for a small deterministic one, keyed by seed and word so each
   word still gets its own tilt. */
function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function seededRandom(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function prefersReduced() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ── lettering ───────────────────────────────────────────────────────────── */

/* A second outline needs a second copy of the text: -webkit-text-stroke draws
   one ring, so the outer ring is a copy sitting exactly behind with a thicker
   stroke and no fill of its own showing. Styles without `outline` get one
   element, exactly as before. */
function strokedText(word, style, spec, unit, host) {
  if (spec.outline) {
    const back = el('div', Object.assign({}, style, {
      position: 'absolute', left: '0', top: '0',
      color: spec.outline.color,
      WebkitTextStroke: Math.max(2, unit * spec.outline.w) + 'px ' + spec.outline.color,
      paintOrder: 'stroke fill', textShadow: 'none'
    }), word);
    host.appendChild(back);
  }
  const front = el('div', Object.assign({}, style, {
    position: spec.outline ? 'relative' : (style.position || 'static'),
    color: spec.fill,
    WebkitTextStroke: Math.max(2, unit * spec.strokeW) + 'px ' + spec.stroke,
    paintOrder: 'stroke fill'
  }), word);
  host.appendChild(front);
  return front;
}

function inkGlyph(word, size, r, st) {
  // note: `split` is handled generically in glyph(), not here — it wraps the
  // finished glyph of any treatment.
  const spec = st.inkText;
  const o = Math.max(3, size * 0.09);
  const face = {
    fontFamily: (st.fonts && st.fonts.ink) || "'Passion One', sans-serif",
    fontWeight: '900',
    fontSize: size + 'px',
    lineHeight: '.9',
    whiteSpace: 'nowrap'
  };
  const shadow = r.flat
    ? o + 'px ' + o + 'px 0 ' + spec.shadowFlat
    : o + 'px ' + o + 'px 0 ' + spec.shadow + ', ' + (o * 2) + 'px ' + (o * 2) + 'px 0 ' + spec.shadowFlat;

  // one element when there is no second outline, so nothing changes for noir
  if (!spec.outline) {
    return el('div', Object.assign({}, face, {
      color: r.tint || spec.fill,
      WebkitTextStroke: Math.max(2, size * spec.strokeW) + 'px ' + spec.stroke,
      paintOrder: 'stroke fill',
      textShadow: shadow,
      transform: 'skewX(-8deg)',
      width: 'max-content',
      opacity: r.faint ? '.7' : '1'
    }), word);
  }
  const wrap = el('div', {
    position: 'relative', width: 'max-content',
    transform: 'skewX(-8deg)', textShadow: shadow,
    opacity: r.faint ? '.7' : '1'
  });
  strokedText(word, face, Object.assign({}, spec, { fill: r.tint || spec.fill }), size, wrap);
  return wrap;
}

function burstGlyph(word, size, st) {
  const s = size * 0.44;
  const wrap = el('div', { position: 'relative', width: 'max-content', padding: (s * 0.9) + 'px ' + (s * 1.2) + 'px' });

  // plates, back to front: `scale` makes an outline, `dx`/`dy` a misregistration
  st.plates.forEach(function (plate) {
    const t = [];
    if (plate.dx || plate.dy) t.push('translate(' + (s * (plate.dx || 0)) + 'px,' + (s * (plate.dy || 0)) + 'px)');
    if (plate.scale) t.push('scale(' + plate.scale + ')');
    wrap.appendChild(el('div', {
      position: 'absolute', inset: '0', background: plate.fill, clipPath: BURST_PTS,
      transform: t.join(' ') || 'none'
    }));
  });

  if (st.halftone) {
    const d = Math.max(3, s * st.halftone.step);
    wrap.appendChild(el('div', {
      position: 'absolute', inset: '0', clipPath: BURST_PTS, pointerEvents: 'none',
      background: 'radial-gradient(circle at ' + (d * 0.3) + 'px ' + (d * 0.3) + 'px, ' +
                  st.halftone.color + ' ' + (d * 0.2) + 'px, transparent ' + (d * 0.26) + 'px) 0 0/' +
                  d + 'px ' + d + 'px'
    }));
  }

  const host = el('div', { position: 'relative', width: 'max-content' });
  strokedText(word.replace(/[!.\u2026]/g, ''), {
    fontFamily: (st.fonts && st.fonts.burst) || "'Rubik Mono One', sans-serif",
    fontSize: s + 'px', lineHeight: '1', whiteSpace: 'nowrap'
  }, st.burstText, s, host);
  wrap.appendChild(host);
  return wrap;
}

function shredGlyph(word, size, st) {
  const spec = st.shred;
  const f = size * 0.66;
  const t = {
    fontFamily: (st.fonts && st.fonts.shred) || "'Anton', sans-serif",
    fontSize: f + 'px', lineHeight: '1', letterSpacing: '.02em',
    transform: 'scaleY(1.35)', transformOrigin: '50% 50%', whiteSpace: 'nowrap'
  };
  const wrap = el('div', { position: 'relative', width: 'max-content', transform: 'skewX(-14deg)' });
  wrap.appendChild(el('div', Object.assign({}, t, {
    position: 'absolute', left: (f * 0.2) + 'px', top: (f * 0.06) + 'px', color: spec.ghost
  }), word));
  const host = el('div', { position: 'relative', width: 'max-content' });
  strokedText(word, t, spec, f, host);
  wrap.appendChild(host);
  return wrap;
}

function styleOf(name) { return STYLES[name] || STYLES.noir; }

function glyphBase(word, dir, size, r, st) {
  st = st || styleOf(r && r.style);
  if (dir === 'BURST') return burstGlyph(word, size, st);
  if (dir === 'SHRED') return shredGlyph(word, size, st);
  return inkGlyph(word, size, r, st);
}

/* ── fitting ──────────────────────────────────────────────────────────────
 * Base sizes are absolute pixels because that is what the design specifies,
 * but a 168px HEAVY word cannot fit a 375px phone panel. So the glyph is
 * measured once it is laid out and the whole effect is scaled down if it
 * would run past the reading area. Anything that already fits keeps its exact
 * specified size, on every screen.
 */
const FIT_MARGIN = { LIGHT: 0.92, MEDIUM: 0.90, HEAVY: 0.94 };

/* The largest scale at which each entrance is actually *visible*. Peak scale
   alone would be misleading: slam opens at 2.7 but at opacity 0 behind a 10px
   blur and is down to 0.88 by the time it is opaque, so fitting its raw peak
   would shrink explosions to nothing for an overshoot nobody sees. crack is
   the opposite — it is opaque by 5%, still near 1.4, which is why big words
   were clipping on entry.
   Each value is the scale at the frame where the word first reads as a word
   rather than a smear — opacity past ~0.8 with under 2px of blur left. For
   slam that is 34% in, at 1.28; for crack it is 5% in, at 1.32. */
const PEAK = {
  crack: 1.32, slam: 1.28, drop: 1.14, sweep: 1.00, stretch: 1.24,
  squeeze: 1.30, tick: 1.08, buzz: 1.00, muffle: 1.00, pop: 1.15
};

/* The painted box, not the layout box: each treatment transforms itself
   (INK skews, SHRED skews and stretches) and offsets ghost copies, so the
   only trustworthy number is the union of what is actually on screen. The
   caller clears the mount transform first so this reads untilted. */
function visualBox(node) {
  const b = node.getBoundingClientRect();
  let l = b.left, t = b.top, r = b.right, bot = b.bottom;
  const kids = node.querySelectorAll('*');
  for (let i = 0; i < kids.length; i++) {
    const k = kids[i].getBoundingClientRect();
    if (!k.width || !k.height) continue;
    if (k.left < l) l = k.left;
    if (k.top < t) t = k.top;
    if (k.right > r) r = k.right;
    if (k.bottom > bot) bot = k.bottom;
  }
  return { w: r - l, h: bot - t };
}

function fitScale(box, boxW, boxH, level, r, reduced, rot, size) {
  if (!boxW || !boxH || !box.w || !box.h) return 1;
  /* The stroke and the hard drop shadow are painted outside every geometry
     API — getBoundingClientRect, offsetWidth and scrollWidth all report the
     layout box and miss them. Both are derived from the font size, so add
     them back: stroke on each side, shadow to the right and below. */
  const stroke = Math.max(2, size * 0.055), shadow = Math.max(3, size * 0.09) * 2;
  let w = box.w + stroke * 2 + shadow;
  let h = box.h + stroke * 2 + shadow;

  // allow for the entrance overshoot and for `breathe` growing through the hold
  const grow = ((r.breathe && !reduced) ? 1.07 : 1) *
               (reduced ? 1 : (PEAK[r.motion] || 1.15));
  w *= grow; h *= grow;

  // a tilted box is wider than its own width
  const rad = Math.abs(rot || 0) * Math.PI / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const rw = w * cos + h * sin;
  const rh = w * sin + h * cos;

  // these modifiers displace the finished glyph by a fixed number of pixels
  // *after* it is scaled, so they come off the box, not the multiplier
  let px = 0, py = 0;
  if (!reduced) {
    if (r.shake) { px += 6; py += 4; }
    if (r.split) { px += 8; py += 10; }
    if (r.vibe)  { px += 2; py += 2; }
  }
  const m = FIT_MARGIN[level] || 0.9;
  return Math.min(1,
    Math.max(1, boxW * m - px * 2) / rw,
    Math.max(1, boxH * m - py * 2) / rh);
}

/**
 * Build the lettering for a word as a detached element, without animating or
 * mounting it. Useful for pickers, style guides and static art.
 * @param {string} word
 * @param {'INK'|'BURST'|'SHRED'} dir
 * @param {number} size  font size in px
 * @param {object} [opts]  { tint, flat, faint }
 * @returns {HTMLElement}
 */
export function renderGlyph(word, dir, size, opts) {
  opts = opts || {};
  return glyphBase(word, dir, size, opts, styleOf(opts.style));
}

/* split works on any treatment: build the finished glyph three times — one
   hidden copy holding the layout, two clipped along a ragged tear — and
   animate the halves apart. */
function glyph(word, dir, size, r, st) {
  if (!r.split) return glyphBase(word, dir, size, r, st);
  const wrap = el('div', { position: 'relative', width: 'max-content' });
  const hidden = el('div', { visibility: 'hidden' });
  hidden.appendChild(glyphBase(word, dir, size, r, st));
  wrap.appendChild(hidden);
  const half = function (clip, anim) {
    const n = el('div', {
      position: 'absolute', left: '0', top: '0', clipPath: clip,
      animation: anim + ' 300ms cubic-bezier(.2,.85,.3,1) 70ms both'
    });
    n.appendChild(glyphBase(word, dir, size, r, st));
    return n;
  };
  wrap.appendChild(half('polygon(0 0,100% 0,100% 44%,71% 55%,37% 43%,0 53%)', 'omSplitA'));
  wrap.appendChild(half('polygon(0 53%,37% 43%,71% 55%,100% 44%,100% 100%,0 100%)', 'omSplitB'));
  return wrap;
}

/* ── timing ──────────────────────────────────────────────────────────────── */

/* `extra` is the time the last staggered part waits before it enters. The hold
   and the exit have to wait for it, or the last part would barely appear. */
function plan(r, level, exit, reduced, extra) {
  extra = extra || 0;
  const hold = Math.round(HOLD[level] * (r.hold || 1));
  if (reduced) {
    return { enter: 'omTick 90ms linear both', dur: 90, hold: hold, extra: 0,
             out: 'omSnap 60ms steps(1) ' + (90 + hold) + 'ms both', life: 150 + hold };
  }
  const m = MOTIONS[r.motion] || MOTIONS.pop;
  const dur = m[3] || Math.round(ENTER[level] * m[1]);
  const enter = m[0] + ' ' + dur + 'ms ' + m[2] + ' both';
  if (r.motion === 'sweep') {
    return { enter: enter, dur: dur, hold: 0, extra: extra, out: null, life: dur + extra + 40 };
  }
  const out = exit === 'DRIFT'
    ? 'omDrift 260ms ease-in ' + (dur + extra + hold) + 'ms both'
    : 'omSnap 60ms steps(1) ' + (dur + extra + hold) + 'ms both';
  return { enter: enter, dur: dur, hold: hold, extra: extra, out: out,
           life: dur + extra + hold + (exit === 'DRIFT' ? 270 : 70) };
}

/* ── stagger ──────────────────────────────────────────────────────────────
 * Renders a word as several parts that arrive one after another: three Z's
 * drifting up, PEW PEW landing twice, HA HA HA. Each part is a full glyph, so
 * every treatment and flag works inside a stagger.
 *
 *   stagger: {
 *     parts: ['Z','Z','Z'],   // defaults to splitting the word on spaces
 *     step:  170,             // ms between parts
 *     dx:    0.12,            // gap between parts, in units of font size
 *     dy:    0.42,            // how much higher each part sits than the last
 *     scale: 1.16             // size multiplier applied per part
 *   }
 *
 * Offsets are margins rather than transforms on purpose: margins take part in
 * layout, so the cluster measures and centres correctly and the fit sees its
 * true size. A transform would leave the container reporting one part's box.
 */
function staggerArt(word, dir, size, r, st) {
  const s = r.stagger || {};
  const parts = s.parts || String(word).split(' ');
  const step = s.dx != null ? s.dx : 0.12;
  const rise = s.dy != null ? s.dy : 0;
  const grow = s.scale != null ? s.scale : 1;
  const wrap = el('div', { display: 'inline-flex', alignItems: 'flex-end', width: 'max-content' });
  const targets = [];
  parts.forEach(function (text, i) {
    const cell = el('div', {
      marginBottom: Math.round(rise * size * i) + 'px',
      marginLeft: (i ? Math.round(step * size) : 0) + 'px'
    });
    const inner = el('div', { transformOrigin: '50% 50%', width: 'max-content' });
    inner.appendChild(glyph(text, dir, Math.round(size * Math.pow(grow, i)), r, st));
    cell.appendChild(inner);
    wrap.appendChild(cell);
    targets.push(inner);
  });
  return { art: wrap, targets: targets };
}

/* ── the overlay ─────────────────────────────────────────────────────────── */

export class ComicSFX {
  /**
   * @param {HTMLElement} container  the reading area. Gets position:relative.
   * @param {object} [opts]
   * @param {HTMLElement} [opts.shakeTarget]  element jolted by HEAVY hits
   * @param {'SNAP'|'DRIFT'} [opts.exit]      default exit, SNAP
   * @param {number} [opts.zIndex]            layer z-index, 5
   */
  constructor(container, opts) {
    this.root = container;
    this.opts = Object.assign({ shakeTarget: null, exit: 'SNAP', zIndex: 5,
                                style: 'noir', env: true, seed: null }, opts || {});
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';

    this.layer = el('div', {
      position: 'absolute', inset: '0', overflow: 'hidden',
      pointerEvents: 'none', zIndex: String(this.opts.zIndex)
    });
    /* The dim, wash and screen shake all assume an opaque panel behind the
       letters. Over a transparent background — a sticker, an OBS overlay —
       they are wrong, so env:false leaves them out entirely. */
    this.dim = !this.opts.env ? null : el('div', {
      position: 'absolute', inset: '0', background: 'rgba(11,10,9,.62)',
      opacity: '0', transition: 'opacity 140ms linear'
    });
    if (this.dim) this.layer.appendChild(this.dim);
    container.appendChild(this.layer);
    this.loud = 0;      // active MEDIUM/HEAVY count, drives the dim
    this.timers = [];
  }

  /**
   * Fire a sound. Returns a handle with .remove().
   * @param {string|object} sound  a word from the CATALOG, or a catalog-shaped
   *   object fired ad hoc without registering it (this is how the workbench
   *   previews an effect you are still editing).
   */
  fire(sound, o) {
    o = o || {};
    const r = (sound && typeof sound === 'object')
      ? sound
      : (BY_WORD[sound] || Object.assign({}, FALLBACK, { word: sound }));
    const word = r.word || '?';
    const level = o.level || r.level || 'MEDIUM';
    const exit = o.exit || r.exit || this.opts.exit;
    const reduced = prefersReduced();
    const size = Math.round(SIZE[level] * (r.size || 1));
    const seed = o.seed != null ? o.seed : (r.seed != null ? r.seed : this.opts.seed);
    const rnd = seed == null ? Math.random : seededRandom(hashStr(String(seed) + '|' + word));
    const rot = level === 'HEAVY' ? -3 + rnd() * 6 : -9 + rnd() * 14;
    const dir = o.dir || r.dir || 'INK';
    const st = styleOf(o.style || r.style || this.opts.style);

    /* innermost: the entrance, wrapped outward by each active modifier.
       `entrance` is held separately from `node` because wrapIn reassigns node
       as it wraps — the entrance animation belongs on the inner element, and
       attaching it to the outermost wrapper reverses how it composes with
       shake and vibe. */
    const entrance = el('div', { transformOrigin: '50% 50%', width: 'max-content' });
    let targets = [entrance];
    let step = 0;
    if (r.stagger && !reduced) {
      const built = staggerArt(word, dir, size, r, st);
      entrance.appendChild(built.art);
      targets = built.targets;
      step = r.stagger.step != null ? r.stagger.step : 170;
    } else if (r.stagger) {
      // reduced motion: the parts still render, they just all arrive at once
      entrance.appendChild(staggerArt(word, dir, size, r, st).art);
    } else {
      entrance.appendChild(glyph(word, dir, size, r, st));
    }
    const p = plan(r, level, exit, reduced, step * (targets.length - 1));
    const art = entrance;
    let node = entrance;

    const wrapIn = function (style) {
      style.width = 'max-content';
      const w = el('div', style); w.appendChild(node); node = w;
    };
    if (r.breathe && !reduced) wrapIn({ animation: 'omBreathe ' + (p.dur + p.extra + p.hold) + 'ms ease-out both' });
    if (r.vibe && !reduced) wrapIn({ animation: 'omVibe 90ms steps(2) infinite' });
    if (r.shake && level !== 'LIGHT' && !reduced) {
      wrapIn({ animation: 'omShake ' + (r.shake === 'hard' ? 240 : 180) + 'ms steps(5) ' + Math.round(p.dur * 0.45) + 'ms 1 both' });
    }

    // placement
    const pos = { position: 'absolute', pointerEvents: 'none' };
    const anchor = level === 'LIGHT' ? (o.anchor || null) : null;
    if (anchor) {
      const s = this.root.getBoundingClientRect(), a = anchor.getBoundingClientRect();
      pos.left = Math.min(a.left - s.left + a.width * (0.35 + rnd() * 0.5), s.width - 150) + 'px';
      pos.top = (a.top - s.top - 6) + 'px';
      pos.transform = 'translate(-50%,-100%) rotate(' + rot + 'deg)';
    } else if (level === 'HEAVY') {
      pos.inset = '0';
      pos.display = 'flex';
      pos.alignItems = 'center';
      pos.justifyContent = 'center';
      pos.transform = 'rotate(' + rot + 'deg)';
    } else {
      pos.left = '52%';
      pos.top = '46%';
      pos.transform = 'translate(-50%,-50%) rotate(' + rot + 'deg)';
    }
    const mount = el('div', pos);
    mount.appendChild(node);
    this.layer.appendChild(mount);

    /* Measure untilted, fit, then tilt and start the entrance — all
       synchronously, before the browser paints, so there is no visible pop. */
    mount.style.transform = 'none';
    /* Measure the container the same way the glyph is measured. clientWidth
       ignores transforms but getBoundingClientRect does not, so mixing them
       silently breaks the fit wherever an ancestor is scaled — which is
       exactly what a device preview does. Same coordinate space, and any
       enclosing scale cancels out of the ratio. */
    const rootBox = this.root.getBoundingClientRect();
    const fit = fitScale(visualBox(art), rootBox.width, rootBox.height,
                         level, r, reduced, rot, size);
    mount.style.transform = fit < 1
      ? pos.transform + ' scale(' + fit.toFixed(4) + ')'
      : pos.transform;
    /* Start the entrance on the inner element(s). Staggered parts share one
       exit so they leave together, and each waits its turn to arrive. */
    targets.forEach(function (t, i) {
      const d = step * i;
      const enter = d ? p.enter.replace(/ both$/, ' ' + d + 'ms both') : p.enter;
      t.style.animation = p.out ? enter + ', ' + p.out : enter;
    });

    // environment
    if (level !== 'LIGHT' && this.dim) { this.loud++; this.dim.style.opacity = '1'; }
    if (level === 'HEAVY' && !reduced && this.opts.env) {
      const wash = el('div', {
        position: 'absolute', inset: '0', pointerEvents: 'none',
        background: 'radial-gradient(circle at 1.5px 1.5px, ' + COLORS.red + ' 1.5px, transparent 1.8px) 0 0/7px 7px',
        animation: 'omWash 520ms ease-out both'
      });
      this.layer.appendChild(wash);
      this.timers.push(setTimeout(function () { wash.remove(); }, 560));
      if (r.shake === 'hard' && this.opts.shakeTarget) {
        const t = this.opts.shakeTarget;
        t.style.animation = 'none';
        void t.offsetWidth;
        t.style.animation = 'omStage 420ms cubic-bezier(.36,.07,.19,.97) both';
      }
    }

    const self = this;
    const done = function () {
      if (!mount.isConnected) return;
      mount.remove();
      if (level !== 'LIGHT' && self.dim && --self.loud <= 0) { self.loud = 0; self.dim.style.opacity = '0'; }
    };
    const timer = setTimeout(done, p.life);
    this.timers.push(timer);
    // keep the list from growing without bound across a long session
    if (this.timers.length > 60) this.timers = this.timers.slice(-30);
    return {
      element: mount,
      size: size,                          // the size the design asked for
      rendered: Math.round(size * fit),    // what fitted on this screen
      fit: fit,                            // 1 when nothing had to be given up
      remove: function () { clearTimeout(timer); done(); }
    };
  }

  /** Remove every live effect and the overlay itself. Safe to call twice. */
  destroy() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.loud = 0;
    this.layer.remove();
  }
}

if (typeof window !== 'undefined') window.ComicSFX = ComicSFX;
