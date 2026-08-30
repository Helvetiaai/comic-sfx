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

function prefersReduced() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ── lettering ───────────────────────────────────────────────────────────── */

function inkGlyph(word, size, r) {
  // note: `split` is handled generically in glyph(), not here — it wraps the
  // finished glyph of any treatment.
  const o = Math.max(3, size * 0.09);
  const base = {
    fontFamily: "'Passion One', sans-serif",
    fontWeight: '900',
    fontSize: size + 'px',
    lineHeight: '.9',
    color: r.tint || COLORS.bone,
    WebkitTextStroke: Math.max(2, size * 0.055) + 'px ' + COLORS.ink,
    paintOrder: 'stroke fill',
    textShadow: r.flat
      ? o + 'px ' + o + 'px 0 ' + COLORS.ink
      : o + 'px ' + o + 'px 0 ' + COLORS.red + ', ' + (o * 2) + 'px ' + (o * 2) + 'px 0 ' + COLORS.ink,
    transform: 'skewX(-8deg)',
    whiteSpace: 'nowrap',
    opacity: r.faint ? '.7' : '1'
  };
  return el('div', base, word);
}

function burstGlyph(word, size) {
  const s = size * 0.44;
  const wrap = el('div', { position: 'relative', padding: (s * 0.9) + 'px ' + (s * 1.2) + 'px' });
  wrap.appendChild(el('div', {
    position: 'absolute', inset: '0', background: COLORS.teal, clipPath: BURST_PTS,
    transform: 'translate(' + (s * 0.2) + 'px,' + (s * 0.17) + 'px)'
  }));
  wrap.appendChild(el('div', { position: 'absolute', inset: '0', background: COLORS.red, clipPath: BURST_PTS }));
  wrap.appendChild(el('div', {
    position: 'relative', fontFamily: "'Rubik Mono One', sans-serif", fontSize: s + 'px', lineHeight: '1',
    color: COLORS.bone, WebkitTextStroke: Math.max(2, s * 0.1) + 'px ' + COLORS.ink,
    paintOrder: 'stroke fill', whiteSpace: 'nowrap'
  }, word.replace(/[!.\u2026]/g, '')));
  return wrap;
}

function shredGlyph(word, size) {
  const f = size * 0.66;
  const t = {
    fontFamily: "'Anton', sans-serif", fontSize: f + 'px', lineHeight: '1', letterSpacing: '.02em',
    transform: 'scaleY(1.35)', transformOrigin: '50% 50%', whiteSpace: 'nowrap'
  };
  const wrap = el('div', { position: 'relative', transform: 'skewX(-14deg)' });
  wrap.appendChild(el('div', Object.assign({}, t, {
    position: 'absolute', left: (f * 0.2) + 'px', top: (f * 0.06) + 'px', color: COLORS.red
  }), word));
  wrap.appendChild(el('div', Object.assign({}, t, {
    position: 'relative', color: COLORS.bone,
    WebkitTextStroke: Math.max(2, f * 0.08) + 'px ' + COLORS.ink, paintOrder: 'stroke fill'
  }), word));
  return wrap;
}

function glyphBase(word, dir, size, r) {
  if (dir === 'BURST') return burstGlyph(word, size);
  if (dir === 'SHRED') return shredGlyph(word, size);
  return inkGlyph(word, size, r);
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
  return glyphBase(word, dir, size, opts || {});
}

/* split works on any treatment: build the finished glyph three times — one
   hidden copy holding the layout, two clipped along a ragged tear — and
   animate the halves apart. */
function glyph(word, dir, size, r) {
  if (!r.split) return glyphBase(word, dir, size, r);
  const wrap = el('div', { position: 'relative' });
  const hidden = el('div', { visibility: 'hidden' });
  hidden.appendChild(glyphBase(word, dir, size, r));
  wrap.appendChild(hidden);
  const half = function (clip, anim) {
    const n = el('div', {
      position: 'absolute', left: '0', top: '0', clipPath: clip,
      animation: anim + ' 300ms cubic-bezier(.2,.85,.3,1) 70ms both'
    });
    n.appendChild(glyphBase(word, dir, size, r));
    return n;
  };
  wrap.appendChild(half('polygon(0 0,100% 0,100% 44%,71% 55%,37% 43%,0 53%)', 'omSplitA'));
  wrap.appendChild(half('polygon(0 53%,37% 43%,71% 55%,100% 44%,100% 100%,0 100%)', 'omSplitB'));
  return wrap;
}

/* ── timing ──────────────────────────────────────────────────────────────── */

function plan(r, level, exit, reduced) {
  const hold = Math.round(HOLD[level] * (r.hold || 1));
  if (reduced) {
    return { enter: 'omTick 90ms linear both', dur: 90, hold: hold,
             out: 'omSnap 60ms steps(1) ' + (90 + hold) + 'ms both', life: 150 + hold };
  }
  const m = MOTIONS[r.motion] || MOTIONS.pop;
  const dur = m[3] || Math.round(ENTER[level] * m[1]);
  const enter = m[0] + ' ' + dur + 'ms ' + m[2] + ' both';
  if (r.motion === 'sweep') return { enter: enter, dur: dur, hold: 0, out: null, life: dur + 40 };
  const out = exit === 'DRIFT'
    ? 'omDrift 260ms ease-in ' + (dur + hold) + 'ms both'
    : 'omSnap 60ms steps(1) ' + (dur + hold) + 'ms both';
  return { enter: enter, dur: dur, hold: hold, out: out,
           life: dur + hold + (exit === 'DRIFT' ? 270 : 70) };
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
    this.opts = Object.assign({ shakeTarget: null, exit: 'SNAP', zIndex: 5 }, opts || {});
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';

    this.layer = el('div', {
      position: 'absolute', inset: '0', overflow: 'hidden',
      pointerEvents: 'none', zIndex: String(this.opts.zIndex)
    });
    this.dim = el('div', {
      position: 'absolute', inset: '0', background: 'rgba(11,10,9,.62)',
      opacity: '0', transition: 'opacity 140ms linear'
    });
    this.layer.appendChild(this.dim);
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
    const p = plan(r, level, exit, reduced);
    const size = Math.round(SIZE[level] * (r.size || 1));
    const rot = level === 'HEAVY' ? -3 + Math.random() * 6 : -9 + Math.random() * 14;

    // innermost: the entrance, wrapped outward by each active modifier
    let node = el('div', {
      animation: p.out ? p.enter + ', ' + p.out : p.enter,
      transformOrigin: '50% 50%'
    });
    node.appendChild(glyph(word, o.dir || r.dir, size, r));

    const wrapIn = function (style) { const w = el('div', style); w.appendChild(node); node = w; };
    if (r.breathe && !reduced) wrapIn({ animation: 'omBreathe ' + (p.dur + p.hold) + 'ms ease-out both' });
    if (r.vibe && !reduced) wrapIn({ animation: 'omVibe 90ms steps(2) infinite' });
    if (r.shake && level !== 'LIGHT' && !reduced) {
      wrapIn({ animation: 'omShake ' + (r.shake === 'hard' ? 240 : 180) + 'ms steps(5) ' + Math.round(p.dur * 0.45) + 'ms 1 both' });
    }

    // placement
    const pos = { position: 'absolute', pointerEvents: 'none' };
    const anchor = level === 'LIGHT' ? (o.anchor || null) : null;
    if (anchor) {
      const s = this.root.getBoundingClientRect(), a = anchor.getBoundingClientRect();
      pos.left = Math.min(a.left - s.left + a.width * (0.35 + Math.random() * 0.5), s.width - 150) + 'px';
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

    // environment
    if (level !== 'LIGHT') { this.loud++; this.dim.style.opacity = '1'; }
    if (level === 'HEAVY' && !reduced) {
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
      if (level !== 'LIGHT' && --self.loud <= 0) { self.loud = 0; self.dim.style.opacity = '0'; }
    };
    const timer = setTimeout(done, p.life);
    this.timers.push(timer);
    // keep the list from growing without bound across a long session
    if (this.timers.length > 60) this.timers = this.timers.slice(-30);
    return { element: mount, remove: function () { clearTimeout(timer); done(); } };
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
