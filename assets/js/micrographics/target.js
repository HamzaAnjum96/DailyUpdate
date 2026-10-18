// target: the concentric "BASE DIA" schematic beside the cover's priority teaser. Decorative.
import { svg } from '../lib/markup.js';

export const meta = {
  kind: 'target',
  name: 'Target dial',
  use: "Cover ornament next to the priority card's teaser. Takes no params.",
  params: {},
  example: { kind: 'target' },
};

const SIZE = 140;
const RINGS = [62, 50, 38, 26, 14]; // the innermost ring is orange

export function render() {
  const c = SIZE / 2;
  const rad = (deg) => (deg * Math.PI) / 180;
  const out = RINGS.map((r, i) => svg`<circle cx="${c}" cy="${c}" r="${r}" class="f-none ${i === RINGS.length - 1 ? 's-hot' : 's-dim'}"/>`);
  out.push(svg`<path d="M${c - 66} ${c}H${c + 66}M${c} ${c - 66}V${c + 66}" class="s-faint"/>`);
  for (let deg = 0; deg < 360; deg += 15) {
    const a = rad(deg);
    const r1 = deg % 45 ? 56 : 52;
    out.push(svg`<path d="M${c + r1 * Math.cos(a)} ${c + r1 * Math.sin(a)}L${c + 62 * Math.cos(a)} ${c + 62 * Math.sin(a)}" class="${deg % 90 === 0 ? 's-line' : 's-dim'}"/>`);
  }
  const m = rad(-45);
  out.push(svg`<path d="M${c} ${c - 50}A50 50 0 0 1 ${c + 50} ${c}" class="s-hot s-arcw"/>`);
  out.push(svg`<circle cx="${c + 50 * Math.cos(m)}" cy="${c + 50 * Math.sin(m)}" r="5" class="f-hot"/><circle cx="${c}" cy="${c}" r="4" class="f-hot"/>`);
  return { svg: svg`${out}`, width: SIZE, height: SIZE };
}
