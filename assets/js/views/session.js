/**
 * The session runner — the page a leader has open while running the session.
 *
 * Written for the way small groups are usually staffed:
 *  - Leaders rotate and often have little notice. Everything needed to run the
 *    hour is on this one page, including what to say when nobody talks.
 *  - Continuity between leaders is the common failure, so finishing a session
 *    produces a handoff message to paste wherever the leaders coordinate.
 *  - Connectivity is not guaranteed; every video step has a no-video path.
 */

import { loadSessions, loadTranslation, translations } from '../data.js';
import { store } from '../store.js';
import { esc, ICONS, copyToClipboard, wireVerseCompare, translationPicker, wireTranslationPicker } from '../ui.js';
import { extract, render, formatRef } from '../scripture.js';

const STEP_LABEL = {
  open: 'Open', watch: 'Watch', read: 'Read',
  dig: 'Dig', land: 'Land', do: 'Do',
};

/* --- pieces --------------------------------------------------------------- */

function asksHTML(asks) {
  if (!asks?.length) return '';
  return `<div class="ask">
    ${asks.map((a) => `<p class="ask__q">${esc(a.q)}</p>`).join('')}
    ${asks.filter((a) => a.hint).map((a) => `
      <p class="ask__hint"><b>If it stalls</b><span>${esc(a.hint)}</span></p>`).join('')}
  </div>`;
}

function leaderHTML(text) {
  if (!text) return '';
  const body = Array.isArray(text) ? text : [text];
  return `<details class="lead">
    <summary>Leader note</summary>
    <div class="lead__body">${body.map((p) => `<p>${p}</p>`).join('')}</div>
  </details>`;
}

function videoHTML(video, index) {
  if (!video) return '';
  const { youtubeId, title, channel, duration, start, end } = video;
  const params = new URLSearchParams({ rel: '0', modestbranding: '1' });
  if (start) params.set('start', String(start));
  if (end) params.set('end', String(end));
  const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}?${params}&autoplay=1`;
  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeId)}${start ? `&t=${start}` : ''}`;
  const stops = video.pauses || [];

  return `<div class="video" data-video="${index}">
    <div class="video__frame">
      <button class="video__poster" type="button" data-embed="${esc(src)}" data-video-play="${index}" aria-label="Play ${esc(title)}">
        <img src="https://i.ytimg.com/vi/${encodeURIComponent(youtubeId)}/hqdefault.jpg" alt="" loading="lazy" onerror="this.style.display='none'">
        <span class="video__play">${ICONS.play}</span>
      </button>
    </div>
    <div class="video__meta">
      <strong>${esc(title)}</strong>
      <span>${esc(channel || '')}</span>
      ${duration ? `<span>${esc(duration)}</span>` : ''}
      <a href="${esc(watchUrl)}" target="_blank" rel="noopener">Open on YouTube ${ICONS.external}</a>
    </div>

    ${stops.length ? `
      <div class="stops" data-stops="${index}">
        <p class="stops__head">${stops.length} built-in stop${stops.length > 1 ? 's' : ''} — the video pauses on its own and the question comes up here.</p>
        <ol class="stops__list">
          ${stops.map((s, i) => `
            <li class="stop" data-stop="${i}">
              <button class="stop__time" type="button" data-seek="${s.at}" title="Jump here">${esc(s.atLabel || '')}</button>
              <div class="stop__body">
                <p class="stop__q">${esc(s.q)}</p>
                ${s.hint ? `<p class="ask__hint"><b>If it stalls</b><span>${esc(s.hint)}</span></p>` : ''}
                <button class="btn btn--sm stop__resume" type="button" data-resume hidden>Resume video ${ICONS.arrow}</button>
              </div>
            </li>`).join('')}
        </ol>
      </div>` : ''}
  </div>`;
}

async function readStepHTML(step, translationId, list) {
  const translation = await loadTranslation(translationId);
  const blocks = extract(translation, step.passage);

  // Discussion prompts are interleaved into the passage rather than listed at
  // the end, so the reading stays a conversation instead of becoming a quiz.
  const stops = new Map((step.interleave || []).map((s) => [String(s.after), s.asks]));
  const chunks = [];
  let run = [];

  const flush = () => {
    if (!run.length) return;
    chunks.push(`<div class="scripture">${render(run, { hevel: store.get().highlightHevel })}</div>`);
    run = [];
  };

  for (const block of blocks) {
    run.push(block);
    if (block.t === 'v') {
      const key = `${block.c}:${block.n}`;
      if (stops.has(key)) { flush(); chunks.push(asksHTML(stops.get(key))); }
    }
  }
  flush();

  return `
    ${translationPicker(list, translationId)}
    <p class="crumb">${esc(formatRef(step.passage))} · ${esc(translation.name)}</p>
    ${chunks.join('\n')}`;
}

async function stepHTML(step, index, ctx) {
  const parts = [];
  parts.push(`<div class="step__head">
      <span class="step__kicker">${esc(STEP_LABEL[step.kind] || step.kind)}</span>
      <span class="step__mins">${step.mins} min</span>
    </div>`);
  if (step.title) parts.push(`<h2 class="step__title">${esc(step.title)}</h2>`);
  if (step.body?.length) parts.push(`<div class="prose">${step.body.map((p) => `<p>${p}</p>`).join('')}</div>`);
  if (step.video) parts.push(videoHTML(step.video, index));
  if (step.noVideo) parts.push(`<div class="note"><strong>No video today?</strong> ${step.noVideo}</div>`);
  if (step.kind === 'read' && step.passage) {
    parts.push(`<div data-read="${index}">${await readStepHTML(step, ctx.translationId, ctx.list)}</div>`);
  }
  if (step.asks?.length) parts.push(asksHTML(step.asks));
  if (step.leader) parts.push(leaderHTML(step.leader));

  return `<section class="step" id="step-${index}" data-step="${index}">${parts.join('\n')}</section>`;
}

/**
 * The night-before checklist.
 *
 * Downloading the video in advance is the reliable move when the room's WiFi
 * is not dependable. This surfaces exactly what to grab, with the link, so
 * that takes thirty seconds instead of a hunt.
 */
function beforeSundayHTML(session) {
  const videos = session.steps.filter((s) => s.video).map((s) => s.video);
  if (!videos.length) return '';

  return `<div class="note" style="border-color:var(--accent-line)">
    <strong>Before you meet.</strong> If you want the video to work for certain, don't rely on
    the WiFi in the room — open ${videos.length > 1 ? 'these' : 'it'} beforehand and download
    ${videos.length > 1 ? 'them' : 'it'} in the YouTube app:
    <ul style="margin:.55rem 0 .3rem;padding-inline-start:1.1rem">
      ${videos.map((v) => `<li style="margin-block:.25rem">
        <a href="https://www.youtube.com/watch?v=${esc(v.youtubeId)}" target="_blank" rel="noopener">${esc(v.title)}</a>
        — ${esc(v.channel || '')}${v.duration ? `, ${esc(v.duration)}` : ''}
      </li>`).join('')}
    </ul>
    Every session also has a no-video path, so a dead connection never ends the hour.
  </div>`;
}

/* --- handoff -------------------------------------------------------------- */

function handoffMessage(data, current, next) {
  const base = location.href.split('#')[0];
  const lines = [
    `Youth today: Session ${current.id} — ${current.title} (${formatRef(current.ref)}).`,
  ];
  if (next) {
    lines.push('', `Next time: Session ${next.id} — ${next.title}${next.ref ? ` (${formatRef(next.ref)})` : ''}.`);
    lines.push(`Everything you need: ${base}#/s/${next.id}`);
  } else {
    lines.push('', `That was the last session in the series. ${base}`);
  }
  return lines.join('\n');
}

/* --- view ----------------------------------------------------------------- */

export async function session(id) {
  const [data, list] = await Promise.all([loadSessions(), translations()]);
  const index = data.sessions.findIndex((s) => s.id === id);
  if (index === -1) throw new Error(`There is no session ${id}.`);

  const current = data.sessions[index];
  const next = data.sessions[index + 1];
  const prev = data.sessions[index - 1];
  const translationId = store.get().translation;
  const ctx = { translationId, list };

  const steps = [];
  for (const [i, step] of current.steps.entries()) steps.push(await stepHTML(step, i, ctx));

  const total = current.steps.reduce((sum, s) => sum + (s.mins || 0), 0);
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="runbar">
      <div class="runbar__inner">
        <span class="runbar__label">Session ${current.id} · ${esc(formatRef(current.ref))}</span>
        <button class="clock" type="button" data-clock data-total="${total}" title="Start / pause the clock">▶ ${total}:00</button>
        <div class="runbar__steps">
          ${current.steps.map((s, i) => `<button type="button" data-goto="${i}" title="${esc(STEP_LABEL[s.kind] || s.kind)} — ${s.mins} min" aria-current="false"><span class="visually-hidden">${esc(STEP_LABEL[s.kind])}</span></button>`).join('')}
        </div>
      </div>
    </div>

    <div class="wrap wrap--session">
     <div class="sesh">
      <div class="sesh__main">
        <p class="crumb"><a href="#/">Sessions</a> → Session ${current.id}</p>
        <h1>${esc(current.title)}</h1>
        <p class="lede">${esc(current.summary)}</p>
        <p class="hero__ref" style="margin-top:.75rem">${esc(formatRef(current.ref))} · about ${total} minutes</p>

        ${beforeSundayHTML(current)}

        ${current.prep ? `<details class="lead" open><summary>Before you start — 3 minute prep</summary><div class="lead__body">${current.prep.map((p) => `<p>${p}</p>`).join('')}</div></details>` : ''}

        ${steps.join('\n')}

        <div class="handoff">
          <h3>Finish up</h3>
          <p>Mark it done and post the handoff wherever your leaders coordinate, so whoever has next week doesn’t have to ask.</p>
          <pre class="handoff__preview" data-handoff-preview></pre>
          <div class="btnrow">
            <button class="btn btn--primary" type="button" data-copy-handoff>${ICONS.copy}<span>Copy handoff message</span></button>
            <button class="btn" type="button" data-toggle-done>${store.isDone(current.id) ? `${ICONS.check}<span>Done</span>` : '<span>Mark complete</span>'}</button>
            <button class="btn btn--ghost" type="button" data-print>${ICONS.print}<span>Print</span></button>
          </div>
        </div>

        <div class="endcap">
          ${prev ? `<a class="btn btn--ghost" href="#/s/${prev.id}">← ${esc(prev.title)}</a>` : '<span></span>'}
          ${next ? `<a class="btn" href="#/s/${next.id}">${esc(next.title)} ${ICONS.arrow}</a>` : '<a class="btn" href="#/">Back to sessions</a>'}
        </div>
      </div>

      <aside class="sesh__rail" aria-label="Session progress">
        <div class="rail">
          <div class="rail__clock">
            <button class="clock clock--lg" type="button" data-clock data-total="${total}" title="Start / pause the clock">▶ ${total}:00</button>
            <span class="rail__budget">of ${total} min</span>
          </div>
          <ol class="rail__steps">
            ${current.steps.map((s, i) => `
              <li>
                <button type="button" data-goto="${i}" aria-current="false">
                  <span class="rail__kind">${esc(STEP_LABEL[s.kind] || s.kind)}</span>
                  <span class="rail__name">${esc(s.title || '')}</span>
                  <span class="rail__mins">${s.mins}′</span>
                </button>
              </li>`).join('')}
          </ol>
        </div>
      </aside>
     </div>
    </div>`;

  /* --- behaviour ---------------------------------------------------------- */

  wireVerseCompare(el);

  wireTranslationPicker(el, async (nextId) => {
    ctx.translationId = nextId;
    for (const [i, step] of current.steps.entries()) {
      if (step.kind !== 'read' || !step.passage) continue;
      const host = el.querySelector(`[data-read="${i}"]`);
      if (host) host.innerHTML = await readStepHTML(step, nextId, list);
    }
  });

  wireVideos(el, current);

  const preview = el.querySelector('[data-handoff-preview]');
  const message = handoffMessage(data, current, next);
  preview.textContent = message;

  el.querySelector('[data-copy-handoff]').addEventListener('click', (event) => {
    copyToClipboard(message, event.currentTarget);
    if (!store.isDone(current.id)) store.toggleDone(current.id);
    const doneBtn = el.querySelector('[data-toggle-done]');
    doneBtn.innerHTML = `${ICONS.check}<span>Done</span>`;
  });

  el.querySelector('[data-toggle-done]').addEventListener('click', (event) => {
    store.toggleDone(current.id);
    event.currentTarget.innerHTML = store.isDone(current.id)
      ? `${ICONS.check}<span>Done</span>` : '<span>Mark complete</span>';
  });

  el.querySelector('[data-print]').addEventListener('click', () => {
    el.querySelectorAll('.lead').forEach((d) => d.setAttribute('open', ''));
    print();
  });

  wireClock([...el.querySelectorAll('[data-clock]')]);
  wireStepTracking(el);

  return el;
}

/**
 * Click-to-play, so YouTube is not contacted until someone wants it.
 *
 * When a video has stops we try the IFrame API, which lets us actually halt
 * playback at each one. When that is unavailable — offline, blocked, or the
 * script simply did not arrive — we drop to a plain embed and the stops stay
 * on the page as timestamps the leader can pause on manually.
 */
function wireVideos(el, session) {
  const players = new Map();

  el.addEventListener('click', async (event) => {
    const seek = event.target.closest('[data-seek]');
    if (seek) {
      const index = Number(seek.closest('[data-stops]').dataset.stops);
      players.get(index)?.seek(Number(seek.dataset.seek));
      return;
    }

    const resume = event.target.closest('[data-resume]');
    if (resume) {
      const index = Number(resume.closest('[data-stops]').dataset.stops);
      players.get(index)?.resume();
      resume.hidden = true;
      resume.closest('.stop')?.removeAttribute('data-active');
      return;
    }

    const poster = event.target.closest('[data-video-play]');
    if (!poster) return;

    const index = Number(poster.dataset.videoPlay);
    const video = session.steps[index]?.video;
    const stopsEl = el.querySelector(`[data-stops="${index}"]`);

    const plainEmbed = () => {
      const iframe = document.createElement('iframe');
      iframe.src = poster.dataset.embed;
      iframe.allow = 'accelerometer; autoplay; encrypted-media; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.title = poster.getAttribute('aria-label') || 'Video';
      poster.replaceWith(iframe);
    };

    if (!video?.pauses?.length) { plainEmbed(); return; }

    poster.disabled = true;
    try {
      const { mountPlayer } = await import('../player.js');
      const player = await mountPlayer(poster, video, {
        onStop: (i) => {
          const stop = stopsEl?.querySelector(`[data-stop="${i}"]`);
          if (!stop) return;
          stopsEl.querySelectorAll('[data-active]').forEach((n) => n.removeAttribute('data-active'));
          stop.setAttribute('data-active', '');
          stop.querySelector('[data-resume]').hidden = false;
          stop.scrollIntoView({ behavior: 'smooth', block: 'center' });
        },
        onEnd: () => {
          stopsEl?.querySelectorAll('[data-active]').forEach((n) => n.removeAttribute('data-active'));
        },
      });
      players.set(index, player);
      stopsEl?.setAttribute('data-live', 'true');
    } catch {
      // No API: the timestamps below the video are still perfectly usable.
      poster.disabled = false;
      plainEmbed();
    }
  });
}

/**
 * A plain elapsed clock, turning amber once the session runs past its budget.
 * There are two of these on screen — the mobile bar and the desktop rail — and
 * they share one timer so they can never disagree.
 */
function wireClock(buttons) {
  if (!buttons.length) return;
  const total = Number(buttons[0].dataset.total) * 60;
  let elapsed = 0;
  let timer = null;

  const paint = () => {
    const left = total - elapsed;
    const sign = left < 0 ? '−' : '';
    const abs = Math.abs(left);
    const mm = String(Math.floor(abs / 60)).padStart(2, '0');
    const ss = String(abs % 60).padStart(2, '0');
    for (const b of buttons) {
      b.textContent = `${timer ? '❙❙' : '▶'} ${sign}${mm}:${ss}`;
      b.dataset.over = String(left < 0);
    }
  };

  const toggle = () => {
    if (timer) { clearInterval(timer); timer = null; }
    else timer = setInterval(() => { elapsed++; paint(); }, 1000);
    paint();
  };

  for (const b of buttons) b.addEventListener('click', toggle);
  paint();
}

/**
 * Highlights the step you are looking at, in both the mobile dot bar and the
 * desktop rail, and lets either one jump between steps.
 */
function wireStepTracking(el) {
  const steps = [...el.querySelectorAll('[data-step]')];
  // Group the two navigators separately so their indexes stay independent.
  const navs = [...el.querySelectorAll('.runbar__steps, .rail__steps')]
    .map((nav) => [...nav.querySelectorAll('[data-goto]')]);

  for (const nav of navs) {
    nav.forEach((button, i) => button.addEventListener('click', () => {
      steps[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
  }

  if (!('IntersectionObserver' in window)) return;
  const visible = new Set();
  let last = 0;
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const i = Number(entry.target.dataset.step);
      if (entry.isIntersecting) visible.add(i); else visible.delete(i);
    }
    // Between steps nothing is intersecting, so hold the last known position
    // rather than snapping back to the top of the session.
    if (visible.size) last = Math.min(...visible);
    for (const nav of navs) {
      nav.forEach((button, i) => {
        button.setAttribute('aria-current', String(i === last));
        button.dataset.passed = String(i < last);
      });
    }
  }, { rootMargin: '-25% 0px -55% 0px' });

  steps.forEach((s) => observer.observe(s));
}
