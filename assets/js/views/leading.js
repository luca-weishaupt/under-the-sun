/**
 * How to lead one of these. Written for whoever has this week, reading it on
 * their phone shortly before it starts.
 */

import { esc, ICONS } from '../ui.js';

export async function leading() {
  const el = document.createElement('div');
  el.className = 'wrap wrap--narrow';
  el.innerHTML = `
    <p class="crumb"><a href="#/">Sessions</a> → Leading</p>
    <h1>Leading a session</h1>
    <p class="lede">
      You do not need to prepare a lesson. You need to have read the passage once and be
      willing to let a question sit in the air for longer than is comfortable. That is the job.
    </p>

    <div class="note">
      <strong>Leading in an hour and haven’t looked at it?</strong> Open the session, read the
      passage once, and read the <b>Before you start</b> box. Then run the page top to bottom.
      Everything is in the order you will say it.
    </div>

    <h2 style="margin-top:2.5rem">The shape of every session</h2>
    <div class="tablewrap">
      <table class="plain">
        <thead><tr><th>Step</th><th>Roughly</th><th>What happens</th></tr></thead>
        <tbody>
          <tr><td><b>Open</b></td><td>5 min</td><td>One question, no Bible yet. Gets everyone talking before anything is at stake.</td></tr>
          <tr><td><b>Watch</b></td><td>11–18 min</td><td>A short video that stops itself two or three times to ask something. The video does the explaining so you don’t have to.</td></tr>
          <tr><td><b>Read</b></td><td>10–15 min</td><td>Read the passage out loud, taking turns. Questions are built into the text where they land.</td></tr>
          <tr><td><b>Dig</b></td><td>8–15 min</td><td>Two or three real questions with no settled answer. Shorter than it looks, because a lot of the talking already happened at the video stops.</td></tr>
          <tr><td><b>Land</b></td><td>5 min</td><td>One sentence to take away. Not a summary — a thing to notice this week.</td></tr>
        </tbody>
      </table>
    </div>

    <h2 style="margin-top:2.5rem">Five assumptions this series makes</h2>
    <div class="prose">
      <p><b>Older teenagers would rather be treated like adults.</b> So this reads a real book of the
      Bible at adult level, and the questions have no predetermined right answer.</p>
      <p><b>Youth-targeted material tends to backfire at this age.</b> The thing that reliably kills
      credibility is adults on video trying to be relatable. Nothing in this series does that. If a
      video starts to, skip it — the passage is the point, not the video.</p>
      <p><b>Video gives the hour a spine.</b> It gives the group something to react to rather than
      being asked cold what they think. So every video in this series has
      <b>two or three built-in stops</b>: it pauses itself partway through and puts a question on
      screen. That is deliberate — a video watched straight through and then discussed is a weaker
      version of the same thing. If the automatic pause doesn't work, the timestamps are listed
      under the video and you can pause it yourself.</p>
      <p><b>Autonomy does a lot of work.</b> Sessions go better when the group gets a real choice in
      them — which translation, which question to chase. Where a session offers one, let them make it.</p>
      <p><b>Doing something beats discussing something, about once a month.</b> Two of the twelve
      weeks are service instead of study. They are marked in the series and are not a lesser week.</p>
    </div>

    <h2 style="margin-top:2.5rem">When nobody says anything</h2>
    <div class="prose">
      <p><b>Wait longer than feels reasonable.</b> This is the single highest-leverage thing you can do.
      Leaders naturally wait about a second before filling a silence; research on classroom “wait time”
      going back to Mary Budd Rowe found that stretching it to three to five seconds dramatically
      lengthens what students say and pulls in the quiet ones specifically. Count to five. It will feel
      like a minute. Do it anyway.</p>
      <p><b>Have one deflection ready.</b> Alpha trains its hosts to answer almost everything with
      “what does anyone else think?” It is unglamorous and it works, because it keeps you a host
      rather than a teacher.</p>
      <p><b>Never ask a question you already know the answer to.</b> They can tell instantly, and it
      turns a conversation into a quiz they can fail. Every question in these sessions is one you can
      honestly say “I don’t know” to.</p>
      <p><b>Go second.</b> If you answer first, that becomes the correct answer and everyone else edits
      themselves. Ask, wait, and let someone else start.</p>
      <p><b>Let a wrong answer stand.</b> Ecclesiastes says genuinely uncomfortable things. If someone
      says “this sounds depressing” — yes, that is what it says. Sit in it. The book does.</p>
      <p><b>If it is truly flat</b>, go to the passage: “Read verse 3 again. What is odd about it?”
      Text-anchored questions are easier to answer than opinion questions.</p>
      <p><b>Watch for the two failure modes</b> Alpha names in its own host training: leaders talking
      too much, and one person dominating. Both are fixable in the moment by asking someone else
      directly and then waiting.</p>
    </div>

    <h2 style="margin-top:2.5rem">What “cringe” actually means</h2>
    <div class="prose">
      <p>It is worth being precise, because “don’t be cringe” is not actionable. The register to avoid
      is what sociologist Christian Smith found teenagers had absorbed as the actual religion of
      American youth ministry — that God mainly wants people to be nice, and that the goal of life is
      to feel good about yourself. Teenagers spot that immediately and correctly file it as
      not-serious. Ecclesiastes is the perfect antidote: it is a book that refuses to be nice about
      anything.</p>
      <p>The other half is silence. Barna found around a third of young people say Christians are too
      confident they know all the answers, and a similar share say they could not raise their most
      pressing questions at church. Fuller Youth Institute’s version of the finding is blunter: it is
      not doubt that damages faith, it is silence. Which means a session where someone says something
      genuinely doubting, and it is taken seriously rather than fixed, is a good session — not a
      failed one.</p>
    </div>

    <h2 style="margin-top:2.5rem">Practical bits</h2>
    <div class="prose">
      <p><b>Before you leave home</b>, if you want the video guaranteed, open it on YouTube and
      download it there. Do not count on the WiFi where you meet.</p>
      <p><b>This site works offline</b> once you have opened it once — the Bible text and all the
      sessions are stored on your device. Only the videos need a signal.</p>
      <p><b>Want it on paper?</b> Every session has a Print button that lays out the whole hour,
      leader notes included, on a couple of sheets.</p>
      <p><b>Tap any verse</b> to see it in all six translations at once. It is the fastest way to
      unstick a confusing line, and the group tends to find it genuinely interesting.</p>
    </div>

    <h2 style="margin-top:2.5rem">At the end, post the handoff</h2>
    <div class="prose">
      <p>At the bottom of each session there is a <b>Copy handoff message</b> button. Tap it, paste
      it wherever your leaders coordinate, done. It says which session was covered and links whoever
      has next week straight to theirs.</p>
      <p>It takes five seconds, and it is the whole answer to “which one did you do last time?”</p>
    </div>

    <div class="endcap">
      <a class="btn btn--ghost" href="#/vapor">The vapor word</a>
      <a class="btn" href="#/">Back to the sessions ${ICONS.arrow}</a>
    </div>`;
  return el;
}
