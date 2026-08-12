# Under the Sun

A ten-week study of **Ecclesiastes** for high schoolers, plus the website that runs it.

**→ [Open the site](#putting-it-online)** · [Why this exists](#why-this-exists) · [For leaders](#if-youre-leading-a-session) · [For whoever maintains it](#maintaining-it)

---

## Why this exists

Most free material for 15–18 year olds is pitched several years below them, and they notice. The register that reliably loses them is adults on video trying to be relatable.

So this is the opposite: a real book of the Bible, read all the way through at adult level, with a short video each week and questions that have no predetermined right answer. Nothing in it is pitched at teenagers. Two of the twelve weeks are service rather than study, because at this age doing something often beats discussing something.

**Nothing suitable already existed.** BibleProject Classroom has no Ecclesiastes class. The Gospel Coalition and Crossway have an excellent 12-week Ecclesiastes study, but it is text-only, built around the ESV Study Bible, and copyright-locked — free to read and link to, not to copy. Ligonier's series is paywalled after lesson one. Everything genuinely aimed at teenagers is exactly what this group said they dislike. What does exist, free and verified, is good short video — so this study uses that as the spine and supplies the one thing nothing else provides at the right level: the questions.

## What's in it

**Twelve Sundays** — ten studies covering all 222 verses of Ecclesiastes, and two service Sundays.

| | Session | Passage |
|---|---|---|
| 1 | Everything Is Vapor | 1:1–11 |
| 2 | The Experiment | 1:12–2:26 |
| 3 | A Time for Everything | 3:1–22 |
| 4 | Nobody to Wipe Their Tears | 4:1–5:7 |
| 5 | *Serving Sunday* | — |
| 6 | Money Never Says Enough | 5:8–6:12 |
| 7 | Better to Go to a Funeral | 7:1–29 |
| 8 | The Same Fate for Everyone | 8:1–9:12 |
| 9 | *Serving Sunday* | — |
| 10 | Cast Your Bread on the Water | 9:13–11:6 |
| 11 | Remember Your Creator | 11:7–12:8 |
| 12 | So What Do I Do With This? | 12:9–14 |

Each session is one page holding the whole hour in order: an opening question, a short video, the passage with discussion prompts **built into the text where they land**, the harder questions, and one thing to take away. Leader notes are collapsed until you want them.

**The videos stop by themselves.** Every session's video has two or three built-in stops — it pauses partway through and puts a question on screen, then you hit resume. The timestamps were placed against each video's own caption track, so they land between sentences rather than mid-thought. If the player can't load, the stops are still listed underneath as timestamps you can pause on manually.

All ten videos are BibleProject, 4–8 minutes each, matched to the passage rather than to the book in general.

**Six translations, side by side.** Tap any verse to see it in all six at once. This is the feature people actually use — it is the fastest way to unstick a confusing line, and it quietly teaches that translation is interpretation.

**The vapor word.** Ecclesiastes turns on one Hebrew word, *hevel*, which literally means vapour — breath on a cold morning. It appears **38 times**, and the six bundled translations render it **28 different ways**, from "vanity" to "futile" to "to no purpose" to "hard to fathom." A few translators dissolve it into the sentence entirely. The whole set is on one page, which makes the central question of the book — is this "life is meaningless" or "life is like smoke"? — something the group can weigh for themselves rather than be told.

## If you're leading a session

You do not need to prepare a lesson. Read the passage once and be willing to let a question sit in the air longer than is comfortable.

- Open the session page and run it top to bottom. It is in the order you'll say it.
- **Before you meet**, each session shows its video with a direct link so you can download it in advance. Don't count on the WiFi in the room — and every session has a no-video path anyway.
- The site works **offline** once you've opened it once. Only the videos need a signal.
- **Print** lays out the whole hour, leader notes included.
- At the end, tap **Copy handoff message** and paste it wherever your leaders coordinate. It says what was covered and links the next leader straight to their session, which is the whole answer to "which one did you do last time?"

There is a fuller page of guidance at **Leading** in the site's menu.

## Putting it online

The site is plain HTML, CSS and JavaScript. There is no build step and no server.

1. Create a repository on GitHub and push this folder to it.
2. In the repository, go to **Settings → Pages**.
3. Under **Source**, choose **Deploy from a branch**, pick `main` and `/ (root)`, and save.
4. A minute later it is live at `https://<your-username>.github.io/<repo-name>/`.

Share that link. Anyone can use it — no account, no login, nothing to install. It also installs to a phone home screen as an app if you want it to.

To try it locally first:

```sh
npm start          # or: python3 -m http.server 8765
```

## Maintaining it

Everything is data. You do not need to touch the code to change the study.

| File | What it is |
|---|---|
| `data/sessions.json` | The entire curriculum — sessions, questions, videos, leader notes |
| `data/bible/*.json` | Ecclesiastes in six translations, generated |
| `data/hevel.json` | The vapor word study, generated |
| `assets/js/views/` | One file per screen |
| `tools/` | Generators and checks |

**After editing the curriculum, run the checks:**

```sh
npm test                 # passage engine + curriculum consistency
npm run check            # the above, plus verifies every video still exists
```

These catch the failures that would otherwise only appear in front of the group: a passage that renders empty, a discussion prompt anchored to a verse that isn't in the passage, a translation that disagrees with the others about verse numbering, or a video that has been taken down.

To regenerate the Bible text and word study from source:

```sh
npm run fetch
```

### Adding a session

Add an object to `sessions` in `data/sessions.json`. Steps are `open`, `watch`, `read`, `dig`, `land`, or `do`. On a `read` step, `passage` is a reference like `"3:1-8"` or `"11:7-12:8"`, and `interleave` places questions inside the text:

```json
{
  "kind": "read",
  "mins": 15,
  "passage": "3:1-22",
  "interleave": [
    { "after": "3:11", "asks": [{ "q": "…", "hint": "if it stalls…" }] }
  ]
}
```

Then run `npm test`. It will tell you if the reference is wrong.

## Credits and licences

Scripture comes from the [Free Use Bible API](https://bible.helloao.org) and is committed into this repository so the site works offline.

| Code | Translation | Licence |
|---|---|---|
| BSB | Berean Standard Bible | Public domain |
| WEB | World English Bible | Public domain |
| FBV | Free Bible Version | CC BY-SA 4.0 — © 2018 Dr. Jonathan Gallagher |
| LSV | Literal Standard Version | CC BY-SA 4.0 — © 2020 Covenant Press |
| BBE | Bible in Basic English | Public domain |
| KJV | King James Version | Public domain |

These six are the six **because they can legally be redistributed**, not because they are the best. The NIV, ESV, NLT, NASB and CSB are copyrighted. The NET Bible is free to read but its terms do not cover bundling the full text into a public repository, so it is not here either. Reading any of them in the YouVersion app or on Bible Gateway is completely fine.

Videos are embedded from BibleProject's own YouTube channel and are not re-hosted. Rights stay with them.

The sessions, questions and leader notes here are free for any group to use, adapt and republish. Nothing here copies copyrighted study material — where an existing study was good but not redistributable, it is linked rather than lifted.

If it's useful to you, take it.
