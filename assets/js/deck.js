// Builds the whole deck (cover, one card per item, source register) from a brief.
// Pure string building with no DOM access, so scripts/check.js can run it in Node.
import { addDays, dayAbbr, daysBetween, isoDate, monthAbbr, pad2, parseDate } from './lib/dates.js';
import { dots, dotsWidth } from './lib/dotmatrix.js';
import { html, raw } from './lib/markup.js';
import { renderMicrographic } from './micrographics/index.js';
import { GLANCE_ORDER, TYPE_ORDER, TYPES } from './types.js';

// Masthead. Change these to re-badge the deck.
const CITY = 'MCR';
const TITLE = 'City Ops Brief';

const dayMonth = (d) => `${pad2(d.getUTCDate())} ${monthAbbr(d)}`.toUpperCase();

// The brief's days, start to end inclusive.
const briefDays = (start, end) => Array.from({ length: daysBetween(start, end) + 1 }, (_, i) => addDays(start, i));

// A card's dates within the brief: "days" is "all" or a list of YYYY-MM-DD dates.
export function cardDates(c, days) {
  if (c.ahead) return [];
  if (c.days === 'all') return days;
  const want = new Set(c.days ?? []);
  return days.filter((d) => want.has(isoDate(d)));
}

// The day strip in each card's header: seven blocks, Monday to Sunday, orange on the
// weekdays the item falls on. Both Sundays of a Sunday-to-Sunday brief light the S block.
const STRIP = [[1, 'M'], [2, 'T'], [3, 'W'], [4, 'T'], [5, 'F'], [6, 'S'], [0, 'S']];

function dayStrip(c, days) {
  const dates = cardDates(c, days);
  const on = new Set(dates.map((d) => d.getUTCDay()));
  const label = c.ahead
    ? 'Look-ahead: not this week'
    : c.days === 'all'
      ? 'Every day this week'
      : dates.length
        ? `This week: ${dates.map((d) => `${dayAbbr(d)} ${d.getUTCDate()}`).join(', ')}`
        : 'Not on any day this week';
  const blocks = STRIP.map(([wd, letter]) => (on.has(wd) ? html`<i class="on">${letter}</i>` : html`<i>${letter}</i>`));
  return html`<span class="days" role="img" aria-label="${label}">${blocks}</span>`;
}

// Body copy: full dates ("Sunday 25 October") and 24-hour times stand out in paper white.
const ACCENT = /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) \d{1,2} (?:January|February|March|April|May|June|July|August|September|October|November|December)\b|\b\d{2}:\d{2}\b/g;

function accent(text) {
  const s = String(text ?? '');
  const out = [];
  let last = 0;
  for (const m of s.matchAll(ACCENT)) {
    out.push(s.slice(last, m.index), html`<b class="hl">${m[0]}</b>`);
    last = m.index + m[0].length;
  }
  out.push(s.slice(last));
  return html`${out}`;
}

// Chips and stats: any " · " segment that still needs confirming gets the "?" flag.
const flag = (text) =>
  html`${String(text ?? '').split(' · ').map((part, i) => [i ? ' · ' : '', /confirm|\btbc\b/i.test(part) ? html`<span class="tbc">${part}</span>` : part])}`;

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

// Source numbers in the order given, with ascending runs of three or more shortened: [5, 6, 7, 8] → "05–08".
function srcList(nums) {
  const parts = [];
  for (let i = 0; i < nums.length; ) {
    let j = i;
    while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
    if (j - i >= 2) parts.push(`${pad2(nums[i])}–${pad2(nums[j])}`);
    else for (let k = i; k <= j; k++) parts.push(pad2(nums[k]));
    i = j + 1;
  }
  return parts.join('·');
}

export function buildDeck(brief, { briefs = [], selectedId } = {}) {
  const start = parseDate(brief.start);
  const end = parseDate(brief.end);
  const checked = parseDate(brief.checked);
  const week = Number(brief.week);
  const ctx = { start, week, serial: String(week).padStart(3, '0') };
  const days = briefDays(start, end);
  const rev = `REV ${brief.rev ?? 'A'}`;
  const range = `${dayMonth(start)}–${dayMonth(end)}`;
  const chk = dayMonth(checked);
  const tz = brief.tz ?? 'BST';
  const yymmdd = `${String(start.getUTCFullYear()).slice(2)}${pad2(start.getUTCMonth() + 1)}${pad2(start.getUTCDate())}`;
  const cards = brief.cards;
  const total = cards.length + 1; // content cards + source register
  const title = `${TITLE} W${week}`;

  const slides = [
    cover({ brief, cards, ctx, days, rev, range, chk, tz, total, briefs, selectedId }),
    ...cards.map((c, i) => card(c, i + 1, total, ctx, days)),
    endCard({ brief, ctx, rev, chk, tz, total, docId: `${CITY}-${yymmdd}-W${week}` }),
  ];

  const index = [null, ...cards, null].map((c, i) => {
    const code = c ? TYPES[c.type].code : i === total ? 'SRC' : '—';
    const label = c ? `${c.ahead ? '→ ' : ''}${c.title}` : i === total ? 'Source register' : 'Cover';
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

// At a glance: one cell per day of the brief, one square per dated item, coloured by type.
// All-week items and look-aheads are counted in the heading instead.
const MAX_SQUARES = 3;

function glance(cards, ctx, days) {
  const perDay = days.map(() => []);
  let allWeek = 0;
  let ahead = 0;
  for (const c of cards) {
    if (c.ahead) ahead++;
    else if (c.days === 'all') allWeek++;
    else for (const d of cardDates(c, days)) perDay[daysBetween(ctx.start, d)].push(c.type);
  }
  const step = 312 / days.length;
  const cells = days.map((d, i) => {
    const x = 5 + i * step;
    const w = step - 2;
    const items = perDay[i].sort((a, b) => GLANCE_ORDER.indexOf(a) - GLANCE_ORDER.indexOf(b));
    const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
    const squares = items.slice(0, MAX_SQUARES).map((t, k) => html`<rect x="${x + 4 + k * 9.5}" y="29" width="7" height="7" class="${TYPES[t].square}"/>`);
    const more = items.length > MAX_SQUARES ? html`<text x="${x + w - 3}" y="36" text-anchor="end" class="t-sub">+${items.length - MAX_SQUARES}</text>` : '';
    return html`<rect x="${x}" y="0.5" width="${w}" height="45" class="${weekend ? 'f-wkd' : 'f-ink'} ${items.length ? 's-line' : 's-faint'}"/><text x="${x + 4}" y="11" class="${weekend ? 't-wkd' : 't-stop'}">${dayAbbr(d).slice(0, 2).toUpperCase()}</text><text x="${x + w - 4}" y="21" text-anchor="end" class="t-gd${items.length ? ' on' : ''}">${d.getUTCDate()}</text>${squares}${more}`;
  });
  const counts = [allWeek ? `+${allWeek} all week` : '', ahead ? `+${ahead} ahead` : ''].filter(Boolean).join(' · ');
  const present = GLANCE_ORDER.filter((t) => perDay.some((items) => items.includes(t)));
  const key = present.map((t) => html`<i class="${TYPES[t].key}"></i>${t === 'event' ? 'Event' : t === 'sale' ? 'Sale' : TYPES[t].section}`);
  return html`<div class="glance"><div class="glance-k"><span>W${ctx.week} / At a glance</span><span>${counts}</span></div><svg viewBox="0 0 320 46" role="img" aria-label="Week at a glance">${cells}</svg>
    <div class="glance-key" aria-hidden="true">${key}</div></div>`;
}

function cover({ brief, cards, ctx, days, rev, range, chk, tz, total, briefs, selectedId }) {
  const { week, start } = ctx;
  const end = parseDate(brief.end);
  let prioIndex = cards.findIndex((c) => c.priority);
  if (prioIndex < 0) prioIndex = 0;
  const prio = cards[prioIndex];

  // One row per type, in the order each type first appears in the deck; look-aheads go last.
  const row = (ids, code, name, cls) => {
    const shorts = ids.map((i) => cards[i - 1].short ?? cards[i - 1].title).join(' · ');
    return html`<a href="#c${pad2(ids[0])}"${cls ? raw(` class="${cls}"`) : ''}><span class="code">${code}</span><span>${name} ×${ids.length}</span><span>${cardRuns(ids)}</span><small>${shorts}</small></a>`;
  };
  const types = [...new Set(cards.filter((c) => !c.ahead).map((c) => c.type))].filter((t) => TYPES[t]);
  const contents = types.map((t) => row(cards.flatMap((c, i) => (c.type === t && !c.ahead ? [i + 1] : [])), TYPES[t].code, TYPES[t].section));
  const aheadIds = cards.flatMap((c, i) => (c.ahead ? [i + 1] : []));
  if (aheadIds.length) contents.push(row(aheadIds, TYPES[cards[aheadIds[0] - 1].type].code, 'Look-ahead', 'ahead'));

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
   <div class="hero-r"><svg viewBox="0 0 ${dotsWidth(banner, pitch)} ${7 * pitch}" role="img" aria-label="${banner}">${dots(banner, 0, 0, pitch, CITY.length + 1)}</svg><div class="meta">LOC: ${CITY}<br>PUBLIC<br>CHK: ${chk} / ${tz}</div></div>
  </div>
  <div class="cover-main" tabindex="0" role="region" aria-label="Priority and contents">
   <a class="prio" href="#c${pad2(prioIndex + 1)}"><svg viewBox="0 0 ${target.width} ${target.height}" aria-hidden="true" class="mini">${target.svg}</svg>
    <div><div class="lab">★ Priority signal / ${prio.sub || TYPES[prio.type].section}</div><div class="when">${prio.headline ?? prio.when}</div><div class="what">${prio.title}</div></div></a>
   ${glance(cards, ctx, days)}
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
  return c.chip ? html`<span class="chip">${flag(c.chip)}</span>` : '';
}

function card(c, i, total, ctx, days) {
  const type = TYPES[c.type];
  if (!type) throw new Error(`Card ${i}: unknown type "${c.type}" (have: ${TYPE_ORDER.join(', ')})`);
  const section = `${type.section}${c.sub ? ` · ${c.sub}` : ''}`.toUpperCase();
  const star = c.priority
    ? raw('<span class="star">★<span class="star-l"> PRIORITY</span></span>')
    : c.ahead
      ? raw('<span class="star">→<span class="star-l"> AHEAD</span></span>')
      : '';
  const cls = ['card', c.priority && 'priority', c.ahead && 'ahead'].filter(Boolean).join(' ');
  const links = (c.links ?? []).map(([url, label]) => html`<a class="btn" href="${url}" target="_blank" rel="noopener">${label}</a>`);
  const src = c.src?.length ? html`<span class="src">SRC ${srcList(c.src)}</span>` : '';

  return html`
<section class="slide" id="c${pad2(i)}" tabindex="-1" data-type="${c.type}" aria-label="Card ${i} of ${total}: ${c.title}">
 <article class="${cls}"><div class="card-in">
  <header class="card-top"><span class="ctype"><span class="code">${type.code}</span><svg viewBox="0 0 14 14" aria-hidden="true">${raw(type.icon)}</svg>${section}</span><span class="top-r">${star}${dayStrip(c, days)}</span></header>
  ${c.priority ? raw('<div class="hazard"></div>') : ''}
  ${figure(c, i, ctx)}
  <div class="card-main" tabindex="0" role="region" aria-label="${c.title}">
   <p class="tag">${c.tag ?? ''}</p>
   <h2>${c.title}</h2>
   ${rating(c)}
   <p class="body">${accent(c.body)}</p>
  </div>
  <dl class="stats"><div><dt>When</dt><dd>${flag(c.when)}</dd></div><div><dt>What</dt><dd>${flag(c.what)}</dd></div><div><dt>Where</dt><dd>${flag(c.where)}</dd></div></dl>
  <footer class="card-foot">${links}${src}</footer>
 </div></article>
</section>`;
}

// Decorative barcode, drawn as a vertical strip: alternating bar/gap heights.
const BARCODE = [2, 1, 3, 1, 1, 2, 4, 1, 2, 1, 5, 2, 1, 3, 2, 1, 4, 2, 1, 1, 3, 1, 5, 1, 2, 4, 1, 3, 1, 2, 5, 1, 1, 3, 2];

function barcode() {
  let y = 0;
  const bars = [];
  BARCODE.forEach((h, i) => {
    if (i % 2 === 0) bars.push(html`<rect x="0" y="${y}" width="34" height="${h}"/>`);
    y += h;
  });
  return html`<svg class="barcode" viewBox="0 0 34 ${y}" preserveAspectRatio="none" aria-hidden="true">${bars}</svg>`;
}

function endCard({ brief, ctx, rev, chk, tz, total, docId }) {
  const sources = brief.sources.map(([url, label]) => html`<li><a href="${url}" target="_blank" rel="noopener">${label} ↗</a></li>`);
  return html`
<section class="slide" id="c${pad2(total)}" tabindex="-1" aria-label="Sources">
 <article class="card endcard"><div class="card-in">
  <header class="card-top"><span class="ctype"><span class="code">SRC</span>Source register</span><span>Checked ${chk}</span></header>
  <div class="card-main" tabindex="0" role="region" aria-label="Source register"><p class="note">${brief.note ?? ''}</p><ol class="sources">${sources}</ol></div>
  <div class="docblock">
   <div class="l"><div class="doc-k">DOC / ${CITY}</div><div class="doc-id">${docId}</div><div class="doc-v">PUBLIC / W${ctx.week} / ${rev}</div><div class="doc-v">${pad2(total - 1)} cards · ${brief.sources.length} sources<br>Chk ${chk} / ${tz}</div></div>
   <div class="vbar" aria-hidden="true">${barcode()}<span>${docId}</span></div>
  </div>
  <footer class="endfoot"><span>${CITY} / OPS BRIEF</span><span>END / ${ctx.serial}</span></footer>
 </div></article>
</section>`;
}
