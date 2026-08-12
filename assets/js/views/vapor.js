/**
 * The vapor word.
 *
 * One Hebrew word — hevel — carries this whole book, and the six translations
 * bundled here render it 32 different ways. Putting that on one page does more
 * to teach Ecclesiastes than any amount of explaining, and it treats the reader
 * as someone capable of weighing evidence.
 */

import { loadHevel } from '../data.js';
import { esc, ICONS } from '../ui.js';

const highlight = (text, words, paraphrased) => {
  if (paraphrased) return `${esc(text)} <span class="para">rewritten</span>`;
  let html = esc(text);
  for (const word of [...words].sort((a, b) => b.length - a.length)) {
    html = html.replace(esc(word), (m) => `<mark>${m}</mark>`);
  }
  return html;
};

export async function vapor() {
  const data = await loadHevel();
  const state = { word: null };

  const el = document.createElement('div');
  el.className = 'wrap';

  function occurrencesHTML() {
    const list = state.word
      ? data.occurrences.filter((o) => data.translations.some(
          (t) => o.renderings[t].words.some((w) => w.toLowerCase() === state.word)))
      : data.occurrences;

    if (!list.length) return '<p class="loading">No verses match.</p>';

    return list.map((o) => `
      <div class="occ">
        <span class="occ__ref">Ecclesiastes ${esc(o.ref)}</span>
        <dl>
          ${data.translations.map((t) => {
            const r = o.renderings[t];
            return `<dt>${esc(t)}</dt><dd>${highlight(r.text, r.words, r.paraphrased)}</dd>`;
          }).join('')}
        </dl>
      </div>`).join('');
  }

  function paint() {
    el.innerHTML = `
      <p class="crumb"><a href="#/">Sessions</a> → The vapor word</p>
      <h1>One word. ${data.vocabulary.length} ways to say it.</h1>
      <p class="lede">
        Ecclesiastes is built on a single Hebrew word: <b>hevel</b> (הֶבֶל). It literally means
        vapour — the puff of breath you can see on a cold morning, there and then gone.
        It shows up <b>${data.total} times</b> in ${data.verses} verses, and the translators
        genuinely cannot agree on what to do with it.
      </p>

      <div class="note">
        <strong>Why this matters more than it looks.</strong> If hevel means “meaningless”,
        Ecclesiastes is a nihilist book that Christians have to explain away. If it means
        “vapour” — fleeting, hard to grasp, impossible to hold onto — it is a book about
        how to live honestly in a world that will not sit still. Same Hebrew. Very different book.
        Read the renderings below and decide which one you think fits.
      </div>

      <h2 style="margin-top:2.5rem">Every English word used</h2>
      <p class="crumb">Tap one to see only the verses where a translator reached for it.</p>
      <div class="vapor-cloud">
        ${data.vocabulary.map((v) => `
          <button type="button" data-word="${esc(v.word)}" aria-pressed="${state.word === v.word}"
            style="font-size:${(0.9 + Math.min(v.count, 40) / 34).toFixed(2)}rem"
            title="${esc(v.translations.join(', '))}">${esc(v.word)}<i>${v.count}</i></button>`).join('')}
        ${state.word ? '<button type="button" data-word="" class="clear">clear filter ×</button>' : ''}
      </div>

      <h2 style="margin-top:2.5rem">${state.word ? `Verses rendered “${esc(state.word)}”` : `All ${data.verses} verses`}</h2>
      <div data-occurrences>${occurrencesHTML()}</div>

      <div class="endcap">
        <a class="btn btn--ghost" href="#/read/1">Read chapter 1 ${ICONS.arrow}</a>
        <a class="btn" href="#/s/1">Start session 1 ${ICONS.arrow}</a>
      </div>`;
  }

  paint();

  el.addEventListener('click', (event) => {
    const button = event.target.closest('[data-word]');
    if (!button) return;
    const word = button.dataset.word;
    state.word = word && state.word !== word ? word : null;
    paint();
  });

  return el;
}
