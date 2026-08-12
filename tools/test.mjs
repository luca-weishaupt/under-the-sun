#!/usr/bin/env node
/**
 * Tests for the passage engine — the part most likely to break quietly.
 * These import the real browser module, so a regression there fails here.
 *
 *   node tools/test.mjs
 */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRef, extract, render, toText, formatRef } from '../assets/js/scripture.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = async (p) => JSON.parse(await readFile(join(ROOT, p), 'utf8'));

let passed = 0;
const failures = [];
const check = (name, fn) => {
  try { fn(); passed++; }
  catch (err) { failures.push(`${name}: ${err.message}`); }
};
const eq = (actual, expected, what = '') => {
  const a = JSON.stringify(actual); const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${what} expected ${b}, got ${a}`);
};
const ok = (cond, what) => { if (!cond) throw new Error(what); };

const bsb = await read('data/bible/BSB.json');
const kjv = await read('data/bible/KJV.json');
const sessions = await read('data/sessions.json');

/* --- parseRef ------------------------------------------------------------- */

check('parseRef single chapter', () => {
  eq(parseRef('3'), { start: { c: 3, v: null }, end: { c: 3, v: null } });
});
check('parseRef verse range in one chapter', () => {
  eq(parseRef('3:1-8'), { start: { c: 3, v: 1 }, end: { c: 3, v: 8 } });
});
check('parseRef range across chapters', () => {
  eq(parseRef('11:7-12:8'), { start: { c: 11, v: 7 }, end: { c: 12, v: 8 } });
});
check('parseRef single verse', () => {
  eq(parseRef('12:13'), { start: { c: 12, v: 13 }, end: { c: 12, v: 13 } });
});
check('parseRef tolerates en dashes', () => {
  eq(parseRef('1:1–11'), { start: { c: 1, v: 1 }, end: { c: 1, v: 11 } });
});

/* --- extract -------------------------------------------------------------- */

const verses = (blocks) => blocks.filter((b) => b.t === 'v').map((b) => `${b.c}:${b.n}`);

check('extract respects the start of a range', () => {
  eq(verses(extract(bsb, '1:1-11')).slice(0, 3), ['1:1', '1:2', '1:3']);
});
check('extract respects the end of a range', () => {
  eq(verses(extract(bsb, '1:1-11')).at(-1), '1:11');
});
check('extract returns exactly the requested verses', () => {
  eq(extract(bsb, '3:1-8').filter((b) => b.t === 'v').length, 8);
});
check('extract spans a chapter boundary', () => {
  const got = verses(extract(bsb, '1:12-2:26'));
  eq(got[0], '1:12');
  eq(got.at(-1), '2:26');
  ok(got.includes('1:18') && got.includes('2:1'), 'should cross from ch.1 into ch.2');
});
check('extract of a whole chapter matches the source', () => {
  const got = extract(bsb, '12').filter((b) => b.t === 'v');
  const source = bsb.chapters['12'].filter((b) => b.t === 'v');
  eq(got.length, source.length);
});
check('extract does not leak the verse after the range', () => {
  ok(!verses(extract(bsb, '3:1-8')).includes('3:9'), 'verse 9 must not appear');
});
check('extract keeps headings inside the range', () => {
  ok(extract(bsb, '3:1-8').some((b) => b.t === 'h'), 'the season poem has a heading');
});
check('extract works for every translation', () => {
  // 9:13-18 (6) + all of chapter 10 (20) + 11:1-6 (6) = 32
  for (const t of [bsb, kjv]) eq(extract(t, '9:13-11:6').filter((b) => b.t === 'v').length, 32);
});

/* --- render --------------------------------------------------------------- */

const html = render(extract(bsb, '3:1-8'));
check('render marks up verse numbers', () => ok(html.includes('class="sc-n">1<'), 'verse 1 number'));
check('render makes verses tappable', () => ok(html.includes('data-ref="3:1"'), 'data-ref present'));
check('render preserves poetic indent', () => ok(html.includes('data-poem="2"'), 'poetry indent'));
check('render escapes nothing dangerous', () => ok(!/<script/i.test(html), 'no script tags'));
check('render highlights the vapor word', () => {
  ok(render(extract(kjv, '1:2')).includes('sc-hevel'), 'KJV 1:2 should highlight "vanity"');
});
check('render can be switched to non-interactive', () => {
  ok(!render(extract(bsb, '3:1-8'), { interactive: false }).includes('<button'), 'no buttons');
});

check('toText produces readable plain text', () => {
  const text = toText(extract(bsb, '3:1-8'));
  ok(text.startsWith('1 To everything'), `got: ${text.slice(0, 40)}`);
  eq(text.split('\n').length, 8);
});

check('formatRef reads like a citation', () => {
  eq(formatRef('1:1-11'), 'Ecclesiastes 1:1–11');
});

/* --- curriculum wiring ---------------------------------------------------- */

check('every read step renders a non-empty passage', () => {
  for (const s of sessions.sessions) {
    for (const step of s.steps) {
      if (step.kind !== 'read') continue;
      const blocks = extract(bsb, step.passage);
      ok(blocks.filter((b) => b.t === 'v').length > 0, `session ${s.id}: ${step.passage} is empty`);
      ok(render(blocks).length > 100, `session ${s.id}: ${step.passage} rendered nothing`);
    }
  }
});

check('every interleaved prompt anchors to a verse in its passage', () => {
  for (const s of sessions.sessions) {
    for (const step of s.steps) {
      if (step.kind !== 'read') continue;
      const inPassage = new Set(verses(extract(bsb, step.passage)));
      for (const stop of step.interleave || []) {
        ok(inPassage.has(String(stop.after)),
          `session ${s.id}: prompt after ${stop.after} is outside ${step.passage}`);
      }
    }
  }
});

check('the ten studies cover all 222 verses of the book', () => {
  const seen = new Set();
  for (const s of sessions.sessions) {
    for (const step of s.steps) {
      if (step.kind === 'read') for (const v of verses(extract(bsb, step.passage))) seen.add(v);
    }
  }
  const all = [];
  for (let c = 1; c <= 12; c++) {
    for (const b of bsb.chapters[c]) if (b.t === 'v') all.push(`${c}:${b.n}`);
  }
  const missing = all.filter((v) => !seen.has(v));
  ok(missing.length === 0, `${missing.length} verses never read: ${missing.slice(0, 12).join(', ')}…`);
});

/* --- report --------------------------------------------------------------- */

console.log(`${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
