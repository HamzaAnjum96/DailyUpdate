# City Ops Brief

The weekly Manchester brief (transport, news, sales, events) as a swipeable trading-card deck, served from GitHub Pages. Each week is one JSON file, and the browser builds the deck from it, card micrographics included.

- **Deck:** `index.html` shows the newest brief. `index.html?brief=2026-w43` shows a given week, and `#c05` jumps to a card.
- **Templates:** `templates.html` renders every micrographic template from editable JSON, so you can try changes before putting them in a brief.

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
assets/js/nav.js            swipe, keyboard, progress bar and rail highlighting
assets/js/types.js          card types: badge code, section name, meter label, icon
assets/js/micrographics/    one file per micrographic template, plus index.js (the registry)
assets/js/lib/              markup escaping, dates, dot-matrix font, QR code
assets/vendor/              qrcode-generator 2.0.4 (MIT, Kazuhiko Arase)
scripts/check.js            validates and test-builds every brief; CI runs it before deploying
```

There is no build step: the site is static files and ES modules.

## Weekly update

1. Copy last week's brief to `data/briefs/<year>-w<nn>.json` and edit it.
2. Add its id to the top of `data/briefs/index.json`:
   ```json
   { "briefs": ["2026-w44", "2026-w43"] }
   ```
3. Run `npm run check` (or `node scripts/check.js`). It reports anything that would break or mislead: bad dates, a source number that doesn't exist, a week-strip date outside the week, an unknown template, more than one priority card.
4. Commit and push. Older weeks stay available at `?brief=<id>`.

The schema is the same as the `brief.json` the original `deck.py` generator used, so existing briefs drop straight in.

### Brief fields

| Field | |
|---|---|
| `week`, `rev` | ISO week number (of the Monday) and revision letter (`"A"`, then `"B"` for a corrected re-issue) |
| `start`, `end`, `checked` | `YYYY-MM-DD`. The week runs Sunday `start` to Sunday `end`; `checked` is when the facts were verified |
| `tz` | Shown on the cover, e.g. `"BST"` |
| `note` | Top of the source register: checked date, time zone, anything still to confirm |
| `qr` | URL for the end-card QR code (defaults to TfGM travel alerts) |
| `cards` | Content cards, in order: transport, news, sales, events |
| `sources` | `[url, label]` pairs, numbered from 1 in the register |

### Card fields

| Field | |
|---|---|
| `type` | `transport`, `news`, `sale` or `event` |
| `sub` | Qualifier in the card header, e.g. `"Tram"` |
| `priority`, `headline` | One card gets `"priority": true`, plus a `headline` for the cover teaser (e.g. `"19 OCT → 01 NOV"`) |
| `short` | Name in the cover's contents list |
| `tag`, `title`, `body` | `"CATEGORY / QUALIFIER"`, the headline, and 35–65 words of copy |
| `meter` / `chip` | A 0–5 rating (`meter_label` overrides IMPACT/DEPTH), or a chip such as `"Published 7 Oct"` |
| `when`, `what`, `where` | The stats row |
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
| `week` | Dated events and matches | `marks[]` `{date, label}`, `span` `{from, to or null, label}` |
| `bars` | A sale example | `was`, `now`, `item`, `pct` |
| `count` | One headline number | `value`, `caption`, `sub` |
| `clock` | Clock changes and other time shifts | `from`, `to`, `big`, `lines[]` |
| `target` | Cover ornament (no params) | |

`templates.html` lists every param with a working example you can edit live.

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

## Deploy

1. In the repo, go to **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**.
2. Push to the default branch. `.github/workflows/pages.yml` runs `scripts/check.js`, and publishes the site only if every brief passes. Pull requests get the check only.

The site is then at `https://<user>.github.io/<repo>/`.
