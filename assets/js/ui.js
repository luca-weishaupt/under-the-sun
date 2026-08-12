/** Shared UI helpers: escaping, icons, clipboard, and the verse-compare panel. */

import { loadTranslation, translations } from './data.js';
import { store } from './store.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]
));

export const ICONS = {
  play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.2v13.6a1 1 0 0 0 1.53.85l10.5-6.8a1 1 0 0 0 0-1.7L9.53 4.35A1 1 0 0 0 8 5.2Z"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5 9.5 18 20 6.5"/></svg>',
  print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 9V3h10v6M7 19H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="7" y="15" width="10" height="6"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>',
  external: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-8.5 8.5"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
};

/** Copies text and briefly confirms on the button that triggered it. */
export async function copyToClipboard(text, button) {
  const done = (ok) => {
    if (!button) return;
    const original = button.innerHTML;
    button.innerHTML = ok ? `${ICONS.check}<span>Copied</span>` : '<span>Press ⌘C</span>';
    button.disabled = true;
    setTimeout(() => { button.innerHTML = original; button.disabled = false; }, 1800);
  };
  try {
    await navigator.clipboard.writeText(text);
    done(true);
  } catch {
    // Clipboard API needs a secure context; fall back to a selection.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.append(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { /* nothing more to try */ }
    ta.remove();
    done(ok);
  }
}

/* --- verse compare -------------------------------------------------------- */

let compareCache = null;

/**
 * Wires up "tap a verse to see all six translations" inside a container.
 * This is the feature that makes translation choice feel like a question
 * worth asking rather than a setting buried in a menu.
 */
export function wireVerseCompare(root) {
  root.addEventListener('click', async (event) => {
    const button = event.target.closest('.sc-v[data-ref]');
    if (!button || !root.contains(button)) return;

    const existing = button.nextElementSibling;
    if (existing?.classList.contains('compare')) {
      existing.remove();
      button.setAttribute('aria-expanded', 'false');
      return;
    }
    // Only one panel open at a time keeps the reading column calm.
    root.querySelectorAll('.compare').forEach((el) => el.remove());
    root.querySelectorAll('.sc-v[aria-expanded="true"]').forEach((el) => el.setAttribute('aria-expanded', 'false'));

    button.setAttribute('aria-expanded', 'true');
    const panel = document.createElement('div');
    panel.className = 'compare';
    panel.innerHTML = '<div class="compare__head">Loading…</div>';
    button.after(panel);

    const [c, v] = button.dataset.ref.split(':').map(Number);
    compareCache ||= await translations();
    const loaded = await Promise.all(
      compareCache.map(async (t) => [t, await loadTranslation(t.id)]),
    );

    const rows = loaded.map(([meta, data]) => {
      const verse = (data.chapters[c] || []).find((b) => b.t === 'v' && b.n === v);
      const text = verse ? verse.lines.map((l) => l.text).join(' ') : '—';
      return `<dt>${esc(meta.id)}</dt><dd>${esc(text)}</dd>`;
    }).join('');

    const notes = loaded.flatMap(([meta, data]) => {
      const verse = (data.chapters[c] || []).find((b) => b.t === 'v' && b.n === v);
      return (verse?.notes || []).map((n) => `<strong>${esc(meta.id)}:</strong> ${esc(n)}`);
    });

    panel.innerHTML = `
      <div class="compare__head">Ecclesiastes ${c}:${v} — six translations</div>
      <dl>${rows}</dl>
      ${notes.length ? `<div class="compare__note">${notes.join('<br>')}</div>` : ''}
    `;
  });
}

/* --- translation picker --------------------------------------------------- */

export function translationPicker(list, current) {
  return `
    <div class="toolbar">
      <span class="toolbar__label">Translation</span>
      <div class="seg" role="group" aria-label="Bible translation">
        ${list.map((t) => `
          <button type="button" data-translation="${esc(t.id)}"
            aria-pressed="${t.id === current}" title="${esc(t.name)} — ${esc(t.blurb)}">${esc(t.id)}</button>
        `).join('')}
      </div>
      <span class="toolbar__label" style="text-transform:none;letter-spacing:0;font-weight:400;color:var(--ink-faint)">
        Tap any verse to see all six.
      </span>
    </div>`;
}

/** Delegated handler for the picker; calls back after saving the choice. */
export function wireTranslationPicker(root, onChange) {
  root.addEventListener('click', (event) => {
    const button = event.target.closest('[data-translation]');
    if (!button) return;
    store.set({ translation: button.dataset.translation });
    onChange(button.dataset.translation);
  });
}
