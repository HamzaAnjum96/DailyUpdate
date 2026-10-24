// count: one headline number in dot-matrix digits, with a caption and a sub-line.
import { dots, dotsWidth, GLYPHS } from '../lib/dotmatrix.js';
import { svg } from '../lib/markup.js';
import { upper } from './parts.js';

export const meta = {
  kind: 'count',
  name: 'Dot-matrix count',
  use: 'One headline number: listings, items, collections.',
  params: {
    value: 'Up to 6 characters from 0-9 + - % £ and space, e.g. "644" or "3000+".',
    caption: 'Line under the number.',
    sub: 'Smaller second line, e.g. "694 last week".',
  },
  example: { kind: 'count', value: '644', caption: 'Clearance items online', sub: '694 last week' },
};

// Layout: dots are at most MAX_PITCH apart and the number fits in MAX_W, starting at TOP.
// Orange corner brackets sit PAD outside the number, with arms ARM long.
const MAX_PITCH = 9;
const MAX_W = 290;
const TOP = 10;
const PAD = 12;
const ARM = 7;

export function render({ value, caption = '', sub = '' }) {
  const v = String(value);
  const pitch = Math.min(MAX_PITCH, MAX_W / ([...v].length * 6 - 1));
  const w = dotsWidth(v, pitch);
  const x = (320 - w) / 2;
  const base = TOP + 7 * pitch;
  const l = x - PAD; // bracket box: left, right, top, bottom
  const r = x + w + PAD;
  const t = TOP - 6;
  const b = base + 6;
  return svg`<path d="M${l} ${t + 7}V${t}H${l + ARM}M${r - ARM} ${t}H${r}V${t + 7}M${r} ${b - 7}V${b}H${r - ARM}M${l + ARM} ${b}H${l}V${b - 7}" class="s-hot"/>
${dots(v, x, TOP, pitch)}
<text x="160" y="${base + 23}" text-anchor="middle" class="t-paper">${upper(caption)}</text>
<text x="160" y="${base + 36}" text-anchor="middle" class="t-stop">${upper(sub)}</text>`;
}

export function check({ value }) {
  if (!(typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value)))) {
    return ['value must be a string or finite number'];
  }
  const v = String(value ?? '');
  const bad = [...v.toUpperCase()].filter((ch) => !(ch in GLYPHS));
  const errs = [];
  if (!v.trim()) errs.push('value is required');
  if (bad.length) errs.push(`value has characters with no dot-matrix glyph: ${bad.join(' ')}`);
  if ([...v].length > 6) errs.push(`value "${v}" is over 6 characters`);
  return errs;
}
