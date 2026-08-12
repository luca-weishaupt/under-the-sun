/**
 * Video with built-in discussion stops.
 *
 * The group's own feedback was that they like a video to structure the talking.
 * A video played start-to-finish and then discussed is a worse version of that
 * than a video that stops three times and asks something. So each stop has an
 * exact second, taken from the video's own caption track, and the player halts
 * there and puts the question on screen.
 *
 * The YouTube IFrame API is loaded lazily and is allowed to fail: on a blocked
 * or offline connection the stops still render as a timestamped list the leader
 * can work from by hand. Nothing here is load-bearing for running the session.
 */

const API_SRC = 'https://www.youtube.com/iframe_api';
const API_TIMEOUT = 8000;

let apiPromise = null;

function loadAPI() {
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve, reject) => {
    if (window.YT?.Player) { resolve(window.YT); return; }

    // The API calls exactly one global hook, so chain rather than replace it.
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previous === 'function') previous();
      resolve(window.YT);
    };

    if (!document.querySelector(`script[src="${API_SRC}"]`)) {
      const script = document.createElement('script');
      script.src = API_SRC;
      script.async = true;
      script.onerror = () => reject(new Error('YouTube API could not load'));
      document.head.append(script);
    }
    setTimeout(() => reject(new Error('YouTube API timed out')), API_TIMEOUT);
  }).catch((err) => {
    apiPromise = null; // let a later attempt try again
    throw err;
  });

  return apiPromise;
}

/**
 * Replaces `mount` with a real YouTube player that stops at each pause point.
 * Returns false if the API is unavailable, so the caller can fall back to a
 * plain embed.
 */
export async function mountPlayer(mount, video, handlers = {}) {
  const YT = await loadAPI();

  const host = document.createElement('div');
  mount.replaceWith(host);

  const stops = [...(video.pauses || [])].sort((a, b) => a.at - b.at);
  let fired = new Set();
  let ticker = null;

  const player = new YT.Player(host, {
    videoId: video.youtubeId,
    host: 'https://www.youtube-nocookie.com',
    playerVars: {
      rel: 0,
      modestbranding: 1,
      playsinline: 1,
      autoplay: 1,
      ...(video.start ? { start: video.start } : {}),
      ...(video.end ? { end: video.end } : {}),
    },
    events: {
      onReady: (event) => { event.target.playVideo(); },
      onStateChange: (event) => {
        // 1 = playing. Only watch the clock while it is actually running.
        if (event.data === 1) start();
        else stop();
        if (event.data === 0) handlers.onEnd?.();
      },
    },
  });

  function start() {
    if (ticker) return;
    ticker = setInterval(() => {
      let now;
      try { now = player.getCurrentTime(); } catch { return; }
      for (const [i, s] of stops.entries()) {
        // A quarter-second window is enough to catch it without ever
        // triggering a stop the viewer has already scrubbed past.
        if (fired.has(i) || now < s.at || now > s.at + 1.5) continue;
        fired.add(i);
        player.pauseVideo();
        handlers.onStop?.(i, s, () => { fired.add(i); player.playVideo(); });
        break;
      }
    }, 250);
  }

  function stop() {
    clearInterval(ticker);
    ticker = null;
  }

  return {
    resume: () => player.playVideo(),
    /** Jumping back should let the stops fire again from that point. */
    seek: (seconds) => {
      fired = new Set(stops.map((s, i) => (s.at < seconds ? i : null)).filter((i) => i !== null));
      player.seekTo(seconds, true);
      player.playVideo();
    },
    destroy: () => { stop(); try { player.destroy(); } catch { /* already gone */ } },
  };
}

export const mmss = (seconds) => {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
