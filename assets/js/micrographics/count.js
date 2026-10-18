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
const MAX_PITCH = 8;
const MAX_W = 290;
const TOP = 14;

export function render({ value, caption = '', sub = '' }) {
  const v = String(value);
  const pitch = Math.min(MAX_PITCH, MAX_W / ([...v].length * 6 - 1));
  const base = TOP + 7 * pitch;
  return svg`${dots(v, (320 - dotsWidth(v, pitch)) / 2, TOP, pitch)}
<text x="160" y="${base + 22}" text-anchor="middle" class="t-paper">${upper(caption)}</text>
<text x="160" y="${base + 35}" text-anchor="middle" class="t-stop">${upper(sub)}</text>`;
}

export function check({ value }) {
  const v = String(value ?? '');
  const bad = [...v.toUpperCase()].filter((ch) => !(ch in GLYPHS));
  const errs = [];
  if (!v) errs.push('value is required');
  if (bad.length) errs.push(`value has characters with no dot-matrix glyph: ${bad.join(' ')}`);
  if ([...v].length > 6) errs.push(`value "${v}" is over 6 characters`);
  return errs;
}
