#!/usr/bin/env node
/**
 * Builds data/hevel.json — the word-study dataset behind the "Vapor" view.
 *
 * The Hebrew word hevel (הֶבֶל, literally "vapor" or "breath") appears 38 times
 * in Ecclesiastes. No English translation agrees on how to render it, which is
 * the single most useful thing a first-time reader can learn about this book.
 *
 * We locate the occurrences via the KJV, which renders hevel as "vanity"/"vain"
 * throughout Ecclesiastes with no false positives, then record how each of the
 * bundled translations handles the same verse.
 *
 *   node tools/build-hevel.mjs
 */

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BIBLE = join(ROOT, 'data', 'bible');

/**
 * Words and phrases the bundled translations reach for when they hit hevel.
 * Sorted longest-first so "vanity of vanities" wins over "vanity".
 *
 * This list was built by reading all 30 verses in all 6 translations, not
 * guessed — the build fails loudly if an occurrence goes unaccounted for.
 */
const RENDERINGS = [
  'passing nature of life whose meaning is elusive',
  'ultimately profitless', 'futility of futilities', 'vanity of vanities',
  'so hard to understand', 'tough to comprehend', 'absolutely futile',
  'completely meaningless', 'utterly meaningless', 'hard to understand',
  'incomprehensible', 'pass like shadows', 'everything passes', 'hard to fathom',
  'for no reason', 'quickly over', 'short-lived', 'hard to do',
  'things of no purpose', 'to no purpose', 'profitless', 'frustrating',
  'meaningless', 'passes away', 'transient', 'temporary', 'uncertain',
  'fleeting', 'futility', 'emptiness', 'pointless', 'illusory', 'elusive',
  'futile', 'obscure', 'vanities', 'absurd', 'enigma', 'useless', 'vanity',
  'breath', 'empty', 'vapor', 'vain',
];

/**
 * A handful of verses are restructured so heavily that no word corresponds to
 * hevel at all — the translator dissolved it into the sentence. That is not a
 * gap in our data, it is the most interesting thing on the page, so we label it.
 */
const PARAPHRASED = new Set([
  'FBV 5:7', 'FBV 6:11', 'FBV 2:23', 'FBV 4:8',
]);

/**
 * Renderings too ambiguous to match by word list, pinned per verse instead.
 *
 * BBE reaches for "wind" and "foolish" in a few places. Both words appear in
 * Ecclesiastes for *other* Hebrew words too — "chasing the wind" is ruach, and
 * "fool" is kesil — so matching them globally would invent occurrences that
 * are not there. Naming the verses keeps the data honest.
 */
const OVERRIDES = {
  'BBE 6:4': ['wind'],
  'BBE 6:12': ['foolish'],
  'BBE 9:9': ['foolish'],
};

const load = async (id) => JSON.parse(await readFile(join(BIBLE, `${id}.json`), 'utf8'));
const verseText = (blocks, n) => {
  const v = blocks.find((b) => b.t === 'v' && b.n === n);
  return v ? v.lines.map((l) => l.text).join(' ') : '';
};

/** Finds which known rendering(s) a translation used in this verse. */
function findRenderings(text) {
  const lower = text.toLowerCase();
  const found = [];
  const claimed = [];
  for (const word of RENDERINGS) {
    let from = 0;
    for (;;) {
      const at = lower.indexOf(word, from);
      if (at === -1) break;
      from = at + word.length;
      // Skip if this span was already claimed by a longer phrase.
      if (claimed.some(([s, e]) => at >= s && at < e)) continue;
      // Whole-word only, so "vain" does not match inside "vainglory".
      const before = lower[at - 1] ?? ' ';
      const after = lower[at + word.length] ?? ' ';
      if (/[a-z]/.test(before) || /[a-z]/.test(after)) continue;
      claimed.push([at, at + word.length]);
      found.push(text.slice(at, at + word.length));
    }
  }
  return found;
}

const main = async () => {
  const ids = ['BSB', 'WEB', 'FBV', 'LSV', 'BBE', 'KJV'];
  const texts = Object.fromEntries(
    await Promise.all(ids.map(async (id) => [id, await load(id)])),
  );

  const occurrences = [];
  let total = 0;
  const misses = [];

  for (let c = 1; c <= 12; c++) {
    for (const block of texts.KJV.chapters[c]) {
      if (block.t !== 'v') continue;
      const kjvText = block.lines.map((l) => l.text).join(' ');
      const kjvHits = (kjvText.match(/\bvanit(?:y|ies)\b|\bvain\b/gi) || []);
      if (!kjvHits.length) continue;
      total += kjvHits.length;

      const ref = `${c}:${block.n}`;
      const renderings = {};
      for (const id of ids) {
        const text = verseText(texts[id].chapters[c], block.n);
        const key = `${id} ${ref}`;
        const words = OVERRIDES[key] || findRenderings(text);
        const paraphrased = PARAPHRASED.has(key);
        renderings[id] = { text, words, ...(paraphrased ? { paraphrased: true } : {}) };
        if (!words.length && !paraphrased) misses.push(key);
      }
      occurrences.push({ ref, chapter: c, verse: block.n, count: kjvHits.length, renderings });
    }
  }

  // The scholarly count is 38. If our extraction drifts from that, the whole
  // premise of the view ("38 times, never the same word twice") is wrong.
  if (total !== 38) throw new Error(`Expected 38 occurrences of hevel, found ${total}`);

  const vocabulary = {};
  for (const occ of occurrences) {
    for (const id of ids) {
      for (const w of occ.renderings[id].words) {
        const key = w.toLowerCase();
        vocabulary[key] ||= { word: key, translations: new Set(), count: 0 };
        vocabulary[key].translations.add(id);
        vocabulary[key].count++;
      }
    }
  }
  const vocab = Object.values(vocabulary)
    .map((v) => ({ word: v.word, count: v.count, translations: [...v.translations].sort() }))
    .sort((a, b) => b.count - a.count);

  await writeFile(
    join(ROOT, 'data', 'hevel.json'),
    JSON.stringify({ total, verses: occurrences.length, translations: ids, vocabulary: vocab, occurrences }, null, 1),
  );

  console.log(`hevel: ${total} occurrences across ${occurrences.length} verses`);
  console.log(`distinct English words used: ${vocab.length}`);
  console.log(vocab.map((v) => `${v.word}(${v.count})`).join(' '));
  if (misses.length) {
    throw new Error(
      `Unaccounted hevel renderings — add them to RENDERINGS or PARAPHRASED:\n  ${misses.join(', ')}`,
    );
  }
};

main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
