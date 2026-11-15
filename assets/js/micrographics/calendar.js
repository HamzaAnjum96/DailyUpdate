// calendar: one or two month grids with a date range filled in, key dates picked out and
// the brief's own week outlined. For seasons and runs that go well past the week.
import { addDays, daysBetween, isoDate, monthAbbr, parseDate } from '../lib/dates.js';
import { svg } from '../lib/markup.js';
import { textWidth, upper } from './parts.js';

export const meta = {
  kind: 'calendar',
  name: 'Month calendar',
  use: 'Seasons and long runs: light trails, markets, sales that last weeks.',
  params: {
    months: 'One or two months to draw, e.g. ["2026-11", "2026-12"].',
    range: 'The run: { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD", "label": "…" }. Days past the months shown still count for the label.',
    marks: 'Up to 4 key dates picked out in white: [{ "date": "YYYY-MM-DD", "label": "Black Fri" }].',
  },
  example: {
    kind: 'calendar',
    months: ['2026-10', '2026-11'],
    range: { from: '2026-10-19', to: '2026-11-01', label: 'Works' },
    marks: [{ date: '2026-10-25', label: 'Clocks' }],
  },
};

// Layout. Each month is a 7-column grid (Monday first) MONTH_W wide, starting at X0 and
// MONTH_GAP apart. With one month, the key sits in a panel to its right instead of below.
const X0 = 10;
const MONTH_W = 146;
const MONTH_GAP = 154;
const TITLE_Y = 13;
const HEAD_Y = 25;
const GRID_Y = 29;
const ROW_H = 15;
const PANEL_X = 176;

const monthStart = (ym) => parseDate(`${ym}-01`);
const daysIn = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
const col = (d) => (d.getUTCDay() + 6) % 7; // Monday = 0
const short = (d) => `${d.getUTCDate()} ${monthAbbr(d)}`.toUpperCase();

export function render({ months, range, marks = [] }, ctx) {
  const cw = MONTH_W / 7;
  const from = range ? parseDate(range.from) : null;
  const to = range ? parseDate(range.to) : null;
  const marked = new Map(marks.map((m) => [m.date, m]));
  const weekStart = ctx.start;
  const weekEnd = addDays(ctx.start, 7);
  const out = [];

  months.forEach((ym, m) => {
    const first = monthStart(ym);
    const x0 = X0 + m * MONTH_GAP;
    out.push(svg`<text x="${x0}" y="${TITLE_Y}" class="t-hot">${upper(`${monthAbbr(first)} ${first.getUTCFullYear()}`)}</text>`);
    'MTWTFSS'.split('').forEach((l, i) => {
      out.push(svg`<text x="${x0 + i * cw + cw / 2}" y="${HEAD_Y}" text-anchor="middle" class="${i > 4 ? 't-wkd' : 't-stop'}">${l}</text>`);
    });
    const lead = col(first);
    for (let day = 1; day <= daysIn(first); day++) {
      const d = addDays(first, day - 1);
      const slot = lead + day - 1;
      const x = x0 + (slot % 7) * cw;
      const y = GRID_Y + Math.floor(slot / 7) * ROW_H;
      const inRange = from && d >= from && d <= to;
      const mark = marked.get(isoDate(d));
      const inWeek = d >= weekStart && d <= weekEnd;
      const fill = mark ? 'f-paper' : inRange ? 'f-hot' : 'f-ink s-faint';
      out.push(svg`<rect x="${x + 1}" y="${y}" width="${cw - 2}" height="${ROW_H - 2}" class="${fill}"/>`);
      if (inWeek) out.push(svg`<rect x="${x + 0.5}" y="${y - 0.5}" width="${cw - 1}" height="${ROW_H - 1}" class="s-line"/>`);
      out.push(svg`<text x="${x + cw / 2}" y="${y + 9.5}" text-anchor="middle" class="${mark || inRange ? 't-ink' : 't-stop'}">${day}</text>`);
    }
  });

  // Key: the run, each marked date, and the outlined week.
  const key = [];
  if (range) key.push({ cls: 'f-hot', text: `${range.label ? `${range.label} · ` : ''}${short(from)} → ${short(to)}` });
  for (const m of marks) key.push({ cls: 'f-paper', text: `${short(parseDate(m.date))}${m.label ? ` · ${m.label}` : ''}` });
  key.push({ cls: 'f-none s-line', text: 'This week' });
  if (months.length === 1) {
    key.forEach((k, i) => {
      const y = GRID_Y + 6 + i * 16;
      out.push(svg`<rect x="${PANEL_X}" y="${y - 6}" width="7" height="7" class="${k.cls}"/><text x="${PANEL_X + 12}" y="${y}" class="${i === 0 && range ? 't-hot' : 't-paper'}">${upper(k.text)}</text>`);
    });
  } else {
    let x = X0;
    const y = 133;
    for (const [i, k] of key.entries()) {
      out.push(svg`<rect x="${x}" y="${y - 6}" width="7" height="7" class="${k.cls}"/><text x="${x + 11}" y="${y}" class="${i === 0 && range ? 't-hot' : 't-paper'}">${upper(k.text)}</text>`);
      x += 11 + textWidth(upper(k.text)) + 10;
    }
  }
  return svg`${out}`;
}

export function check({ months, range, marks = [] }) {
  const errs = [];
  const ym = /^\d{4}-(0[1-9]|1[0-2])$/;
  if (!Array.isArray(months) || months.length < 1 || months.length > 2 || !months.every((m) => typeof m === 'string' && ym.test(m))) {
    return ['months must be one or two "YYYY-MM" months'];
  }
  if (months.length === 2 && daysBetween(monthStart(months[0]), monthStart(months[1])) <= 0) errs.push('months must be in order');
  if (range != null) {
    if (typeof range !== 'object' || Array.isArray(range)) return [...errs, 'range must be an object'];
    try {
      if (parseDate(range.to) < parseDate(range.from)) errs.push('range.to must be on or after range.from');
    } catch (e) {
      errs.push(`range: ${e.message}`);
    }
    if (range.label != null && typeof range.label !== 'string') errs.push('range.label must be a string');
  }
  if (!Array.isArray(marks)) return [...errs, 'marks must be an array'];
  if (marks.length > 4) errs.push('at most 4 marks fit in the key');
  for (const m of marks) {
    if (!m || typeof m !== 'object') {
      errs.push('each mark must be an object with a date');
      continue;
    }
    try {
      parseDate(m.date);
    } catch (e) {
      errs.push(`mark: ${e.message}`);
    }
    if (m.label != null && typeof m.label !== 'string') errs.push(`mark ${m.date} label must be a string`);
  }
  if (range == null && !marks.length) errs.push('needs a range or marks');
  if (errs.length) return errs;
  // The key must fit: in the side panel with one month, along the bottom with two.
  const texts = [
    ...(range ? [`${range.label ? `${range.label} · ` : ''}${short(parseDate(range.from))} → ${short(parseDate(range.to))}`] : []),
    ...marks.map((m) => `${short(parseDate(m.date))}${m.label ? ` · ${m.label}` : ''}`),
    'This week',
  ].map(upper);
  if (months.length === 1) {
    const room = 318 - PANEL_X - 12;
    for (const t of texts) if (textWidth(t) > room) errs.push(`key line "${t}" is too long for the side panel; shorten the label`);
  } else {
    const total = X0 + texts.reduce((sum, t) => sum + 11 + textWidth(t) + 10, 0) - 10;
    if (total > 316) errs.push('the key is too long to fit under two months; shorten the range label or drop a mark');
  }
  return errs;
}
