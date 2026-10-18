// week: the deck's Sunday-to-Sunday strip, with marked days and an optional ongoing bar.
import { addDays, dayAbbr, daysBetween, isoDate, monthAbbr, parseDate } from '../lib/dates.js';
import { svg } from '../lib/markup.js';
import { upper } from './parts.js';

export const meta = {
  kind: 'week',
  name: 'Week strip',
  use: 'Dated events and matches, and things that start this week and carry on.',
  params: {
    marks: 'Days to highlight: [{ "date": "YYYY-MM-DD", "label": "19:00" }]. Labels up to 8 characters.',
    span: 'Optional bar: { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" or null, "label": "…" }. A null "to" draws an arrow off the end of the week.',
  },
  example: {
    kind: 'week',
    marks: [{ date: '2026-10-18', label: '17:00' }, { date: '2026-10-21', label: '19:00' }],
    span: { from: '2026-10-22', to: null, label: 'Runs to Feb 2027' },
  },
};

// Layout: DAYS cells across the 296-unit strip starting at X0.
const DAYS = 8;
const X0 = 12;
const CW = 296 / DAYS;

export function render({ marks = [], span }, ctx) {
  const start = ctx.start;
  const labels = new Map(marks.map((m) => [m.date, m.label ?? '']));
  const out = [
    svg`<text x="12" y="14" class="t-stop">${upper(`${monthAbbr(start)} ${start.getUTCFullYear()}`)}</text>`,
    svg`<text x="308" y="14" text-anchor="end" class="t-stop">W${ctx.week}</text>`,
  ];

  for (let i = 0; i < DAYS; i++) {
    const d = addDays(start, i);
    const x = X0 + i * CW;
    const cx = x + CW / 2;
    const hot = labels.has(isoDate(d));
    out.push(svg`<text x="${cx}" y="31" text-anchor="middle" class="t-stop">${upper(dayAbbr(d))}</text>`);
    out.push(svg`<rect x="${x + 1}" y="36" width="${CW - 2}" height="42" class="${hot ? 'f-hot s-hot' : 'f-ink s-dim'}"/>`);
    out.push(svg`<text x="${cx}" y="65" text-anchor="middle" class="t-date${hot ? ' t-ink' : ''}">${d.getUTCDate()}</text>`);
    const label = labels.get(isoDate(d));
    if (label) out.push(svg`<text x="${cx}" y="92" text-anchor="middle" class="t-hot">${upper(label)}</text>`);
  }

  if (span) {
    const x1 = X0 + Math.max(0, daysBetween(start, parseDate(span.from))) * CW + 2;
    if (span.to) {
      const i1 = Math.min(DAYS - 1, daysBetween(start, parseDate(span.to)));
      out.push(svg`<path d="M${x1} 106H${X0 + (i1 + 1) * CW - 2}" class="s-hot s-bar"/>`);
    } else {
      out.push(svg`<path d="M${x1} 106H300" class="s-hot s-bar"/><path d="M299 100L307 106L299 112Z" class="f-hot"/>`);
    }
    out.push(svg`<text x="${x1}" y="124" class="t-hot">${upper(span.label)}</text>`);
  }
  return svg`${out}`;
}

export function check({ marks = [], span }, ctx) {
  const errs = [];
  const inStrip = (iso) => {
    const i = daysBetween(ctx.start, parseDate(iso));
    return i >= 0 && i < DAYS;
  };
  for (const m of marks) {
    try {
      if (!inStrip(m.date)) errs.push(`mark ${m.date} is outside the strip (${isoDate(ctx.start)} + ${DAYS - 1} days)`);
      if ((m.label ?? '').length > 8) errs.push(`mark ${m.date} label "${m.label}" is over 8 characters`);
    } catch (e) {
      errs.push(e.message);
    }
  }
  if (span) {
    try {
      parseDate(span.from);
      if (span.to) parseDate(span.to);
    } catch (e) {
      errs.push(`span: ${e.message}`);
    }
  }
  if (!marks.length && !span) errs.push('needs marks, a span, or both');
  return errs;
}
