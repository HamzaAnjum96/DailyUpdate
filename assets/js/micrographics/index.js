// Micrographic template registry.
//
// A card picks a template with `"mg": { "kind": "<kind>", ...params }`. Each template
// module exports:
//   meta     { kind, name, use, params: {name: description}, example }
//   render   (params, ctx) => svg`…` markup (or a plain SVG string), or
//            { svg, width, height } for a viewBox
//            other than 320 x 140. ctx is { start: Date, week: Number, serial: "043" }.
//   check    optional (params, ctx) => [problem, …], run by scripts/check.js
//
// To add a template: copy the closest existing file, change meta.kind and render(),
// and add it to the list below. templates.html shows it straight away.
import * as bars from './bars.js';
import * as clock from './clock.js';
import * as count from './count.js';
import * as junction from './junction.js';
import * as route from './route.js';
import * as target from './target.js';
import * as week from './week.js';
import { raw } from '../lib/markup.js';

export const templates = Object.fromEntries(
  [route, junction, week, bars, count, clock, target].map((t) => [t.meta.kind, t]),
);

export function renderMicrographic(mg, ctx) {
  const t = templates[mg?.kind];
  if (!t) throw new Error(`Unknown micrographic kind "${mg?.kind}" (have: ${Object.keys(templates).join(', ')})`);
  const out = t.render(mg, ctx);
  const res = typeof out === 'string' ? { svg: raw(out) } : 'svg' in out ? out : { svg: out };
  const { svg, width = 320, height = 140 } = res;
  return { svg, width, height };
}

export function checkMicrographic(mg, ctx) {
  const t = templates[mg?.kind];
  if (!t) return [`unknown kind "${mg?.kind}" (have: ${Object.keys(templates).join(', ')})`];
  return t.check ? t.check(mg, ctx) : [];
}
