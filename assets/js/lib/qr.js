// QR code as an inline SVG: one 1x1 square per dark module, with a 1-module quiet border.
import qrcode from '../../vendor/qrcode-generator.js';
import { raw, svg } from './markup.js';

export function qrSvg(url) {
  const q = qrcode(0, 'M');
  q.addData(url);
  q.make();
  const n = q.getModuleCount();
  let d = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + 1} ${r + 1}h1v1h-1z`;
  }
  const size = n + 2;
  return svg`<svg class="qr" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-label="QR code to ${url}"><rect width="${size}" height="${size}" class="f-qrbg"/><path d="${raw(d)}" class="f-ink"/></svg>`;
}
