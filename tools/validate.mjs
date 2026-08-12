#!/usr/bin/env node
/**
 * Checks the curriculum against the actual Bible text and against YouTube.
 *
 * Run this after editing data/sessions.json. It catches the failures that would
 * only otherwise show up in front of six teenagers on a Sunday morning:
 * a passage that renders empty, a discussion prompt anchored to a verse that
 * isn't in the passage, or a video that has been taken down.
 *
 *   node tools/validate.mjs            check everything except the network
 *   node tools/validate.mjs --videos   also verify every video still resolves
 */

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = async (p) => JSON.parse(await readFile(join(ROOT, p), 'utf8'));

const problems = [];
const warnings = [];
const fail = (msg) => problems.push(msg);
const warn = (msg) => warnings.push(msg);

/* Mirrors assets/js/scripture.js — kept in step by the tests below. */
function parseRef(ref) {
  const clean = String(ref).trim().replace(/[–—]/g, '-');
  const [a, b] = clean.split('-').map((s) => s.trim());
  const point = (s) => {
    const [c, v] = s.split(':').map((n) => parseInt(n, 10));
    return { c, v: Number.isFinite(v) ? v : null };
  };
  const start = point(a);
  if (!b) return { start, end: start.v == null ? { c: start.c, v: null } : { ...start } };
  const end = b.includes(':') ? point(b) : { c: start.c, v: parseInt(b, 10) };
  return { start, end };
}

function versesIn(translation, ref) {
  const { start, end } = parseRef(ref);
  const out = [];
  for (let c = start.c; c <= end.c; c++) {
    for (const block of translation.chapters[c] || []) {
      if (block.t !== 'v') continue;
      if (c === start.c && start.v != null && block.n < start.v) continue;
      if (c === end.c && end.v != null && block.n > end.v) continue;
      out.push(`${c}:${block.n}`);
    }
  }
  return out;
}

async function oembed(id) {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
    if (!res.ok) return null;
    const data = await res.json();
    return { title: data.title, channel: data.author_name };
  } catch {
    return null;
  }
}

const main = async () => {
  const [sessions, index] = await Promise.all([read('data/sessions.json'), read('data/bible/index.json')]);
  const translations = Object.fromEntries(await Promise.all(
    index.translations.map(async (t) => [t.id, await read(t.file)]),
  ));
  const primary = translations.BSB;

  const checkVideos = process.argv.includes('--videos');
  const videos = [];
  const chaptersCovered = new Set();
  const ids = new Set();

  for (const s of sessions.sessions) {
    const where = `session ${s.id} (${s.title})`;

    if (ids.has(s.id)) fail(`${where}: duplicate id`);
    ids.add(s.id);
    for (const field of ['title', 'question', 'summary']) {
      if (!s[field]) fail(`${where}: missing "${field}"`);
    }
    if (!s.steps?.length) fail(`${where}: no steps`);
    for (const c of s.chapters || []) chaptersCovered.add(c);

    // Session-level reference must resolve to real verses.
    if (s.ref) {
      const verses = versesIn(primary, s.ref);
      if (!verses.length) fail(`${where}: ref "${s.ref}" matches no verses`);
    } else if (s.kind !== 'service') {
      fail(`${where}: study session has no ref`);
    }

    const declared = s.mins;
    const summed = s.steps.reduce((n, step) => n + (step.mins || 0), 0);
    if (declared && Math.abs(declared - summed) > 12) {
      warn(`${where}: listed as ${declared} min but steps total ${summed} min`);
    }

    for (const [i, step] of s.steps.entries()) {
      const at = `${where} step ${i + 1} (${step.kind})`;
      if (!step.mins) warn(`${at}: no duration`);

      if (step.video) {
        const v = step.video;
        if (!v.youtubeId) fail(`${at}: video without a youtubeId`);
        else videos.push({ at, ...v });
        if (!step.noVideo) warn(`${at}: has a video but no no-video fallback`);

        // A stop at the wrong second is worse than no stop at all — it cuts the
        // video mid-sentence in front of the group.
        const seconds = (label) => {
          const [m, s] = String(label).split(':').map(Number);
          return Number.isFinite(m) && Number.isFinite(s) ? m * 60 + s : null;
        };
        const runtime = v.duration ? seconds(v.duration) : null;
        const limit = v.end || runtime;
        let previous = v.start || 0;

        for (const [j, stop] of (v.pauses || []).entries()) {
          const where = `${at} stop ${j + 1}`;
          if (!Number.isFinite(stop.at)) { fail(`${where}: "at" is not a number`); continue; }
          if (!stop.q) fail(`${where}: no question`);
          if (stop.at <= previous) {
            fail(`${where}: at ${stop.at}s is not after the previous stop/start (${previous}s)`);
          }
          previous = stop.at;
          if (limit && stop.at >= limit) {
            fail(`${where}: at ${stop.at}s but the video ends at ${limit}s`);
          }
          if (limit && limit - stop.at < 25) {
            warn(`${where}: only ${limit - stop.at}s of video left after this stop`);
          }
          if (stop.atLabel && seconds(stop.atLabel) !== stop.at) {
            fail(`${where}: label "${stop.atLabel}" does not match at=${stop.at}`);
          }
        }
        if (v.start && v.end && v.end <= v.start) fail(`${at}: video end is not after start`);
      }

      if (step.kind === 'read') {
        if (!step.passage) { fail(`${at}: read step without a passage`); continue; }

        // Every translation must produce the same verse list, or switching
        // translation mid-session would silently change what gets read.
        const reference = versesIn(primary, step.passage);
        if (!reference.length) { fail(`${at}: passage "${step.passage}" matches no verses`); continue; }

        for (const [id, data] of Object.entries(translations)) {
          const got = versesIn(data, step.passage);
          if (got.length !== reference.length) {
            fail(`${at}: passage "${step.passage}" has ${reference.length} verses in BSB but ${got.length} in ${id}`);
          }
        }

        // Interleaved prompts must anchor to a verse inside the passage.
        const inPassage = new Set(reference);
        for (const stop of step.interleave || []) {
          if (!inPassage.has(String(stop.after))) {
            fail(`${at}: prompt anchored after "${stop.after}", which is not in ${step.passage}`);
          }
          if (!stop.asks?.length) fail(`${at}: interleave at ${stop.after} has no questions`);
        }
      }

      for (const ask of step.asks || []) {
        if (!ask.q) fail(`${at}: an ask has no question text`);
      }
    }
  }

  for (let c = 1; c <= 12; c++) {
    if (!chaptersCovered.has(c)) warn(`chapter ${c} is not listed in any session's "chapters"`);
  }

  if (checkVideos) {
    console.log(`Checking ${videos.length} videos…`);
    for (const v of videos) {
      const live = await oembed(v.youtubeId);
      if (!live) fail(`${v.at}: video ${v.youtubeId} is dead or not embeddable`);
      else {
        const same = live.title.trim() === v.title.trim();
        console.log(`  ${same ? '✓' : '≈'} ${v.youtubeId}  ${live.channel} :: ${live.title}`);
        if (!same) warn(`${v.at}: stored title "${v.title}" vs actual "${live.title}"`);
        if (v.channel && live.channel.trim() !== v.channel.trim()) {
          warn(`${v.at}: stored channel "${v.channel}" vs actual "${live.channel}"`);
        }
      }
    }
  }

  const studies = sessions.sessions.filter((s) => s.kind !== 'service');
  console.log(`\n${sessions.sessions.length} sessions — ${studies.length} studies, ${sessions.sessions.length - studies.length} service`);
  console.log(`${videos.length} videos${checkVideos ? ' (verified)' : ' (not checked — pass --videos)'}`);
  console.log(`chapters covered: ${[...chaptersCovered].sort((a, b) => a - b).join(', ')}`);

  if (warnings.length) {
    console.log(`\n${warnings.length} warning(s):`);
    for (const w of warnings) console.log(`  ! ${w}`);
  }
  if (problems.length) {
    console.log(`\n${problems.length} problem(s):`);
    for (const p of problems) console.log(`  ✗ ${p}`);
    process.exit(1);
  }
  console.log('\nAll checks passed.');
};

main().catch((e) => { console.error('FAILED:', e); process.exit(1); });
