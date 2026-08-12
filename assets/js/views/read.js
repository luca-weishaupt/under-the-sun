/** Free reading — the whole book, any chapter, any translation. */

import { loadTranslation, translations } from '../data.js';
import { store } from '../store.js';
import { esc, ICONS, wireVerseCompare, translationPicker, wireTranslationPicker } from '../ui.js';
import { extract, render, formatRef } from '../scripture.js';

export async function read(ref) {
  const list = await translations();
  const state = { ref: ref || '1', translation: store.get().translation };

  const el = document.createElement('div');
  el.className = 'wrap';

  async function paint() {
    const translation = await loadTranslation(state.translation);
    const chapter = parseInt(state.ref, 10) || 1;
    const blocks = extract(translation, String(chapter));

    el.innerHTML = `
      <p class="crumb"><a href="#/">Sessions</a> → Read</p>
      <h1>Ecclesiastes ${chapter}</h1>

      ${translationPicker(list, state.translation)}

      <div class="toolbar">
        <span class="toolbar__label">Chapter</span>
        <div class="seg" role="group" aria-label="Chapter">
          ${Array.from({ length: 12 }, (_, i) => `
            <button type="button" data-chapter="${i + 1}" aria-pressed="${i + 1 === chapter}">${i + 1}</button>`).join('')}
        </div>
      </div>

      <p class="crumb">${esc(translation.name)} — ${esc(translation.blurb)}</p>
      <div class="scripture">${render(blocks, { hevel: store.get().highlightHevel })}</div>

      <div class="endcap">
        ${chapter > 1 ? `<a class="btn btn--ghost" href="#/read/${chapter - 1}">← Chapter ${chapter - 1}</a>` : '<span></span>'}
        ${chapter < 12 ? `<a class="btn" href="#/read/${chapter + 1}">Chapter ${chapter + 1} ${ICONS.arrow}</a>` : `<a class="btn" href="#/vapor">The vapor word ${ICONS.arrow}</a>`}
      </div>`;
  }

  await paint();

  wireVerseCompare(el);
  wireTranslationPicker(el, async (id) => { state.translation = id; await paint(); });
  el.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-chapter]');
    if (!button) return;
    location.hash = `#/read/${button.dataset.chapter}`;
  });

  return el;
}
