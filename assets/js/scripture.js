/**
 * Passage references, extraction, and rendering.
 *
 * A chapter in data/bible/<ID>.json is an ordered list of blocks:
 *   { t: 'h',  text }                  heading
 *   { t: 'br' }                        stanza break
 *   { t: 'v',  n, lines[], notes[] }   verse; lines are { text, poem }
 *
 * `poem` is the poetic indent level (null for prose), which is what lets
 * Ecclesiastes look like the poem it actually is.
 */

const BOOK = 'Ecclesiastes';

/**
 * Parses references like "3:1-8", "1:1-11", "11:7-12:8", "12".
 * Returns { start: {c, v}, end: {c, v} } with v = null meaning whole chapter.
 */
export function parseRef(ref) {
  const clean = String(ref).trim().replace(/[–—]/g, '-');
  const [rawStart, rawEnd] = clean.split('-').map((s) => s.trim());

  const parsePoint = (s) => {
    const [c, v] = s.split(':').map((n) => parseInt(n, 10));
    return { c, v: Number.isFinite(v) ? v : null };
  };

  const start = parsePoint(rawStart);
  if (!rawEnd) {
    // "3:5" is a single verse; "3" is a whole chapter.
    return { start, end: start.v == null ? { c: start.c, v: null } : { ...start } };
  }
  // "3:1-8" -> end has no colon, so it inherits the chapter.
  const end = rawEnd.includes(':') ? parsePoint(rawEnd) : { c: start.c, v: parseInt(rawEnd, 10) };
  return { start, end };
}

export function formatRef(ref) {
  return `${BOOK} ${String(ref).replace(/-/g, '–')}`;
}

/** True when verse `v` of chapter `c` falls inside the parsed range. */
function inRange(c, v, { start, end }) {
  if (c < start.c || c > end.c) return false;
  if (c === start.c && start.v != null && v < start.v) return false;
  if (c === end.c && end.v != null && v > end.v) return false;
  return true;
}

/**
 * Pulls the blocks for a reference out of a loaded translation, keeping the
 * headings and stanza breaks that sit between the verses.
 */
export function extract(translation, ref) {
  const range = parseRef(ref);
  const out = [];

  for (let c = range.start.c; c <= range.end.c; c++) {
    const blocks = translation.chapters[c] || translation.chapters[String(c)];
    if (!blocks) continue;

    let open = false;      // are we inside the range in this chapter?
    let pending = [];      // headings/breaks awaiting a verse to justify them

    for (const b of blocks) {
      if (b.t === 'v') {
        if (!inRange(c, b.n, range)) {
          if (open) return out; // walked off the end
          pending = [];
          continue;
        }
        if (!open) { open = true; pending = pending.filter((p) => p.t === 'h').slice(-1); }
        out.push(...pending, { ...b, c });
        pending = [];
      } else {
        pending.push(b);
      }
    }
  }
  return out;
}

/* --- rendering ------------------------------------------------------------ */

const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]
));

/**
 * The vapor word, in every form the six bundled translations use for it.
 * Matching is done on rendered text, so this is a display nicety — the
 * authoritative occurrence list lives in data/hevel.json.
 */
const HEVEL_WORDS = [
  'futility of futilities', 'vanity of vanities', 'so hard to understand',
  'things of no purpose', 'hard to understand', 'to no purpose', 'incomprehensible',
  'tough to comprehend', 'hard to fathom', 'everything passes', 'short-lived',
  'meaningless', 'frustrating', 'quickly over', 'fleeting', 'temporary',
  'futility', 'futile', 'vanities', 'vanity', 'vain', 'breath', 'elusive',
];
const HEVEL_RE = new RegExp(`\\b(${HEVEL_WORDS.join('|')})\\b`, 'gi');

function markHevel(text) {
  return esc(text).replace(HEVEL_RE, '<span class="sc-hevel">$1</span>');
}

/**
 * Renders blocks to HTML. Verses are buttons so a tap opens the parallel
 * translation panel — the single most-used thing in the app.
 */
export function render(blocks, { hevel = true, interactive = true } = {}) {
  const html = [];

  for (const b of blocks) {
    if (b.t === 'h') { html.push(`<p class="sc-h">${esc(b.text)}</p>`); continue; }
    if (b.t === 'br') { html.push('<div class="sc-br"></div>'); continue; }

    const ref = `${b.c}:${b.n}`;
    const body = b.lines.map((l) => {
      const text = hevel ? markHevel(l.text) : esc(l.text);
      return l.poem
        ? `<span class="sc-line" data-poem="${l.poem}">${text}</span>`
        : `<span class="sc-prose">${text}</span>`;
    }).join(b.lines.some((l) => l.poem) ? '' : ' ');

    const num = `<span class="sc-n">${b.n}</span>`;
    html.push(interactive
      ? `<button class="sc-v" type="button" data-ref="${ref}" aria-expanded="false" aria-label="Compare translations of verse ${b.n}">${num}${body}</button>`
      : `<span class="sc-v">${num}${body}</span>`);
  }

  return html.join('\n');
}

/** Plain text of a passage, for the print sheet and copy-to-clipboard. */
export function toText(blocks) {
  return blocks
    .filter((b) => b.t === 'v')
    .map((b) => `${b.n} ${b.lines.map((l) => l.text).join(' ')}`)
    .join('\n');
}
