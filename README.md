# Sriyansh & Shrishti - editable wedding invitation

Complete source from website version 28, including all illustrations and the uploaded MP3. The `dist/` files are unchanged. Editing this copy does not automatically update the live website.

## Start here

1. Extract the ZIP completely.
2. Open the `sriyansh-shrishti-website` folder in VS Code.
3. With the Live Server extension installed, right-click `dist/index.html` and choose **Open with Live Server**.
4. Tap the envelope to open the invitation and start the music.

Alternatively, with Python 3 installed, run this in the extracted folder:

```sh
python -m http.server 8000 --directory dist
```

On Windows, if `python` is unavailable, use `py -m http.server 8000 --directory dist`.

Open http://localhost:8000. Stop the server with Ctrl+C. Use a local server instead of double-clicking `index.html`: browsers may block the JavaScript modules under `file://`.

There is no framework, build step, database, custom backend, API key, or required npm installation for previewing or hosting.

## Files to edit

| File | What it controls |
| --- | --- |
| `dist/index.html` | Names, wording, dates, event order, SVG headings, map and audio references |
| `dist/style.css` | Fonts, colours, layout, mobile styling and animation timing |
| `dist/script.js` | Envelope, scratch interaction, petals, confetti, names reveal and music |
| `dist/invitation-core.mjs` | Countdown target, date calculations and 70% scratch threshold |
| `dist/assets/` | All illustrations, decorative SVGs and `wedding-music.mp3` |
| `dist/favicon.svg` | Browser-tab icon |
| `tests/` | Calculation and interaction tests |
| `package.json` | Optional test commands and the canvas test dependency |
| `SOURCE_VERSION.txt` | Exact website version and source commit |

All artwork is included, including earlier variants retained in the original source. Some illustrations are CSS backgrounds. Check current HTML/CSS references before replacing or deleting an asset.

## Current page order and content

1. Red envelope, responsive S & S seal, invitation wording.
2. Kalash, Jain invocation and mantra, then Sanghai and Runwal Parivaar welcomes you.
3. Sriyansh with Shrishti, with writing-style reveal on entering view.
4. Scratch-to-reveal Save the Date; confetti and countdown after 70% is uncovered.
5. Haldi Khela: Friday, 27 November 2026, 11:00 am. Soft sunshine and sacred smiles. Dress code: Hues of Yellow.
6. Raas Sangeet: Friday, 27 November 2026, 5:00 pm. An evening of raas, rhythm and celebration.
7. Saat Phere: Saturday, 28 November 2026, 11:00 am. Sacred vows, a beautiful forever.
8. Baraat & Reception: Saturday, 28 November 2026, 6:00 pm. A joyful arrival, a night to remember.
9. Vadhu Aagman: Sunday, 29 November 2026, in Pratah Bela. A new home, a beautiful beginning.
10. Where We Celebrate: Maya Marriage Hall, Ramleela Road, Lalpura, Etawah, with map and directions.
11. Maroon With love closing panel, names, 27-29 November dates and #SriyanshKiShrishti.

Save the Date reveals 27 & 28 November; the closing panel includes 29 November for Vadhu Aagman. Event panels use date, phrase, then time, without repeating the venue.

## Common edits

**Text and dates:** Edit the matching section in `dist/index.html`. Keep visible times and their `<time datetime="...">` values consistent. Event timestamps use India time (`+05:30`). The countdown target is midnight India time on 27 November 2026; change `WEDDING_START` in `dist/invitation-core.mjs` to adjust it.

**Typography and layout:** Palette and font variables are near the top of `style.css`. The stylesheet has successive refinements: later rules override earlier ones. Search for every occurrence of a selector, including mobile media queries. Event headings are SVG text; edit both the visible words and accessible `aria-label` together. Keep text clear of the left border and bottom garden.

**Music:** Replace `dist/assets/wedding-music.mp3` with your own MP3 under the same name, or update the audio `src`. The included 30-second clip loops. Playback starts from the envelope tap; the small button pauses/resumes, and leaving the tab pauses playback. Some browsers may need a manual tap on the music button. Volume is `0.35` in `script.js`. There is no YouTube widget or API in this version.

**Petals and names:** There are 14 slow petals, generated in `script.js`. Names animation timing is in the `.names-writing` rules in `style.css`. Reduced-motion preferences are respected.

**Map:** Update both the Google Maps iframe query and the directions button if the venue changes. The current directions link is https://share.google/LPGi2M2aG4BBShY31.

**New or reordered sections:** Keep IDs unique and preserve matching `aria-labelledby`/heading IDs. Add new direct-link destinations to `linkedSections` in `script.js`. Adjust captions and `data-page` numbers when needed.

**Caching:** HTML links to the stylesheet and script include version query strings. Increment them after a hosted update, or hard-refresh if an old version appears.

## Your own Git repository

In the extracted folder:

```sh
git init
git add .
git commit -m "Import wedding invitation source"
```

Connect it to a repository you own. This package is independent of the existing hosting repository; repository history and hosting credentials are not included.

## Host independently

Publish the **contents of `dist/`** as the website root. If your host asks for a publish/output directory, use `dist`; leave the build command blank. Keep the folder structure intact. Serve `.mjs` as JavaScript and `.mp3` as audio, and use HTTPS.

Artwork, scripts and music are included locally. Google Fonts and the Google Maps widget need an internet connection. Clipboard access may be restricted on insecure hosted pages; the site includes a manual-copy fallback.

## Optional tests

Previewing needs no npm packages. To run the full test suite, install Node.js 20 or newer, then:

```sh
npm install
npm test
```

The sole package, `@napi-rs/canvas`, is a development dependency for the canvas interaction harness. It is not sent to visitors.

Run core tests without installing dependencies:

```sh
npm run test:core
```

Tests cover scratch area/threshold, countdown, envelope opening, direct links, names reveal, reduced motion, ink edges and audio controls. They do not replace browser/device checks of typography, live map loading or actual sound playback.
