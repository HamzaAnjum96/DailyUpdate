// Builds the whole deck (cover, one card per item, source register) from a brief.
// Pure string building with no DOM access, so scripts/check.js can run it in Node.
import { monthAbbr, pad2, parseDate } from './lib/dates.js';
import { dots, dotsWidth } from './lib/dotmatrix.js';
import { html, raw } from './lib/markup.js';
import { renderMicrographic } from './micrographics/index.js';
import { TYPE_ORDER, TYPES } from './types.js';

// Masthead. Change these to re-badge the deck.
const CITY = 'MCR';
const TITLE = 'City Ops Brief';

const dayMonth = (d) => `${pad2(d.getUTCDate())} ${monthAbbr(d)}`.toUpperCase();

// The day strip in each card's header: the brief's week, Monday to Sunday.
export const WEEKDAYS = [
  ['mon', 'M', 'Mon'], ['tue', 'T', 'Tue'], ['wed', 'W', 'Wed'], ['thu', 'T', 'Thu'],
  ['fri', 'F', 'Fri'], ['sat', 'S', 'Sat'], ['sun', 'S', 'Sun'],
];

function dayStrip(days = []) {
  const on = new Set(days);
  const names = WEEKDAYS.filter(([key]) => on.has(key)).map(([, , name]) => name);
  const label = names.length === 7 ? 'Every day this week' : names.length ? `This week: ${names.join(', ')}` : 'Not on any day this week';
  const blocks = WEEKDAYS.map(([key, letter]) => (on.has(key) ? html`<i class="on">${letter}</i>` : html`<i>${letter}</i>`));
  return html`<span class="days" role="img" aria-label="${label}">${blocks}</span>`;
}

// Card numbers as runs, e.g. [1, 7, 8] → "01 · 07–08".
function cardRuns(ids) {
  const runs = [];
  for (const id of ids) {
    const last = runs.at(-1);
    if (last && id === last[1] + 1) last[1] = id;
    else runs.push([id, id]);
  }
  return runs.map(([a, b]) => (a === b ? pad2(a) : `${pad2(a)}–${pad2(b)}`)).join(' · ');
}

export function buildDeck(brief, { briefs = [], selectedId } = {}) {
  const start = parseDate(brief.start);
  const end = parseDate(brief.end);
  const checked = parseDate(brief.checked);
  const week = Number(brief.week);
  const ctx = { start, week, serial: String(week).padStart(3, '0') };
  const rev = `REV ${brief.rev ?? 'A'}`;
  const range = `${dayMonth(start)}–${dayMonth(end)}`;
  const chk = dayMonth(checked);
  const yymmdd = `${String(start.getUTCFullYear()).slice(2)}${pad2(start.getUTCMonth() + 1)}${pad2(start.getUTCDate())}`;
  const cards = brief.cards;
  const total = cards.length + 1; // content cards + source register
  const title = `${TITLE} W${week}`;

  const slides = [
    cover({ brief, cards, ctx, rev, range, chk, total, briefs, selectedId }),
    ...cards.map((c, i) => card(c, i + 1, total, ctx)),
    endCard({ brief, ctx, rev, chk, total, docId: `${CITY}-${yymmdd}-W${week}` }),
  ];

  const index = [null, ...cards, null].map((c, i) => {
    const code = c ? TYPES[c.type].code : i === total ? 'SRC' : '—';
    const label = c ? c.title : i === total ? 'Source register' : 'Cover';
    return html`<li><a href="#c${pad2(i)}"><span>${pad2(i)}</span><span class="c">${code}</span><span>${label}</span></a></li>`;
  });

  const page = html`
<div class="progress" aria-hidden="true"><div>${Array.from({ length: total + 1 }, () => raw('<i></i>'))}</div></div>
<aside class="index" aria-label="All cards"><p>${CITY} / W${week} / ${range}</p><ol>${index}</ol></aside>
<div class="keys" aria-hidden="true"><div><b>↓</b>Next card</div><div><b>↑</b>Previous</div><div><b>⇱</b>Home / End</div></div>
<main class="deck" tabindex="0" aria-label="${title}">${slides}
</main>
<nav class="deck-controls" aria-label="Card navigation">
 <a href="#c00">Cover</a>
 <button type="button" data-step="-1" aria-label="Previous card">←</button>
 <output class="card-position" aria-live="polite" aria-atomic="true">Cover</output>
 <button type="button" data-step="1" aria-label="Next card">→</button>
 <a href="#c${pad2(total)}">Sources</a>
</nav>`;
  return { title, html: String(page) };
}

function cover({ brief, cards, ctx, rev, range, chk, total, briefs, selectedId }) {
  const { week, start } = ctx;
  const end = parseDate(brief.end);
  let prioIndex = cards.findIndex((c) => c.priority);
  if (prioIndex < 0) prioIndex = 0;
  const prio = cards[prioIndex];

  // One row per type, in the order each type first appears in the deck.
  const types = [...new Set(cards.map((c) => c.type))].filter((t) => TYPES[t]);
  const contents = types.map((t) => {
    const ids = cards.flatMap((c, i) => (c.type === t ? [i + 1] : []));
    const shorts = ids.map((i) => cards[i - 1].short ?? cards[i - 1].title).join(' · ');
    return html`<a href="#c${pad2(ids[0])}"><span class="code">${TYPES[t].code}</span><span>${TYPES[t].section} ×${ids.length}</span><span>${cardRuns(ids)}</span><small>${shorts}</small></a>`;
  });

  const banner = `${CITY} W${week}`;
  const pitch = 4;
  const target = renderMicrographic({ kind: 'target' }, ctx);

  return html`
<section class="slide" id="c00" tabindex="-1" aria-label="Cover">
 <article class="card cover"><div class="card-in">
  <header class="card-top"><span class="ctype">${CITY} / CITY OPS</span><span>S/N ${ctx.serial} / ${rev}</span></header>
  <div class="mast"><span class="arrow" aria-hidden="true">↘</span><div><h1>${TITLE}</h1><p>${CITY} / W${week} / ${range}</p></div><div class="stamp">${CITY}<br>OPS<br>${start.getUTCFullYear()}</div></div>
  <div class="hero">
   <div><p class="eyebrow">W${week} / Field brief</p><p class="hero-word">${CITY}<br>W${week}</p><p class="range">${range} ${end.getUTCFullYear()}</p></div>
   <div class="hero-r"><svg viewBox="0 0 ${dotsWidth(banner, pitch)} ${7 * pitch}" role="img" aria-label="${banner}">${dots(banner, 0, 0, pitch, CITY.length + 1)}</svg><div class="meta">LOC: ${CITY}<br>PUBLIC<br>CHK: ${chk} / ${brief.tz ?? 'BST'}</div></div>
  </div>
  <div class="cover-main" tabindex="0" role="region" aria-label="Priority and contents">
   <a class="prio" href="#c${pad2(prioIndex + 1)}"><svg viewBox="0 0 ${target.width} ${target.height}" aria-hidden="true" class="mini">${target.svg}</svg>
    <div><div class="lab">★ Priority signal / ${prio.sub || TYPES[prio.type].section}</div><div class="when">${prio.headline ?? prio.when}</div><div class="what">${prio.title}</div></div></a>
   <nav class="contents" aria-label="Deck contents">${contents}</nav>
   ${briefs.length > 1 ? html`<label class="brief-picker" for="brief-select">Choose a brief<select id="brief-select">${briefs.map((id) => html`<option value="${id}"${id === selectedId ? raw(' selected') : ''}>${id.toUpperCase()}</option>`)}</select></label>` : ''}
  </div>
  <footer class="hint"><span><b aria-hidden="true">↑</b> Swipe up</span><span>${total} cards</span></footer>
 </div></article>
</section>`;
}

function figure(c, i, ctx) {
  if (!c.mg) return '';
  let mg;
  try {
    mg = renderMicrographic(c.mg, ctx);
  } catch (err) {
    // A broken micrographic drops its figure rather than the whole deck; scripts/check.js reports it.
    console.error(`Card ${i} (${c.title}): ${err.message}`);
    return '';
  }
  const [capLeft = '', capRight = ''] = c.mg_caption ?? [];
  return html`<figure class="mg${mg.height > 140 ? ' tall' : ''}"><span class="num" aria-hidden="true">${pad2(i)}</span><svg viewBox="0 0 ${mg.width} ${mg.height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${c.mg_alt ?? c.title}">${mg.svg}</svg><figcaption><span>${capLeft}</span><span>${capRight}</span></figcaption></figure>`;
}

function rating(c) {
  if (Number.isInteger(c.meter)) {
    const v = Math.max(0, Math.min(5, c.meter));
    const pips = Array.from({ length: 5 }, (_, k) => raw(k < v ? '<i class="pip on"></i>' : '<i class="pip"></i>'));
    return html`<div class="meter"><b>${c.meter_label ?? TYPES[c.type].meter}</b>${pips}<em>${v}/5</em></div>`;
  }
  return c.chip ? html`<span class="chip">${c.chip}</span>` : '';
}

function card(c, i, total, ctx) {
  const type = TYPES[c.type];
  if (!type) throw new Error(`Card ${i}: unknown type "${c.type}" (have: ${TYPE_ORDER.join(', ')})`);
  const section = `${type.section}${c.sub ? ` · ${c.sub}` : ''}`.toUpperCase();
  const star = c.priority ? raw('<span class="star">★<span class="star-l"> PRIORITY</span></span>') : '';
  const links = (c.links ?? []).map(([url, label]) => html`<a class="btn" href="${url}" target="_blank" rel="noopener">${label}</a>`);
  const src = c.src?.length ? html`<span class="src">SRC ${c.src.map(pad2).join('·')}</span>` : '';

  return html`
<section class="slide" id="c${pad2(i)}" tabindex="-1" data-type="${c.type}" aria-label="Card ${i} of ${total}: ${c.title}">
 <article class="card${c.priority ? ' priority' : ''}"><div class="card-in">
  <header class="card-top"><span class="ctype"><span class="code">${type.code}</span><svg viewBox="0 0 14 14" aria-hidden="true">${raw(type.icon)}</svg>${section}</span><span class="top-r">${star}${dayStrip(c.days)}</span></header>
  ${c.priority ? raw('<div class="hazard"></div>') : ''}
  ${figure(c, i, ctx)}
  <div class="card-main" tabindex="0" role="region" aria-label="${c.title}">
   <p class="tag">${c.tag ?? ''}</p>
   <h2>${c.title}</h2>
   ${rating(c)}
   <p class="body">${c.body}</p>
  </div>
  <dl class="stats"><div><dt>When</dt><dd>${c.when}</dd></div><div><dt>What</dt><dd>${c.what}</dd></div><div><dt>Where</dt><dd>${c.where}</dd></div></dl>
  <footer class="card-foot">${links}${src}</footer>
 </div></article>
</section>`;
}

// Decorative barcode: alternating bar/gap widths.
const BARCODE = [2, 1, 3, 1, 1, 2, 4, 1, 2, 1, 5, 2, 1, 3, 2, 1, 4, 2, 1, 1, 3, 1, 5, 1, 2, 4, 1, 3, 1, 2, 5, 1, 1, 3, 2];

function barcode() {
  let x = 0;
  const bars = [];
  BARCODE.forEach((w, i) => {
    if (i % 2 === 0) bars.push(html`<rect x="${x}" y="0" width="${w}" height="34" class="f-paper"/>`);
    x += w;
  });
  return html`<svg class="barcode" viewBox="0 0 ${x} 34" width="${x * 2}" height="34" aria-hidden="true">${bars}</svg>`;
}

function endCard({ brief, ctx, rev, chk, total, docId }) {
  const sources = brief.sources.map(([url, label]) => html`<li><a href="${url}" target="_blank" rel="noopener">${label} ↗</a></li>`);
  return html`
<section class="slide" id="c${pad2(total)}" tabindex="-1" aria-label="Sources">
 <article class="card endcard"><div class="card-in">
  <header class="card-top"><span class="ctype"><span class="code">SRC</span>Source register</span><span>Checked ${chk}</span></header>
  <div class="card-main" tabindex="0" role="region" aria-label="Source register"><p class="note">${brief.note ?? ''}</p><ol class="sources">${sources}</ol></div>
  <div class="docblock">
   <div class="l"><div class="doc-k">DOC / ${CITY}</div><div class="doc-id">${docId}</div><div class="doc-v">PUBLIC / W${ctx.week} / ${rev}</div><div class="bars-box">${barcode()}</div></div>
  </div>
  <footer class="endfoot"><span>${CITY} / OPS BRIEF</span><span>END / ${ctx.serial}</span></footer>
 </div></article>
</section>`;
}

