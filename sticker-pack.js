/* sticker-pack.js — pack 1, chosen for chat, not for the game.
 *
 * Two rules behind this list:
 *   1. Every word has to say something a person actually wants to say.
 *   2. Eight different conversational moves, not eight punch sounds.
 *
 * `says` is the reason the sticker gets sent. It is documentation, but it is
 * also the test: if a word has no clear `says`, it does not belong in a pack.
 */
export const PACK_1 = [
  { word: 'BOOM!',  says: 'nailed it, mic drop',
    dir: 'BURST', motion: 'slam',    level: 'MEDIUM', size: 1,    shake: 'med' },

  { word: 'POW!',   says: 'burn, take that',
    dir: 'BURST', motion: 'slam',    level: 'MEDIUM', size: 1,    shake: 'med' },

  { word: 'OUCH!',  says: 'ouch, that hurt',
    dir: 'INK',   motion: 'drop',    level: 'MEDIUM', size: 1,    shake: 'med' },

  /* six letters, so it renders narrower than the rest at the same size —
     bumped until it carries the same weight as the bursts */
  { word: 'YIKES!', says: 'awkward',
    dir: 'INK',   motion: 'squeeze', level: 'MEDIUM', size: 1.2, vibe: true },

  /* laughing is the highest-frequency thing missing from a reaction pack.
     Three beats rather than one word, so it lands like actual laughter. */
  { word: 'HAHAHA!', says: 'laughing',
    dir: 'INK',   motion: 'pop',     level: 'MEDIUM', size: 0.95,
    stagger: { parts: ['HA', 'HA', 'HA'], step: 90, dx: 0.13, dy: 0.16, scale: 1.1 } },

  { word: 'ARGH!',  says: 'frustration',
    dir: 'SHRED', motion: 'stretch', level: 'MEDIUM', size: 1,    vibe: true },

  /* the classic sleep gag: three Z's arriving one after another, each a little
     higher and a little bigger, drifting up */
  { word: 'ZZZ…', says: 'boring, asleep',
    dir: 'INK',   motion: 'muffle',  level: 'MEDIUM', size: 0.9,
    stagger: { parts: ['Z', 'Z', 'Z'], step: 190, dx: 0.1, dy: 0.4, scale: 1.18 } },

  { word: 'HUH?',   says: 'confused',
    dir: 'INK',   motion: 'pop',     level: 'MEDIUM', size: 1, tint: '#3ACBF0' }
,

  /* ── the everyday half ────────────────────────────────────────────────────
     The first eight are all reactions. These are the things people actually
     send most: courtesies and greetings. Every one maps onto a tag without
     stretching, which is how the pack gets found. */

  { word: 'THANKS!', says: 'thank you',
    dir: 'INK',   motion: 'pop',     level: 'MEDIUM', size: 1.15 },

  { word: 'SORRY!', says: 'apology',
    dir: 'INK',   motion: 'drop',    level: 'MEDIUM', size: 1.1 },

  { word: 'OK!',    says: 'agreed, got it',
    dir: 'BURST', motion: 'slam',    level: 'MEDIUM', size: 1,    shake: 'med' },

  { word: 'HERE!',  says: 'present, I am here',
    dir: 'INK',   motion: 'crack',   level: 'MEDIUM', size: 1,    shake: 'med' },

  /* 5 is ha in Thai, so 5555 is how Thailand laughs. Staggered like the
     laugh it is — flat rather than rising, so it reads apart from HAHAHA. */
  { word: '5555',   says: 'laughing (Thai)',
    dir: 'INK',   motion: 'pop',     level: 'MEDIUM', size: 1.1,
    stagger: { parts: ['5', '5', '5', '5'], step: 75, dx: 0.08, dy: 0, scale: 1.05 } },

  { word: 'WOW!',   says: 'amazed',
    dir: 'SHRED', motion: 'stretch', level: 'MEDIUM', size: 1.05 },

  { word: 'YAY!',   says: 'celebrate, hooray',
    dir: 'INK',   motion: 'pop',     level: 'MEDIUM', size: 1.05, tint: '#3ACBF0' },

  { word: 'BYE!',   says: 'goodbye',
    dir: 'SHRED', motion: 'squeeze', level: 'MEDIUM', size: 1.05 }
];

/* Held for pack 2 — deliberately a different register (modern, gaming,
   louder) so pack 1 keeps one consistent voice. */
export const PACK_2_CANDIDATES = [
  'KABOOM!', 'PEW PEW!', 'WOW!', 'GASP!', 'BAM!', 'CRASH!', 'SPLAT!', 'TA-DA!', 'NOPE!', 'WHAM!'
];
