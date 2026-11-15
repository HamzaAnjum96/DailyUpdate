// schedule: several things across the brief's Sunday-to-Sunday days, one row each,
// so a card can show which day each one is on at a glance.
import { addDays, daysBetween, isoDate, parseDate } from '../lib/dates.js';
import { svg } from '../lib/markup.js';
import { upper } from './parts.js';

export const meta = {
  kind: 'schedule',
  name: 'Week schedule',
  use: 'Several items over the week, one row each: closures, festivals in different towns, a venue\'s shows.',
  params: {
    rows: 'Up to 4 rows: [{ "label": "Bolton", "days": ["YYYY-MM-DD", …] or "all", "note": "17:00–21:00", "more": true }]. "label" up to 18 characters, "note" up to 26. "more": true adds an arrow for a run that carries on past the week.',
  },
  example: {
    kind: 'schedule',
    rows: [
      { label: 'Bolton', days: ['2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25'], note: '17:00–21:00' },
      { label: 'Rochdale', days: ['2026-10-23', '2026-10-24', '2026-10-25'], note: '17:00–20:00' },
      { label: 'Warm spaces', days: 'all', note: 'All libraries', more: true },
    ],
  },
};

// Layout: labels and notes in the left column, then 8 day columns from GX to GX_END.
// The block is centred vertically when there are fewer rows than fill the figure.
const DAYS = 8;
const GX = 136;
const GX_END = 300;
const HEAD_Y = 11;
const DATE_Y = 22;
const ROW_Y = 28;
const ROW_H = 27;
const CELL_H = 15;

export function render({ rows }, ctx) {
  const cw = (GX_END - GX) / DAYS;
  const days = Array.from({ length: DAYS }, (_, i) => addDays(ctx.start, i));
  const content = ROW_Y + rows.length * ROW_H;
  const height = Math.max(140, content + 4);
  const dy = Math.max(0, (140 - content) / 2);
  const out = [];
  days.forEach((d, i) => {
    const cx = GX + i * cw + cw / 2;
    const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
    out.push(svg`<text x="${cx}" y="${HEAD_Y + dy}" text-anchor="middle" class="${weekend ? 't-wkd' : 't-stop'}">${'SMTWTFS'[d.getUTCDay()]}</text>`);
    out.push(svg`<text x="${cx}" y="${DATE_Y + dy}" text-anchor="middle" class="t-stop">${d.getUTCDate()}</text>`);
  });
  rows.forEach((row, r) => {
    const y = ROW_Y + dy + r * ROW_H;
    const on = new Set(row.days === 'all' ? days.map(isoDate) : row.days);
    out.push(svg`<text x="12" y="${y + 9}" class="t-paper">${upper(row.label)}</text>`);
    if (row.note) out.push(svg`<text x="12" y="${y + 18}" class="t-sub">${upper(row.note)}</text>`);
    days.forEach((d, i) => {
      const hot = on.has(isoDate(d));
      out.push(svg`<rect x="${GX + i * cw + 1}" y="${y + 2}" width="${cw - 2}" height="${CELL_H}" class="${hot ? 'f-hot' : 'f-ink s-faint'}"/>`);
    });
    if (row.more) out.push(svg`<path d="M${GX_END + 3} ${y + 4}L${GX_END + 11} ${y + 9.5}L${GX_END + 3} ${y + 15}Z" class="f-hot"/>`);
    if (r < rows.length - 1) out.push(svg`<path d="M12 ${y + ROW_H - 3}H${GX_END}" class="s-faint"/>`);
  });
  return { svg: svg`${out}`, height };
}

export function check({ rows }, ctx) {
  if (!Array.isArray(rows) || !rows.length) return ['rows must be a non-empty array'];
  const errs = [];
  if (rows.length > 4) errs.push(`${rows.length} rows; the figure fits 4`);
  rows.forEach((row, r) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return errs.push(`rows[${r}] must be an object`);
    if (typeof row.label !== 'string' || !row.label.trim()) errs.push(`rows[${r}].label is required`);
    else if (row.label.length > 18) errs.push(`rows[${r}].label "${row.label}" is over 18 characters`);
    if (row.note != null && (typeof row.note !== 'string' || row.note.length > 26)) errs.push(`rows[${r}].note must be text of up to 26 characters`);
    if (row.days === 'all') return;
    if (!Array.isArray(row.days) || !row.days.length) return errs.push(`rows[${r}].days must be "all" or a list of dates`);
    for (const iso of row.days) {
      try {
        const i = daysBetween(ctx.start, parseDate(iso));
        if (i < 0 || i >= DAYS) errs.push(`rows[${r}] day ${iso} is outside the week strip`);
      } catch (e) {
        errs.push(`rows[${r}]: ${e.message}`);
      }
    }
  });
  return errs;
}
