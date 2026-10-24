// route: line diagram for tram, rail and bus closures, terminus changes and shuttles.
import { svg } from '../lib/markup.js';
import { textWidth, upper, xmark } from './parts.js';

export const meta = {
  kind: 'route',
  name: 'Route diagram',
  use: 'Tram, rail and bus closures; replacement buses and shuttles.',
  params: {
    rows: 'Lines drawn top to bottom, up to 3.',
    'rows[].name': 'Line label, e.g. "Altrincham line".',
    'rows[].stops': 'Stop names, up to 7, ~14 characters each (abbreviate: "Deansgate-C").',
    'rows[].closed': 'Closed stretches as [from, to] stop indexes, e.g. [[0, 3]].',
    'rows[].end': 'Optional. Stop index drawn as an orange terminus square.',
    'rows[].mark': 'Optional. Stop index ringed in orange.',
    'rows[].mark_label': 'Optional. Text above the ringed stop, e.g. "Stadium".',
  },
  example: {
    kind: 'route',
    rows: [
      { name: 'Altrincham line', stops: ['Deansgate-C', 'Trafford Bar', 'Old Trafford', 'Stretford', 'Sale', 'Altrincham'], closed: [[0, 5]] },
      { name: 'Airport + East Didsbury lines', stops: ['Trafford Bar', 'Firswood', 'Chorlton', "St Werburgh's Rd"], closed: [[0, 1]], end: 1 },
      { name: 'Express shuttle · every 15 min', stops: ['Piccadilly', 'Deansgate-C', 'Wharfside', 'IWM', 'Village'], mark: 2, mark_label: 'Stadium' },
    ],
  },
};

// Layout. Each row is ROW_H tall with its line LINE_DY below the row top; stops are
// spread evenly from X_FIRST to X_LAST. The figure grows past MIN_H for 3 rows.
const ROW_H = 56;
const LINE_DY = 30;
const X_FIRST = 20;
const X_LAST = 300;
const MIN_H = 140;
const NAME_CHAR_W = 5.3; // the row name is 7px with wider letter-spacing

export function render({ rows = [] }) {
  const height = Math.max(MIN_H, 8 + rows.length * ROW_H);
  const top = (height - rows.length * ROW_H) / 2;
  return { svg: svg`${rows.map((row, i) => drawRow(row, top + i * ROW_H))}`, height };
}

function drawRow(row, y0) {
  const ly = y0 + LINE_DY;
  const stops = row.stops ?? [];
  const k = stops.length;
  const xs = stops.map((_, i) => X_FIRST + ((X_LAST - X_FIRST) * i) / Math.max(1, k - 1));

  // closed holds segment indexes: segment i joins stop i to stop i + 1
  const closed = new Set();
  for (const [a, b] of row.closed ?? []) for (let i = a; i < b && i < k - 1; i++) closed.add(i);
  const hot = (i) => closed.has(i) || closed.has(i - 1);

  const out = [svg`<text x="14" y="${y0 + 9}" class="t-name">${upper(row.name)}</text>`];

  for (let i = 0; i < k - 1; i++) {
    out.push(svg`<path d="M${xs[i]} ${ly}H${xs[i + 1]}" class="${closed.has(i) ? 's-hot s-closed' : 's-line'}"/>`);
  }

  xs.forEach((x, i) => {
    if (row.end === i) {
      out.push(svg`<rect x="${x - 4.5}" y="${ly - 4.5}" width="9" height="9" class="f-hot"/>`);
    } else {
      out.push(svg`<circle cx="${x}" cy="${ly}" r="3.4" class="f-ink ${hot(i) ? 's-hot' : 's-stop'}"/>`);
    }
    if (row.mark === i) {
      out.push(svg`<circle cx="${x}" cy="${ly}" r="7.5" class="f-none s-hot"/>`);
      if (row.mark_label) {
        // nudge the label right, off the end of the row name above it, but keep it by its stop
        const w = textWidth(row.mark_label);
        const nameEnd = 14 + [...String(row.name ?? '')].length * NAME_CHAR_W + 6;
        const tx = Math.min(Math.max(x, 14 + w / 2, Math.min(nameEnd + w / 2, x + w / 2 + 8)), 306 - w / 2);
        out.push(svg`<text x="${tx}" y="${ly - 12}" text-anchor="middle" class="t-hot">${upper(row.mark_label)}</text>`);
      }
    }
  });

  // one x per closed run, on the line at the run's midpoint
  let run = [];
  for (let i = 0; i < k; i++) {
    if (closed.has(i)) run.push(i);
    if (run.length && (!closed.has(i) || i === k - 1)) {
      const mid = (xs[run[0]] + xs[run[run.length - 1] + 1]) / 2;
      out.push(svg`<circle cx="${mid}" cy="${ly}" r="5.5" class="f-ink"/>`, xmark(mid, ly, 3));
      run = [];
    }
  }

  // stop labels on two levels: each goes on the first level where it clears its neighbour
  const lastEnd = [-Infinity, -Infinity];
  stops.forEach((name, i) => {
    const w = textWidth(name);
    const x1 = i === 0 ? xs[i] - 3 : i === k - 1 ? xs[i] + 3 - w : xs[i] - w / 2;
    const lvl = x1 > lastEnd[0] + 4 ? 0 : x1 > lastEnd[1] + 4 ? 1 : lastEnd[0] < lastEnd[1] ? 0 : 1;
    lastEnd[lvl] = x1 + w;
    out.push(svg`<text x="${x1}" y="${ly + 13 + lvl * 9}" class="${hot(i) ? 't-paper' : 't-stop'}">${upper(name)}</text>`);
  });

  return out;
}

export function check({ rows }) {
  const errs = [];
  if (!Array.isArray(rows) || !rows.length) return ['rows must be a non-empty array'];
  if (rows.length > 3) errs.push(`${rows.length} rows; the figure fits 3`);
  rows.forEach((row, r) => {
    const k = row.stops?.length ?? 0;
    if (k < 2) errs.push(`rows[${r}] needs at least 2 stops`);
    if (k > 7) errs.push(`rows[${r}] has ${k} stops; labels collide past 7`);
    for (const range of row.closed ?? []) {
      const [a, b] = range;
      if (!(Number.isInteger(a) && Number.isInteger(b) && a >= 0 && a < b && b < k)) {
        errs.push(`rows[${r}].closed ${JSON.stringify(range)} must be [from, to] with 0 <= from < to <= ${k - 1}`);
      }
    }
    for (const key of ['end', 'mark']) {
      if (row[key] != null && !(Number.isInteger(row[key]) && row[key] >= 0 && row[key] < k)) {
        errs.push(`rows[${r}].${key} must be a stop index 0..${k - 1}`);
      }
    }
  });
  return errs;
}
