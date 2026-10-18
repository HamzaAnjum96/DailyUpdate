// junction: motorway schematic with two junctions, both carriageways and an exit slip.
import { svg } from '../lib/markup.js';
import { upper, xmark } from './parts.js';

const MODES = ['slip', 'clockwise', 'anticlockwise', 'both'];

export const meta = {
  kind: 'junction',
  name: 'Motorway junction',
  use: 'Motorway slip, carriageway and junction closures.',
  params: {
    road: 'Road name, drawn large top left, e.g. "M60".',
    a: 'Left junction label, e.g. "J17".',
    b: 'Right junction label, e.g. "J18" (the slip leaves here).',
    closed: `What is shut: ${MODES.map((m) => `"${m}"`).join(', ')}.`,
    slip: 'Slip destination, shown when closed is "slip", e.g. "M66 N".',
    window: 'Closure window, top right, e.g. "21:00 → 06:00 · MON–FRI".',
  },
  example: { kind: 'junction', road: 'M60', a: 'J17', b: 'J18', closed: 'slip', slip: 'M66 N', window: '21:00 → 06:00 · MON–FRI' },
};

// Layout: junction marker x positions and the two carriageway y positions.
const XA = 92;
const XB = 220;
const Y_CW = 82;
const Y_ACW = 100;

export function render({ road = 'M60', a = '', b = '', closed = 'slip', slip = '', window = '' }) {
  const out = [
    svg`<text x="14" y="40" class="t-big">${road}</text>`,
    svg`<text x="304" y="20" text-anchor="end" class="t-paper">${window}</text>`,
  ];
  for (const [x, label] of [[XA, a], [XB, b]]) {
    out.push(svg`<path d="M${x} 60V122" class="s-dim s-dash"/>`);
    out.push(svg`<rect x="${x - 15}" y="118" width="30" height="13" class="f-ink s-dim"/>`);
    out.push(svg`<text x="${x}" y="128" text-anchor="middle" class="t-paper">${label}</text>`);
  }
  out.push(svg`<path d="M14 ${Y_CW}H306" class="s-line"/>`);
  out.push(svg`<text x="304" y="${Y_CW - 6}" text-anchor="end" class="t-stop">CLOCKWISE →</text>`);
  out.push(svg`<path d="M14 ${Y_ACW}H306" class="s-line"/>`);
  out.push(svg`<text x="16" y="${Y_ACW + 12}" text-anchor="start" class="t-stop">← ANTICLOCKWISE</text>`);

  if (closed === 'slip') {
    out.push(svg`<path d="M${XB - 48} ${Y_CW}C${XB - 14} ${Y_CW} ${XB + 2} 52 ${XB + 34} 34" class="s-hot s-closed"/>`);
    out.push(xmark(XB - 4, 60, 3.5));
    out.push(svg`<text x="${XB + 38}" y="34" class="t-hot">${upper(slip)}</text>`);
  } else {
    if (closed === 'clockwise' || closed === 'both') {
      out.push(svg`<path d="M${XA} ${Y_CW}H${XB}" class="s-hot s-closed"/>`, xmark((XA + XB) / 2, Y_CW - 9, 3.5));
    }
    if (closed === 'anticlockwise' || closed === 'both') {
      out.push(svg`<path d="M${XA} ${Y_ACW}H${XB}" class="s-hot s-closed"/>`, xmark((XA + XB) / 2, Y_ACW + 9, 3.5));
    }
  }
  return svg`${out}`;
}

export function check({ closed = 'slip', a, b }) {
  const errs = [];
  if (!MODES.includes(closed)) errs.push(`closed must be one of ${MODES.join(', ')}`);
  if (!a || !b) errs.push('a and b junction labels are required');
  return errs;
}
