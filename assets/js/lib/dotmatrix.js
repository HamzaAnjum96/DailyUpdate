// 5x7 dot-matrix lettering, used by the cover banner and the `count` micrographic.
import { svg } from './markup.js';

// Each glyph is 7 rows of 5 columns, top to bottom; 1 = lit dot.
export const GLYPHS = {
  M: '10001 11011 10101 10101 10001 10001 10001', C: '01110 10001 10000 10000 10000 10001 01110',
  R: '11110 10001 10001 11110 10100 10010 10001', W: '10001 10001 10001 10101 10101 10101 01010',
  K: '10001 10010 10100 11000 10100 10010 10001', H: '10001 10001 10001 11111 10001 10001 10001',
  0: '01110 10001 10011 10101 11001 10001 01110', 1: '00100 01100 00100 00100 00100 00100 01110',
  2: '01110 10001 00001 00010 00100 01000 11111', 3: '11111 00010 00100 00010 00001 10001 01110',
  4: '00010 00110 01010 10010 11111 00010 00010', 5: '11111 10000 11110 00001 00001 10001 01110',
  6: '00110 01000 10000 11110 10001 10001 01110', 7: '11111 00001 00010 00100 01000 01000 01000',
  8: '01110 10001 10001 01110 10001 10001 01110', 9: '01110 10001 10001 01111 00001 00010 01100',
  '+': '00000 00100 00100 11111 00100 00100 00000', '%': '11000 11001 00010 00100 01000 10011 00011',
  '-': '00000 00000 00000 11111 00000 00000 00000', '£': '00110 01001 01000 11100 01000 01001 11110',
  ' ': '00000 00000 00000 00000 00000 00000 00000',
};

// Dot-matrix text with its top-left at (x, y); `pitch` is the dot spacing.
// Characters from index `hotFrom` on are orange, the rest paper.
export function dots(text, x, y, pitch, hotFrom = null) {
  const r = pitch * 0.36;
  const out = [];
  [...String(text).toUpperCase()].forEach((ch, i) => {
    const rows = (GLYPHS[ch] ?? GLYPHS[' ']).split(' ');
    const on = hotFrom != null && i >= hotFrom ? 'f-hot' : 'f-paper';
    const cx = x + i * 6 * pitch + pitch / 2;
    for (let c = 0; c < 5; c++) {
      for (let row = 0; row < 7; row++) {
        out.push(svg`<circle cx="${cx + c * pitch}" cy="${y + row * pitch + pitch / 2}" r="${r}" class="${rows[row][c] === '1' ? on : 'f-off'}"/>`);
      }
    }
  });
  return svg`${out}`;
}

export const dotsWidth = (text, pitch) => [...String(text)].length * 6 * pitch - pitch;
