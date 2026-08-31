/* sticker-pack.js — pack 1, chosen for chat, not for the game.
 *
 * Two rules behind the word list:
 *   1. Every word has to say something a person actually wants to say.
 *   2. Sixteen different conversational moves, not sixteen punch sounds.
 *
 * `says` is the reason the sticker gets sent. It is documentation, but it is
 * also the test: if a word has no clear `says`, it does not belong in a pack.
 *
 * ── the visual system ──────────────────────────────────────────────────────
 * A pack has to read as one thing. Two rules, applied without exception:
 *
 *   COLOUR carries the feeling. On plain lettering the letters carry it; on
 *   a burst the plate does, since the burst prints red letters on yellow.
 *     yellow  something good, or loud     BOOM YES OK THANKS WOW HAHAHA 5555
 *     red     something went wrong        OUCH ARGH YIKES SORRY
 *     cyan    cool, social, low-energy    HERE BRUV BYE HUH ZZZ
 *
 *   TREATMENT carries the delivery
 *     BURST   a declaration               BOOM YES OK
 *     SHRED   a word that stretches       WOW ARGH BYE
 *     INK     anything simply spoken      the rest
 *
 * The red family also takes `flat`, so its shadow is black rather than red —
 * red lettering over a red shadow would mush. That is the one place the
 * system needs a second decision, and it follows from the first.
 */
const RED  = '#E52521';
const CYAN = '#3ACBF0';
/* yellow needs no override — it is the style's own fill */

export const PACK_1 = [

  /* ── yellow: good, or loud ─────────────────────────────────────────────── */

  { word: 'BOOM!',  says: 'nailed it, mic drop',
    dir: 'BURST', motion: 'slam',    level: 'MEDIUM', size: 1,    shake: 'med' },

  { word: 'YES!',   says: 'yes, agreed',
    dir: 'BURST', motion: 'slam',    level: 'MEDIUM', size: 1,    shake: 'med' },

  { word: 'OK!',    says: 'agreed, got it',
    dir: 'BURST', motion: 'slam',    level: 'MEDIUM', size: 1,    shake: 'med' },

  { word: 'THANKS!', says: 'thank you',
    dir: 'INK',   motion: 'pop',     level: 'MEDIUM', size: 1.15 },

  { word: 'WOW!',   says: 'amazed',
    dir: 'SHRED', motion: 'stretch', level: 'MEDIUM', size: 1.05 },

  { word: 'HAHAHA!', says: 'laughing',
    dir: 'INK',   motion: 'pop',     level: 'MEDIUM', size: 0.95,
    stagger: { parts: ['HA', 'HA', 'HA'], step: 90, dx: 0.13, dy: 0.16, scale: 1.1 } },

  /* 5 is 'ha' in Thai, so 5555 is how Thailand laughs. Staggered flat rather
     than rising, so it reads apart from HAHAHA. */
  { word: '5555',   says: 'laughing (Thai)',
    dir: 'INK',   motion: 'pop',     level: 'MEDIUM', size: 1.1,
    stagger: { parts: ['5', '5', '5', '5'], step: 75, dx: 0.08, dy: 0, scale: 1.05 } },

  /* ── red: something went wrong ─────────────────────────────────────────── */

  { word: 'OUCH!',  says: 'ouch, that hurt',
    dir: 'INK',   motion: 'drop',    level: 'MEDIUM', size: 1,    shake: 'med',
    tint: RED, flat: true },

  { word: 'ARGH!',  says: 'frustration',
    dir: 'SHRED', motion: 'stretch', level: 'MEDIUM', size: 1,    vibe: true,
    tint: RED, flat: true },

  /* six letters, so it renders narrower than the rest at the same size */
  { word: 'YIKES!', says: 'awkward',
    dir: 'INK',   motion: 'squeeze', level: 'MEDIUM', size: 1.2,  vibe: true,
    tint: RED, flat: true },

  { word: 'SORRY!', says: 'apology',
    dir: 'INK',   motion: 'drop',    level: 'MEDIUM', size: 1.1,
    tint: RED, flat: true },

  /* ── cyan: cool, social, low-energy ────────────────────────────────────── */

  { word: 'HERE!',  says: 'present, I am here',
    dir: 'INK',   motion: 'crack',   level: 'MEDIUM', size: 1,    shake: 'med',
    tint: CYAN },

  /* not a sound effect — a way of addressing someone. Every other sticker is
     something you feel; this one is who you are talking to. */
  { word: 'BRUV',   says: 'mate, bro',
    dir: 'INK',   motion: 'crack',   level: 'MEDIUM', size: 1.1,  tint: CYAN },

  { word: 'BYE!',   says: 'goodbye',
    dir: 'SHRED', motion: 'squeeze', level: 'MEDIUM', size: 1.05, tint: CYAN },

  { word: 'HUH?',   says: 'confused',
    dir: 'INK',   motion: 'pop',     level: 'MEDIUM', size: 1,    tint: CYAN },

  /* the classic sleep gag: three Z's arriving one after another, each a little
     higher and a little bigger, drifting up */
  { word: 'ZZZ…', says: 'boring, asleep',
    dir: 'INK',   motion: 'muffle',  level: 'MEDIUM', size: 0.9,  tint: CYAN,
    stagger: { parts: ['Z', 'Z', 'Z'], step: 190, dx: 0.1, dy: 0.4, scale: 1.18 } }
];

/* Held for pack 2 — deliberately a different register (modern, gaming,
   louder) so pack 1 keeps one consistent voice. */
export const PACK_2_CANDIDATES = [
  'KABOOM!', 'PEW PEW!', 'GASP!', 'BAM!', 'CRASH!', 'SPLAT!', 'TA-DA!', 'NOPE!', 'WHAM!', 'POW!'
];
