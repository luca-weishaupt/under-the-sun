/**
 * Small localStorage-backed store. Everything is per-device by design —
 * the shared, cross-leader source of truth is the handoff message posted to
 * the group chat, not this.
 */

const KEY = 'underthesun.v1';

const DEFAULTS = {
  translation: 'BSB',
  theme: null,          // null = follow the OS
  done: [],             // session ids marked complete on this device
  leaderNotes: true,    // show leader-only notes
  highlightHevel: true, // underline every occurrence of the vapor word
};

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

let state = read();
const listeners = new Set();

function write() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private browsing — the app still works, it just forgets */
  }
  for (const fn of listeners) fn(state);
}

export const store = {
  get: () => state,
  set(patch) {
    state = { ...state, ...patch };
    write();
  },
  toggleDone(id) {
    const done = new Set(state.done);
    done.has(id) ? done.delete(id) : done.add(id);
    state = { ...state, done: [...done].sort((a, b) => a - b) };
    write();
  },
  isDone: (id) => state.done.includes(id),
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

/* --- theme ---------------------------------------------------------------- */

export function applyTheme() {
  const { theme } = store.get();
  const root = document.documentElement;
  if (theme) root.setAttribute('data-theme', theme);
  else root.removeAttribute('data-theme');
}

export function cycleTheme() {
  const order = [null, 'light', 'dark'];
  const next = order[(order.indexOf(store.get().theme) + 1) % order.length];
  store.set({ theme: next });
  applyTheme();
  return next;
}
