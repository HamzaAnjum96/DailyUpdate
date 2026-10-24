# City Ops Brief

The weekly Manchester brief (transport, news, sales, events) as a swipeable trading-card deck, served from GitHub Pages. Each week is one JSON file, and the browser builds the deck from it, card micrographics included.

- **Deck:** `index.html` shows the newest brief. `index.html?brief=2026-w43` shows a given week, and `#c05` jumps to a card.
- **Templates:** `templates.html` renders every micrographic template from editable JSON, so you can try changes before putting them in a brief.

Swipe or scroll through the cards, use the persistent Previous/Next buttons, or press ↑/↓, Page Up/Page Down, J/K, Home/End. The Cover and Sources controls are always available. Keyboard controls respect editable fields and scrollable card text. When multiple weeks are available, the cover includes a brief picker. An unknown brief URL shows an error with a link back to the latest week.

## Layout

```
index.html                  deck page; loads data/briefs/index.json, then the brief
templates.html              micrographic template gallery / playground
data/briefs/index.json      list of brief ids, newest first
data/briefs/2026-w43.json   one brief: dates, cards, sources
assets/css/deck.css         Industrial Black card styles (deck.css tokens are shared by the gallery)
assets/css/templates.css    gallery-only styles
assets/js/main.js           entry: fetch → buildDeck → startNav
assets/js/deck.js           cover, cards, source register, index rail (pure string building)
assets/js/nav.js            scroll, keyboard, button and deep-link navigation
assets/js/types.js          card types: badge code, section name, meter label, icon
assets/js/micrographics/    one file per micrographic template, plus index.js (the registry)
assets/js/lib/              shared validation, markup escaping, dates, dot-matrix font
scripts/check.js            validates and test-builds every brief; CI runs it before deploying
tests/                      Node regression tests and Playwright browser tests
notes/priorities.md         editorial priorities: what to check first and rank higher (not published)
```

There is no build step: the site is static files and ES modules.

## Weekly update

1. Start with the checks in `notes/priorities.md`; they decide what leads each section. Then copy last week's brief to `data/briefs/<year>-w<nn>.json` and edit it.
2. Add its id to the top of `data/briefs/index.json`:
   ```json
   { "briefs": ["2026-w44", "2026-w43"] }
   ```
3. Run `npm run check` (or `node scripts/check.js`). It rejects impossible dates, mismatched ISO weeks and filenames, invalid source references, unsafe URLs, invalid graphic parameters, and multiple priority cards. The archive must contain unique `YYYY-wNN` ids, newest first. Dates run Sunday to the following Sunday; the filename uses the ISO year and week of the Monday (which can differ from Sunday's calendar year at New Year). Checks validate structure and rendering, so source claims still need editorial verification.
4. Commit and push. Older weeks stay available at `?brief=<id>`.

The schema is the same as the `brief.json` the original `deck.py` generator used, so existing briefs drop straight in.

### Brief fields

| Field | |
|---|---|
| `week`, `rev` | ISO week number (of the Monday) and revision letter (`"A"`, then `"B"` for a corrected re-issue) |
| `start`, `end`, `checked` | `YYYY-MM-DD`. The week runs Sunday `start` to Sunday `end`; `checked` is when the facts were verified |
| `tz` | Shown on the cover and end card, e.g. `"BST"` or `"GMT"` |
| `note` | Top of the source register: checked date, time zone, anything still to confirm |
| `cards` | Content cards in deck order. Any card can lead (W43 and W44 open with the clock change). The cover's contents list each type's card numbers, e.g. `01 · 04`, with look-aheads in their own row at the end |
| `sources` | `[url, label]` pairs, numbered from 1 in the register |

### Card fields

| Field | |
|---|---|
| `type` | `transport`, `news`, `sale` or `event` |
| `sub` | Qualifier in the card header, e.g. `"Tram"` |
| `priority`, `headline` | One card gets `"priority": true`, plus a `headline` for the cover teaser (e.g. `"19 OCT → 01 NOV"`) |
| `ahead` | `true` for a look-ahead beyond the brief's dates: a dashed top edge, "→ AHEAD" in the header and its own row in the cover's contents |
| `short` | Name in the cover's contents list |
| `tag`, `title`, `body` | `"CATEGORY / QUALIFIER"`, the headline, and 35–65 words of plain-text copy. Full dates ("Sunday 25 October") and 24-hour times are highlighted automatically |
| `meter` / `chip` | A 0–5 rating (`meter_label` overrides IMPACT/DEPTH), or a chip such as `"Published 7 Oct"` |
| `when`, `what`, `where` | The stats row. In these and the chip, any ` · ` part that says "confirm" or "TBC" gets an orange ? flag, e.g. `"Sun 25 Oct · confirm times"` |
| `days` | When the item happens: `"all"` for the whole brief, or dates inside it, e.g. `["2026-10-25", "2026-10-28"]`. They light the card's Monday-to-Sunday day strip (top right; both Sundays of a Sunday-to-Sunday brief light S) and place a square in the cover's at-a-glance grid. `"all"` items and look-aheads are counted in the grid's heading instead |
| `links` | `[url, label]` pairs for the footer buttons |
| `src` | Source numbers this card relies on, e.g. `[1, 2]` |
| `mg` | The micrographic: `{ "kind": "<template>", ...params }` |
| `mg_caption`, `mg_alt` | `[left, right]` caption under the art, and a one-sentence description for screen readers |

## Micrographic templates

Each card's art window is a template from `assets/js/micrographics/`, filled from the card's `mg` object:

```json
"mg": { "kind": "bars", "was": 37.99, "now": 8.00, "item": "Pyjama set", "pct": 79 }
```

| kind | For | Params |
|---|---|---|
| `route` | Tram, rail and bus closures, shuttles | `rows[]`: `name`, `stops[]`, `closed` `[[from, to]]`, `end`, `mark`, `mark_label` |
| `junction` | Motorway closures | `road`, `a`, `b`, `closed` (`slip` / `clockwise` / `anticlockwise` / `both`), `slip`, `window` |
| `week` | Dated events and matches, look-aheads | `marks[]` `{date, label, sub, n}`, `span` `{from, to or null, label}`, `ahead` `{date, label, sub}` |
| `hours` | One time window on one day | `title`, `from`, `to`, `axis` `[first hour, last hour]`, `label`, `foot` |
| `bars` | A sale example | `was`, `now`, `item`, `pct` |
| `count` | One headline number | `value`, `caption`, `sub` |
| `clock` | Clock changes and other time shifts | `from`, `to`, `big`, `lines[]` |
| `target` | Cover ornament (no params) | |

`templates.html` lists every param with a working example you can edit live. Invalid edits clear the preview and show a field error. **Reset example** restores that template's original parameters. The shared week-start date must be a Sunday.

**Adapting a template.** Each file has the same parts: `meta` (name, use, param docs, example), a block of layout constants (positions, sizes, spacing) and `render(params, ctx)`, which returns SVG written as a template literal:

```js
return svg`<text x="${X0}" y="70" class="t-hot">NOW ${money(now)}</text>`;
```

Values in `${…}` are escaped and numbers rounded, so templates read like plain SVG. Change a layout constant to move things, or edit the markup to change the drawing. Colours and type come from the classes in `deck.css` (`t-hot`, `s-closed`, `f-paper` and so on).

**Adding a template.** Copy the closest file to `assets/js/micrographics/<kind>.js`, set `meta.kind`, rewrite `render`, and add it to the list in `micrographics/index.js`. Optionally export `check(params, ctx)`, returning a list of problems, and `scripts/check.js` will run it on every card that uses the template. Use the new kind in a card's `mg`, and it also appears in `templates.html`.

## Preview locally

Browsers block module scripts and `fetch()` on `file://` pages, so serve the folder:

```sh
python3 -m http.server 8000     # or: npx serve .
```

Then open http://localhost:8000 and http://localhost:8000/templates.html.

## Test changes

Use Node.js 22 or later (the deployed site itself has no runtime dependencies). Install the locked development tools once:

```sh
npm ci
npx playwright install chromium
```

Run the validation, unit regressions, and browser suite:

```sh
npm run check
npm test
npm run test:browser
```

Playwright starts the local Python server automatically and reuses an existing server on port 8000 outside CI. Python 3 is required. To use an installed Chromium instead of downloading a browser, run `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:browser`. The browser suite covers deep links, controls, fetch/data failures, archive selection, mobile and landscape layouts, and template editing. Failed browser tests retain traces in `test-results/`.

## Deploy

1. In the repo, go to **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**.
2. Push to `main`. `.github/workflows/pages.yml` runs brief validation, unit tests and Chromium browser tests on every push and pull request, and publishes the site from `main` only if all pass. Failed browser tests are attached to the workflow run as an artifact. Editorial notes, development tools and tests are excluded from the deployed files.
3. In **Settings → Environments → github-pages**, the deployment branch rules must allow `main`.

The site is then at `https://<user>.github.io/<repo>/`.
