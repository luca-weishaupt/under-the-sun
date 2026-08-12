/** The series index — and the answer to "where are we?" */

import { loadSessions, loadHevel } from '../data.js';
import { store } from '../store.js';
import { esc, ICONS } from '../ui.js';
import { formatRef } from '../scripture.js';

/** Which chapters of the book the group has covered, from completed sessions. */
function chaptersCovered(sessions) {
  const covered = new Set();
  for (const s of sessions) {
    if (!store.isDone(s.id)) continue;
    for (const c of s.chapters || []) covered.add(c);
  }
  return covered;
}

export async function home() {
  const [data, hevel] = await Promise.all([loadSessions(), loadHevel()]);
  const studies = data.sessions.filter((s) => s.kind !== 'service');
  const covered = chaptersCovered(data.sessions);
  const upNext = data.sessions.find((s) => !store.isDone(s.id)) || data.sessions[0];

  const el = document.createElement('div');
  el.innerHTML = `
    <div class="wrap">
      <div class="hero">
        <p class="eyebrow">${esc(data.sessions.length)}-week series · Ecclesiastes</p>
        <h1>${esc(data.title)}</h1>
        <p class="lede">${data.intro}</p>

        <div class="statrow">
          <div class="stat"><div class="stat__n">12</div><div class="stat__l">chapters, start to finish</div></div>
          <div class="stat"><div class="stat__n">6</div><div class="stat__l">translations, side by side</div></div>
          <div class="stat"><div class="stat__n">${hevel.total}</div><div class="stat__l">times the book says <i>hevel</i></div></div>
          <div class="stat"><div class="stat__n">${hevel.vocabulary.length}</div><div class="stat__l">English words used for it</div></div>
        </div>
      </div>

      <div class="nowcard">
        <div class="nowcard__body">
          <p class="eyebrow">Up next on this device</p>
          <p class="nowcard__title">Session ${upNext.id} — ${esc(upNext.title)}</p>
          <p class="nowcard__meta">${upNext.ref ? esc(formatRef(upNext.ref)) + ' · ' : ''}${esc(upNext.summary)}</p>
        </div>
        <a class="btn btn--primary" href="#/s/${upNext.id}">Open session ${ICONS.arrow}</a>
      </div>

      <h2>The series</h2>
      <div class="ribbon" title="Chapters covered">
        ${Array.from({ length: 12 }, (_, i) => `<i data-on="${covered.has(i + 1)}"></i>`).join('')}
      </div>
      <p class="crumb" style="margin-top:.5rem">${covered.size} of 12 chapters marked complete on this device.</p>

      <div class="sessions">
        ${data.sessions.map((s) => `
          <a class="scard ${s.kind === 'service' ? 'scard--service' : ''}" href="#/s/${s.id}" data-done="${store.isDone(s.id)}">
            <span class="scard__n">${String(s.id).padStart(2, '0')}</span>
            <span>
              <span class="scard__title">${esc(s.title)}</span>
              <span class="scard__ref">${s.ref ? esc(formatRef(s.ref)) : esc(s.subtitle || '')}</span>
              <span class="scard__q">${esc(s.question)}</span>
            </span>
            <span class="scard__badge">${store.isDone(s.id) ? 'Done' : (s.kind === 'service' ? 'Service' : `${s.mins || 55} min`)}</span>
          </a>`).join('')}
      </div>

      <div class="endcap">
        <p class="crumb" style="margin:0">${studies.length} studies · ${data.sessions.length - studies.length} service Sundays</p>
        <a class="btn" href="#/leading">How to lead one ${ICONS.arrow}</a>
      </div>
    </div>`;

  return el;
}
