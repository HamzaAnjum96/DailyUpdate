// Shared pieces for micrographic templates.
import { svg } from '../lib/markup.js';

// Approximate width of one 7.5px mono capital, letter-spacing included, in viewBox
// units. Templates use it to keep neighbouring labels from overlapping.
export const CHAR_W = 5.1;

export const textWidth = (s) => [...String(s)].length * CHAR_W;

export const upper = (s) => String(s ?? '').toUpperCase();

export const money = (n) =>
  '£' + Number(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Orange "x" centred on (x, y), half-size s.
export const xmark = (x, y, s = 4) =>
  svg`<path d="M${x - s} ${y - s}L${x + s} ${y + s}M${x + s} ${y - s}L${x - s} ${y + s}" class="s-hot s-x"/>`;
