// clock: a dial with the hour hand moving between two times, plus a big label. For time shifts.
import { svg } from '../lib/markup.js';
import { upper } from './parts.js';

export const meta = {
  kind: 'clock',
  name: 'Clock change',
  use: 'Clocks going back or forward; anything that shifts a time.',
  params: {
    from: 'Start time, "HH:MM" (read on a 12-hour dial).',
    to: 'End time, "HH:MM".',
    big: 'Large label right of the dial, e.g. "−1H".',
    lines: 'Lines under the big label; the last one is orange.',
  },
  example: { kind: 'clock', from: '02:00', to: '01:00', big: '−1H', lines: ['BST 02:00', '→ GMT 01:00'] },
};

// Layout: dial centre and radius, hand length and the radius of the dashed arc.
const CX = 72;
const CY = 70;
const R = 54;
const HAND = 32;
const ARC_R = 42;

const at = (a, r) => [CX + r * Math.cos(a), CY + r * Math.sin(a)];

function angle(t) {
  const [h, m] = String(t).split(':').map(Number);
  return (((h % 12) + m / 60) * 30 - 90) * (Math.PI / 180);
}

export function render({ from, to, big = '', lines = [] }) {
  const out = [svg`<circle cx="${CX}" cy="${CY}" r="${R}" class="f-ink s-dim"/>`];
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 - 90) * (Math.PI / 180);
    const [x1, y1] = at(a, R - (i % 3 === 0 ? 9 : 5));
    const [x2, y2] = at(a, R - 2);
    out.push(svg`<path d="M${x1} ${y1}L${x2} ${y2}" class="${i % 3 === 0 ? 's-line' : 's-dim'}"/>`);
  }
  const a1 = angle(from);
  const a2 = angle(to);
  const [h1x, h1y] = at(a1, HAND);
  const [h2x, h2y] = at(a2, HAND);
  const [s1x, s1y] = at(a1, ARC_R);
  const [s2x, s2y] = at(a2, ARC_R);
  const large = Math.abs(a2 - a1) > Math.PI ? 1 : 0;
  const sweep = a2 < a1 ? 0 : 1;
  out.push(svg`
<path d="M${CX} ${CY}L${h1x} ${h1y}" class="s-dim s-hand"/>
<path d="M${CX} ${CY}L${h2x} ${h2y}" class="s-hot s-hand"/>
<path d="M${CX} ${CY}L${CX} ${CY - 44}" class="s-line"/>
<path d="M${s1x} ${s1y}A${ARC_R} ${ARC_R} 0 ${large} ${sweep} ${s2x} ${s2y}" class="s-hot s-arc"/>
<circle cx="${s2x}" cy="${s2y}" r="3.2" class="f-hot"/><circle cx="${CX}" cy="${CY}" r="3" class="f-hot"/>
<text x="150" y="70" class="t-pct">${big}</text>`);
  lines.forEach((line, i) => {
    out.push(svg`<text x="152" y="${92 + i * 14}" class="${i === lines.length - 1 ? 't-hot' : 't-paper'}">${upper(line)}</text>`);
  });
  return svg`${out}`;
}

export function check({ from, to, lines = [] }) {
  const ok = (t) => typeof t === 'string' && /^(?:[01]?\d|2[0-3]):[0-5]\d$/.test(t);
  const errors = ok(from) && ok(to) ? [] : ['from and to must be valid 24-hour times (HH:MM)'];
  if (!Array.isArray(lines) || !lines.every((line) => typeof line === 'string')) errors.push('lines must be an array of strings');
  else if (lines.length > 4) errors.push('lines fits at most 4 lines');
  return errors;
}
