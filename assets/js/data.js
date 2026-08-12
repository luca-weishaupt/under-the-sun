/**
 * Static JSON loading with an in-memory cache. Everything here is a file in
 * the repo — there is no API, no key, and nothing to go down on a Sunday
 * morning once the page has been opened one time.
 */

const cache = new Map();

/** Resolves paths against the app root, so this works on GitHub Pages subpaths. */
const BASE = new URL('../../', import.meta.url);

export function load(path) {
  if (!cache.has(path)) {
    cache.set(path, fetch(new URL(path, BASE)).then((res) => {
      if (!res.ok) throw new Error(`Could not load ${path} (${res.status})`);
      return res.json();
    }).catch((err) => {
      cache.delete(path); // let a later attempt retry rather than cache the failure
      throw err;
    }));
  }
  return cache.get(path);
}

export const loadSessions = () => load('data/sessions.json');
export const loadBibleIndex = () => load('data/bible/index.json');
export const loadHevel = () => load('data/hevel.json');
export const loadTranslation = (id) => load(`data/bible/${id}.json`);

/** The translations offered in the picker, in display order. */
export async function translations() {
  const index = await loadBibleIndex();
  return index.translations;
}
