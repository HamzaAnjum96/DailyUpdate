// map: a schematic, not-to-scale map of labelled places, for "where is everything" cards
// such as the Christmas Markets sites. Positions run 0–100 across and 0–100 down.
import { svg } from '../lib/markup.js';
import { textWidth, upper } from './parts.js';

export const meta = {
  kind: 'map',
  name: 'Schematic map',
  use: 'Where things are: market sites, entrances, a venue and its nearest stops.',
  params: {
    points: 'Places: [{ "x": 0–100, "y": 0–100, "label": "Albert Sq", "hot": true, "note": "Wheel", "side": "right" }]. "hot" fills the dot orange; "note" adds a ringed callout; "side" is right (default), left, above or below.',
    landmarks: 'Optional reference places drawn as dim squares, e.g. [{ "x": 52, "y": 2, "label": "Victoria" }].',
    north: 'Optional. false hides the north arrow.',
  },
  example: {
    kind: 'map',
    points: [
      { x: 30, y: 30, label: 'Exchange Sq' },
      { x: 20, y: 62, label: 'St Ann\'s Sq', side: 'left' },
      { x: 34, y: 88, label: 'Albert Sq', hot: true, note: 'Wheel' },
    ],
    landmarks: [{ x: 40, y: 4, label: 'Victoria' }, { x: 80, y: 50, label: 'Piccadilly' }],
  },
};

// Layout: the 0–100 grid maps onto this box in the 320 x 140 viewBox.
const BOX = { x: 22, y: 12, w: 270, h: 116 };
const LABEL_H = 8;
const DOT_GAP = 6; // label offset from a plain dot
const RING_GAP = 10; // and from a ringed callout

const px = (p) => ({ x: BOX.x + (BOX.w * p.x) / 100, y: BOX.y + (BOX.h * p.y) / 100 });

// Where a label sits for a point and its text box, for drawing and for overlap checks.
function place(p, text) {
  const { x, y } = px(p);
  const w = textWidth(text);
  const side = p.side ?? 'right';
  const GAP = p.note ? RING_GAP : DOT_GAP;
  if (side === 'left') return { x: x - GAP, y: y + 2.6, anchor: 'end', box: [x - GAP - w, y - 3.4, w, LABEL_H] };
  if (side === 'above') return { x, y: y - GAP, anchor: 'middle', box: [x - w / 2, y - GAP - 6, w, LABEL_H] };
  if (side === 'below') return { x, y: y + GAP + 6, anchor: 'middle', box: [x - w / 2, y + GAP, w, LABEL_H] };
  return { x: x + GAP, y: y + 2.6, anchor: 'start', box: [x + GAP, y - 3.4, w, LABEL_H] };
}

const labelOf = (p) => upper(p.note ? `${p.label} · ${p.note}` : p.label);

export function render({ points, landmarks = [], north = true }) {
  const out = [];
  if (north) out.push(svg`<path d="M306 22V8M302 12L306 7L310 12" class="s-line"/><text x="306" y="31" text-anchor="middle" class="t-stop">N</text>`);
  for (const l of landmarks) {
    const { x, y } = px(l);
    const at = place(l, upper(l.label));
    out.push(svg`<rect x="${x - 3}" y="${y - 3}" width="6" height="6" class="f-ink s-dim"/><text x="${at.x}" y="${at.y}" text-anchor="${at.anchor}" class="t-stop">${upper(l.label)}</text>`);
  }
  for (const p of points) {
    const { x, y } = px(p);
    const at = place(p, labelOf(p));
    if (p.note) out.push(svg`<circle cx="${x}" cy="${y}" r="7" class="f-none s-hot"/>`);
    out.push(svg`<circle cx="${x}" cy="${y}" r="3.4" class="${p.hot ? 'f-hot' : 'f-ink s-stop'}"/>`);
    out.push(svg`<text x="${at.x}" y="${at.y}" text-anchor="${at.anchor}" class="${p.hot || p.note ? 't-hot' : 't-paper'}">${labelOf(p)}</text>`);
  }
  return svg`${out}`;
}

const overlaps = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];

export function check({ points, landmarks = [] }) {
  if (!Array.isArray(points) || !points.length) return ['points must be a non-empty array'];
  if (!Array.isArray(landmarks)) return ['landmarks must be an array'];
  const errs = [];
  const all = [...points.map((p) => ({ p, text: null })), ...landmarks.map((p) => ({ p, text: null }))];
  for (const { p } of all) {
    if (!p || typeof p !== 'object') return ['each point must be an object'];
    if (![p.x, p.y].every((v) => Number.isFinite(v) && v >= 0 && v <= 100)) errs.push(`"${p.label}" needs x and y from 0 to 100`);
    if (typeof p.label !== 'string' || !p.label.trim()) errs.push('every point needs a label');
    if (p.side != null && !['right', 'left', 'above', 'below'].includes(p.side)) errs.push(`"${p.label}" side must be right, left, above or below`);
  }
  if (errs.length) return errs;
  // Labels must stay inside the figure and clear of each other.
  const boxes = [...points.map((p) => [p, place(p, labelOf(p)).box]), ...landmarks.map((p) => [p, place(p, upper(p.label)).box])];
  for (const [p, b] of boxes) {
    if (b[0] < 2 || b[0] + b[2] > 318 || b[1] < 0 || b[1] + b[3] > 140) errs.push(`label "${p.label}" runs off the figure; move it or set "side"`);
  }
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (overlaps(boxes[i][1], boxes[j][1])) errs.push(`labels "${boxes[i][0].label}" and "${boxes[j][0].label}" overlap; set "side" on one`);
    }
  }
  return errs;
}
