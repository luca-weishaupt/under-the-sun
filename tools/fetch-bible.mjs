#!/usr/bin/env node
/**
 * Fetches Ecclesiastes from the Free Use Bible API (bible.helloao.org) and writes
 * one normalized JSON file per translation into data/bible/.
 *
 * Run once; the output is committed so the site is fully static and works offline.
 *
 *   node tools/fetch-bible.mjs
 *
 * Every translation below is freely redistributable. See data/bible/LICENSES.json
 * for the attribution each one requires.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'data', 'bible');
const API = 'https://bible.helloao.org/api';
const BOOK = 'ECC';
const CHAPTERS = 12;

/**
 * Translations to bundle, in the order they appear in the app's picker.
 *
 * Every one of these may legally be redistributed — that is the only reason
 * these six are the six. Checked against each publisher's own terms.
 *
 * Deliberately NOT included:
 *   NET   — netbible.com/copyright permits free *use*, but not bundling the
 *           full text into a public repository. Link to it instead.
 *   NIV, ESV, NLT, NASB, CSB, MSG — all copyrighted, none redistributable.
 */
const TRANSLATIONS = [
  {
    id: 'BSB', label: 'BSB', name: 'Berean Standard Bible',
    blurb: 'Modern, accurate, reads cleanly aloud. The default.',
    license: 'Public domain',
  },
  {
    id: 'ENGWEBP', label: 'WEB', name: 'World English Bible',
    blurb: 'A public-domain modern update of the 1901 ASV.',
    license: 'Public domain',
  },
  {
    id: 'eng_fbv', label: 'FBV', name: 'Free Bible Version',
    blurb: 'Plain, direct English. Good when a passage is knotty.',
    license: 'CC BY-SA 4.0 — © 2018 Dr. Jonathan Gallagher',
  },
  {
    id: 'eng_lsv', label: 'LSV', name: 'Literal Standard Version',
    blurb: 'Very literal — close to the Hebrew word order.',
    license: 'CC BY-SA 4.0 — © 2020 Covenant Press',
  },
  {
    id: 'eng_bbe', label: 'BBE', name: 'Bible in Basic English',
    blurb: 'A 1,000-word vocabulary. The one to try when nothing else lands.',
    license: 'Public domain',
  },
  {
    id: 'eng_kjv', label: 'KJV', name: 'King James Version',
    blurb: 'The 1611 classic. “Vanity of vanities.”',
    license: 'Public domain',
  },
];

async function getJSON(url) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt === 4) throw new Error(`${url} failed after 4 attempts: ${err.message}`);
      await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }
}

/**
 * The API represents a chapter as an ordered list of headings, verses and line
 * breaks. A verse's content is a mix of plain strings, {text, poem} objects
 * (poem = poetic-line indent level) and {noteId} footnote markers.
 *
 * We flatten that into a shape the renderer can walk directly, while keeping
 * enough structure to lay poetry out as poetry.
 */
function normalizeChapter(chapter, unknown) {
  const notes = new Map(
    (chapter.footnotes || []).map((f) => [f.noteId, f.text]),
  );
  const blocks = [];

  for (const item of chapter.content || []) {
    if (item.type === 'heading') {
      blocks.push({ t: 'h', text: (item.content || []).join(' ').trim() });
      continue;
    }
    if (item.type === 'line_break') {
      blocks.push({ t: 'br' });
      continue;
    }
    if (item.type !== 'verse') continue;

    const lines = [];
    const verseNotes = [];
    let buffer = null;

    const flush = () => {
      if (buffer && buffer.text.trim()) lines.push(buffer);
      buffer = null;
    };

    for (const part of item.content || []) {
      if (typeof part === 'string') {
        const text = part.trim();
        if (!text) continue;
        if (buffer && buffer.poem == null) buffer.text += ' ' + text;
        else {
          flush();
          buffer = { text, poem: null };
        }
      } else if (part && typeof part.text === 'string') {
        const text = part.text.trim();
        if (!text) continue;
        const poem = part.poem ?? null;
        if (buffer && buffer.poem === poem && poem == null) buffer.text += ' ' + text;
        else {
          flush();
          buffer = { text, poem };
        }
      } else if (part && part.lineBreak) {
        // A break *inside* a verse, distinct from the top-level line_break
        // between verses. Without this, two prose halves of a verse get glued
        // into one line — e.g. BSB 2:1, where "enjoy what is good!" and
        // "But it proved to be futile." are meant to sit on separate lines.
        flush();
      } else if (part && part.noteId != null && notes.has(part.noteId)) {
        verseNotes.push(notes.get(part.noteId));
      } else if (part && typeof part === 'object' && !('noteId' in part)) {
        unknown.add(Object.keys(part).sort().join(','));
      }
    }
    flush();

    if (!lines.length) continue;
    const verse = { t: 'v', n: item.number, lines };
    if (verseNotes.length) verse.notes = verseNotes;
    blocks.push(verse);
  }

  return blocks;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const manifest = [];
  // Any verse-segment shape we do not explicitly handle, so a change upstream
  // surfaces as a build error instead of quietly missing text.
  const unknown = new Set();

  for (const meta of TRANSLATIONS) {
    process.stdout.write(`${meta.label.padEnd(4)} `);
    const chapters = {};
    let info = null;
    let verseCount = 0;

    for (let c = 1; c <= CHAPTERS; c++) {
      const data = await getJSON(`${API}/${meta.id}/${BOOK}/${c}.json`);
      info ||= data.translation;
      const blocks = normalizeChapter(data.chapter, unknown);
      const verses = blocks.filter((b) => b.t === 'v');
      verseCount += verses.length;

      // The API reports how many verses a chapter should have. If our parse
      // drops any, the study would silently show an incomplete passage.
      const expected = data.numberOfVerses;
      if (expected && verses.length !== expected) {
        throw new Error(
          `${meta.label} ch.${c}: parsed ${verses.length} verses, API says ${expected}`,
        );
      }
      chapters[c] = blocks;
      process.stdout.write('.');
    }

    const payload = {
      id: meta.label,
      apiId: meta.id,
      name: meta.name,
      blurb: meta.blurb,
      license: meta.license,
      website: info?.website || '',
      licenseUrl: info?.licenseUrl || '',
      book: 'Ecclesiastes',
      chapters,
    };
    await writeFile(
      join(OUT_DIR, `${meta.label}.json`),
      JSON.stringify(payload),
    );
    manifest.push({
      id: meta.label,
      name: meta.name,
      blurb: meta.blurb,
      license: meta.license,
      website: payload.website,
      licenseUrl: payload.licenseUrl,
      file: `data/bible/${meta.label}.json`,
    });
    console.log(` ${verseCount} verses`);
  }

  if (unknown.size) {
    throw new Error(
      `Unhandled verse-segment shapes from the API: ${[...unknown].join(' | ')}. ` +
      'Add a branch in normalizeChapter before shipping — text is being dropped.',
    );
  }

  await writeFile(
    join(OUT_DIR, 'index.json'),
    JSON.stringify({ book: 'Ecclesiastes', chapters: CHAPTERS, translations: manifest }, null, 2),
  );
  console.log(`\nWrote ${manifest.length} translations to data/bible/`);
}

main().catch((err) => {
  console.error('\nFAILED:', err.message);
  process.exit(1);
});
