// bars: one sale example as "was" and "now" bars on a shared £0 → was scale.
import { svg } from '../lib/markup.js';
import { money, upper } from './parts.js';

export const meta = {
  kind: 'bars',
  name: 'Price bars',
  use: 'A sale example with its original and current price.',
  params: {
    was: 'Original price, a number.',
    now: 'Sale price, a number.',
    item: 'Product label under the percentage.',
    pct: "Optional. The retailer's own % label; worked out from was and now when left out.",
  },
  example: { kind: 'bars', was: 37.99, now: 8, item: 'Pyjama set', pct: 79 },
};

// Layout: the bars start at X0 and the full-price bar is W wide.
const X0 = 150;
const W = 154;

export function render({ was, now, item = '', pct }) {
  was = Number(was);
  now = Number(now);
  pct = pct ?? Math.round((1 - now / was) * 100);
  return svg`
<text x="14" y="78" class="t-pct">-${pct}%</text>
<text x="16" y="98" class="t-stop">${upper(item)}</text>
<text x="${X0}" y="30" class="t-stop">WAS ${money(was)}</text>
<rect x="${X0}" y="35" width="${W}" height="15" class="f-ink s-dim"/>
<text x="${X0}" y="70" class="t-hot">NOW ${money(now)}</text>
<rect x="${X0}" y="75" width="${Math.max(2, W * (now / was))}" height="15" class="f-hot"/>
<path d="M${X0} 104H${X0 + W}M${X0} 100V108M${X0 + W} 100V108" class="s-dim"/>
<text x="${X0}" y="120" class="t-stop">£0</text>
<text x="${X0 + W}" y="120" text-anchor="end" class="t-stop">${money(was)}</text>`;
}

export function check({ was, now, pct }) {
  const errors = [];
  if (!(Number.isFinite(was) && was > 0 && Number.isFinite(now) && now >= 0)) {
    errors.push('was and now must be finite prices (was > 0, now >= 0)');
  } else if (now > was) {
    errors.push('now is higher than was');
  }
  if (pct != null && !(Number.isFinite(pct) && pct >= 0 && pct <= 100)) errors.push('pct must be a number from 0 to 100');
  return errors;
}
