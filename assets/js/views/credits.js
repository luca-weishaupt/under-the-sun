/** Where the text comes from and what each licence asks of us. */

import { loadBibleIndex } from '../data.js';
import { esc } from '../ui.js';

export async function credits() {
  const index = await loadBibleIndex();

  const el = document.createElement('div');
  el.className = 'wrap wrap--narrow';
  el.innerHTML = `
    <p class="crumb"><a href="#/">Sessions</a> → Credits</p>
    <h1>Credits &amp; licences</h1>
    <p class="lede">
      Every translation here is one that may legally be copied and republished. That is the
      whole reason these six are the six — not a judgement about which is best.
    </p>

    <h2 style="margin-top:2.5rem">Scripture</h2>
    <p class="prose">
      Text retrieved from the <a href="https://bible.helloao.org" target="_blank" rel="noopener">Free Use Bible API</a>
      and committed into this repository, so the site keeps working without a connection.
    </p>
    <div class="tablewrap">
      <table class="plain">
        <thead><tr><th>Code</th><th>Translation</th><th>Character</th><th>Licence</th></tr></thead>
        <tbody>
          ${index.translations.map((t) => `
            <tr>
              <td><b>${esc(t.id)}</b></td>
              <td>${t.licenseUrl ? `<a href="${esc(t.licenseUrl)}" target="_blank" rel="noopener">${esc(t.name)}</a>` : esc(t.name)}</td>
              <td>${esc(t.blurb)}</td>
              <td>${esc(t.license || '')}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <p class="crumb">
      FBV and LSV are shared under CC BY-SA 4.0, which is why those two files carry their
      copyright line above. The other four are public domain.
    </p>

    <div class="note">
      <strong>Why not the NIV, ESV, or the NET?</strong> The NIV, ESV, NLT, NASB and CSB are
      copyrighted and cannot be republished on a public site. The NET is free to <i>read</i> but its
      terms do not cover bundling the full text into a public repository, so it is deliberately not
      here either. Reading any of them in the YouVersion app or on Bible Gateway is completely fine —
      copying them into this site is what would not be.
    </div>

    <h2 style="margin-top:2.5rem">Video</h2>
    <p class="prose">
      Videos are embedded from their publishers’ own YouTube channels and are not
      re-hosted here. Rights stay with them; please keep it that way if you fork this.
    </p>

    <h2 style="margin-top:2.5rem">Everything else</h2>
    <p class="prose">
      The sessions, discussion questions and leader notes in this site were written for
      one small high school group and are free for any other group to use, adapt, and
      republish. If it is useful to you, take it.
    </p>
    <p class="prose" style="margin-top:1rem">
      Nothing here reproduces copyrighted study material. Where an existing study was
      genuinely good but not redistributable, it is linked rather than copied.
    </p>`;
  return el;
}
