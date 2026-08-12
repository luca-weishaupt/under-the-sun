/** Router and boot. Hash routing so the site works on GitHub Pages with no config. */

import { applyTheme, cycleTheme } from './store.js';
import { esc } from './ui.js';

import { home } from './views/home.js';
import { session } from './views/session.js';
import { read } from './views/read.js';
import { vapor } from './views/vapor.js';
import { leading } from './views/leading.js';
import { credits } from './views/credits.js';

applyTheme();

const main = document.querySelector('#main');

const ROUTES = [
  [/^\/?$/,               () => home()],
  [/^\/s\/(\d+)$/,        (m) => session(Number(m[1]))],
  [/^\/read\/?(.*)$/,     (m) => read(decodeURIComponent(m[1] || ''))],
  [/^\/vapor$/,           () => vapor()],
  [/^\/leading$/,         () => leading()],
  [/^\/credits$/,         () => credits()],
];

function currentPath() {
  return (location.hash.replace(/^#/, '') || '/').split('?')[0];
}

let renderToken = 0;

async function route() {
  const token = ++renderToken;
  const path = currentPath();

  for (const [pattern, view] of ROUTES) {
    const match = path.match(pattern);
    if (!match) continue;

    main.innerHTML = '<div class="wrap"><p class="loading">Loading…</p></div>';
    try {
      const node = await view(match);
      if (token !== renderToken) return; // a newer navigation won
      main.replaceChildren(node);
    } catch (err) {
      if (token !== renderToken) return;
      main.innerHTML = `
        <div class="wrap wrap--narrow">
          <h1>Something didn’t load</h1>
          <p class="lede">${esc(err.message)}</p>
          <div class="note">If you are offline, open a session you have visited before — those are cached.
          Otherwise a refresh usually sorts it.</div>
          <p style="margin-top:1.5rem"><a class="btn" href="#/">Back to the sessions</a></p>
        </div>`;
      console.error(err);
    }
    syncNav(path);
    // A fresh view starts at the top unless the URL asked for an anchor.
    if (!location.hash.includes('#', 1)) window.scrollTo({ top: 0, behavior: 'instant' });
    main.focus({ preventScroll: true });
    return;
  }

  main.innerHTML = `
    <div class="wrap wrap--narrow">
      <h1>Not found</h1>
      <p class="lede">There’s no page at <code>${esc(path)}</code>.</p>
      <p style="margin-top:1.5rem"><a class="btn" href="#/">Back to the sessions</a></p>
    </div>`;
  syncNav(path);
}

function syncNav(path) {
  for (const link of document.querySelectorAll('.topbar__nav a')) {
    const target = link.getAttribute('href').replace(/^#/, '');
    const active = target === '/' ? path === '/' : path.startsWith(target);
    link.toggleAttribute('aria-current', active);
    if (active) link.setAttribute('aria-current', 'page');
  }
}

document.querySelector('#theme-toggle').addEventListener('click', (event) => {
  const next = cycleTheme();
  event.currentTarget.title = next ? `Theme: ${next}` : 'Theme: match system';
});

addEventListener('hashchange', route);
route();

// Offline support matters here: the room you meet in may not have usable WiFi.
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  addEventListener('load', () => {
    navigator.serviceWorker.register(new URL('../../sw.js', import.meta.url)).catch(() => {});
  });
}
