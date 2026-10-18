// Tagged templates for building HTML and SVG as strings.
//
//   html`<p class="${cls}">${text}</p>`
//
// Interpolated values are escaped unless they are markup themselves (from html``,
// svg`` or raw()). Arrays are joined, null/undefined/false render as nothing, and
// numbers are rounded to 2 decimals so SVG coordinates stay short.

class Markup {
  constructor(s) {
    this.s = s;
  }
  toString() {
    return this.s;
  }
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' };

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

export const raw = (s) => new Markup(String(s));

export const num = (n) => String(Math.round(n * 100) / 100);

function part(v) {
  if (v == null || v === false) return '';
  if (v instanceof Markup) return v.s;
  if (Array.isArray(v)) return v.map(part).join('');
  if (typeof v === 'number') return num(v);
  return esc(v);
}

export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += part(values[i]) + strings[i + 1];
  return new Markup(out);
}

export const svg = html;
