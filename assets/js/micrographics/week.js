// week: the deck's Sunday-to-Sunday strip, with marked days, an ongoing bar, or a look-ahead date.
import { addDays, dayAbbr, daysBetween, isoDate, monthAbbr, parseDate } from '../lib/dates.js';
import { svg } from '../lib/markup.js';
import { CHAR_W, upper } from './parts.js';

export const meta = {
  kind: 'week',
  name: 'Week strip',
  use: 'Dated events and matches, things that start this week and carry on, and look-aheads.',
  params: {
    marks: 'Days to highlight: [{ "date": "YYYY-MM-DD", "label": "19:00", "sub": "Time TBC", "n": 2 }]. "label" up to 8 characters; "sub" is a smaller second line; "n" puts a ×n badge on the day.',
    span: 'Optional bar: { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" or null, "label": "…" }. It gets an arrow at either end that runs past the week.',
    ahead: 'Optional look-ahead: { "date": "YYYY-MM-DD", "label": "17:00", "sub": "20:00 main" }. The week shrinks to make room for that later date, linked by an arrow.',
  },
  example: {
    kind: 'week',
    marks: [{ date: '2026-10-26', label: 'Arena' }, { date: '2026-10-28', label: 'City', sub: '+ Arena', n: 2 }],
    span: { from: '2026-04-04', to: null, label: 'Northbound shut since 4 Apr · no end date' },
  },
};

// Layout. DAYS cells start at X0 and fill STRIP_W, or AHEAD_STRIP_W when a look-ahead cell
// (AHEAD_X wide AHEAD_W) sits at the right. Labels hang below the cells on short leader lines.
const DAYS = 8;
const X0 = 12;
const STRIP_W = 296;
const AHEAD_STRIP_W = 238;
const AHEAD_X = 273;
const AHEAD_W = 34;
const SUB_CHAR_W = 4.5;

const isWeekend = (d) => d.getUTCDay() === 0 || d.getUTCDay() === 6;

// A label (and optional sub-line) on a leader below the day centred at cx, kept inside the figure.
function hang(cx, label, sub) {
  const w = Math.max(label ? label.length * CHAR_W : 0, sub ? sub.length * SUB_CHAR_W : 0);
  const tx = Math.max(12 + w / 2, Math.min(cx, 308 - w / 2));
  return svg`<path d="M${cx} 80V84" class="s-hot s-lead"/>${label ? svg`<text x="${tx}" y="92" text-anchor="middle" class="t-hot">${upper(label)}</text>` : ''}${sub ? svg`<text x="${tx}" y="101" text-anchor="middle" class="t-sub">${upper(sub)}</text>` : ''}`;
}

export function render({ marks = [], span, ahead }, ctx) {
  const start = ctx.start;
  const cw = (ahead ? AHEAD_STRIP_W : STRIP_W) / DAYS;
  const stripEnd = X0 + DAYS * cw;
  const byDate = new Map(marks.map((m) => [m.date, m]));
  const out = [
    svg`<text x="12" y="14" class="t-stop">${upper(`${monthAbbr(start)} ${start.getUTCFullYear()}`)}</text>`,
    svg`<text x="${ahead ? stripEnd : 308}" y="14" text-anchor="end" class="t-stop">W${ctx.week}</text>`,
  ];
  const hangs = [];

  for (let i = 0; i < DAYS; i++) {
    const d = addDays(start, i);
    const x = X0 + i * cw;
    const cx = x + cw / 2;
    const mark = byDate.get(isoDate(d));
    const fill = mark ? 'f-hot s-hot' : isWeekend(d) ? 'f-wkd s-dim' : 'f-ink s-dim';
    out.push(svg`<text x="${cx}" y="31" text-anchor="middle" class="${isWeekend(d) ? 't-wkd' : 't-stop'}">${upper(dayAbbr(d))}</text>`);
    out.push(svg`<rect x="${x + 1}" y="36" width="${cw - 2}" height="42" class="${fill}"/>`);
    if (i > 0 && d.getUTCDate() === 1) out.push(svg`<text x="${cx}" y="46" text-anchor="middle" class="t-sub">${upper(monthAbbr(d))}</text>`);
    out.push(svg`<text x="${cx}" y="65" text-anchor="middle" class="t-date${mark ? ' t-ink' : ''}">${d.getUTCDate()}</text>`);
    if (mark?.n > 1) out.push(svg`<text x="${x + cw - 3}" y="45" text-anchor="end" class="t-n">×${mark.n}</text>`);
    if (mark && (mark.label || mark.sub)) hangs.push(hang(cx, mark.label, mark.sub));
  }

  if (ahead) {
    const d = parseDate(ahead.date);
    const cx = AHEAD_X + AHEAD_W / 2;
    const gap = daysBetween(addDays(start, DAYS - 1), d);
    out.push(svg`<text x="${cx}" y="14" text-anchor="middle" class="t-hot">${upper(monthAbbr(d))}</text>`);
    out.push(svg`<path d="M${stripEnd + 2} 57H${AHEAD_X - 6}" class="s-hot s-dash s-flow"/><path d="M${AHEAD_X - 7} 53L${AHEAD_X - 2} 57L${AHEAD_X - 7} 61Z" class="f-hot"/>`);
    out.push(svg`<text x="${(stripEnd + AHEAD_X - 1) / 2}" y="50" text-anchor="middle" class="t-sub">+${gap}D</text>`);
    out.push(svg`<text x="${cx}" y="31" text-anchor="middle" class="${isWeekend(d) ? 't-wkd' : 't-stop'}">${upper(dayAbbr(d))}</text>`);
    out.push(svg`<rect x="${AHEAD_X}" y="36" width="${AHEAD_W}" height="42" class="f-hot s-hot"/>`);
    out.push(svg`<text x="${cx}" y="65" text-anchor="middle" class="t-date t-ink">${d.getUTCDate()}</text>`);
    out.push(svg`<path d="M${X0 + 1} 84V88H${stripEnd - 1}V84" class="s-dim"/><text x="${X0 + (stripEnd - X0) / 2}" y="100" text-anchor="middle" class="t-stop">THIS WEEK</text>`);
    if (ahead.label || ahead.sub) hangs.push(hang(cx, ahead.label, ahead.sub));
  }
  out.push(...hangs);

  if (span) {
    const i0 = daysBetween(start, parseDate(span.from));
    const x1 = X0 + Math.max(0, i0) * cw + 2;
    if (i0 < 0) out.push(svg`<path d="M${X0 - 1} 106L${X0 - 8} 112L${X0 - 1} 118Z" class="f-hot"/>`);
    const i1 = span.to ? daysBetween(start, parseDate(span.to)) : Infinity;
    if (i1 < DAYS) {
      out.push(svg`<path d="M${x1} 112H${X0 + (i1 + 1) * cw - 2}" class="s-hot s-bar"/>`);
    } else {
      out.push(svg`<path d="M${x1} 112H300" class="s-hot s-bar"/><path d="M299 106L307 112L299 118Z" class="f-hot"/>`);
    }
    out.push(svg`<text x="${x1}" y="129" class="t-hot">${upper(span.label)}</text>`);
  }
  return svg`${out}`;
}

export function check({ marks = [], span, ahead }, ctx) {
  const errs = [];
  const offset = (iso) => daysBetween(ctx.start, parseDate(iso));
  const attempt = (what, fn) => {
    try {
      fn();
    } catch (e) {
      errs.push(`${what}: ${e.message}`);
    }
  };
  for (const m of marks) {
    attempt(`mark ${m.date}`, () => {
      const i = offset(m.date);
      if (i < 0 || i >= DAYS) errs.push(`mark ${m.date} is outside the strip (${isoDate(ctx.start)} + ${DAYS - 1} days)`);
    });
    if ((m.label ?? '').length > 8) errs.push(`mark ${m.date} label "${m.label}" is over 8 characters`);
    if (m.n != null && !(Number.isInteger(m.n) && m.n > 1)) errs.push(`mark ${m.date} n must be a whole number above 1`);
  }
  if (span) {
    attempt('span', () => {
      parseDate(span.from);
      if (span.to) parseDate(span.to);
    });
  }
  if (ahead) {
    attempt('ahead', () => {
      if (offset(ahead.date) < DAYS) errs.push(`ahead date ${ahead.date} must fall after the strip`);
    });
    if (span) errs.push('use either a span or an ahead date, not both');
  }
  if (!marks.length && !span && !ahead) errs.push('needs marks, a span or an ahead date');
  return errs;
}
