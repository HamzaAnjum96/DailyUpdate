// Checks every brief in data/briefs/index.json, or the brief files given as arguments,
// then builds each one with the site's own modules. CI runs this before deploying, so a
// bad edit fails here instead of on the live page.
//
//   node scripts/check.js                         all listed briefs
//   node scripts/check.js data/briefs/2026-w44.json

import { readdir, readFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDeck } from '../assets/js/deck.js';
import { validateBrief, validateBriefIndex } from '../assets/js/lib/validation.js';
import { renderMicrographic } from '../assets/js/micrographics/index.js';
import { parseDate } from '../assets/js/lib/dates.js';

const BRIEFS = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'briefs');
// Inspect geometry only: names such as "Infinity Bridge" are valid SVG text.
const SVG_GEOMETRY = /\b(?:x|y|x1|y1|x2|y2|cx|cy|r|rx|ry|width|height|viewBox|d|points|transform|stroke-width)\s*=\s*["']([^"']*)["']/g;

async function main() {
  let files = process.argv.slice(2);
  let failed = false;
  if (!files.length) {
    const index = JSON.parse(await readFile(join(BRIEFS, 'index.json'), 'utf8'));
    const { errors } = validateBriefIndex(index);
    if (errors.length) throw new Error(`index.json: ${errors.join('; ')}`);
    const { briefs } = index;
    files = briefs.map((id) => join(BRIEFS, `${id}.json`));
    const listed = new Set(briefs.map((id) => `${id}.json`));
    for (const f of await readdir(BRIEFS)) {
      if (f.endsWith('.json') && f !== 'index.json' && !listed.has(f)) {
        console.warn(`! ${f} is not listed in data/briefs/index.json, so the site can't show it`);
      }
    }
  }
  for (const file of files) {
    let brief;
    try {
      brief = JSON.parse(await readFile(file, 'utf8'));
    } catch (e) {
      console.error(`✗ ${basename(file)}: ${e.message}`);
      failed = true;
      continue;
    }
    const { errors, warnings } = validateBrief(brief, { id: basename(file, '.json') });
    if (!errors.length) {
      try {
        // buildDeck deliberately drops broken figures in the browser. Test them
        // directly here so a render failure cannot silently pass the deploy gate.
        const ctx = { start: parseDate(brief.start), week: brief.week, serial: String(brief.week).padStart(3, '0') };
        for (const [i, card] of brief.cards.entries()) {
          if (card.mg) {
            try {
              const graphic = renderMicrographic(card.mg, ctx);
              const invalidGeometry = [...String(graphic.svg).matchAll(SVG_GEOMETRY)]
                .some(([, value]) => /NaN|Infinity/.test(value));
              if (![graphic.width, graphic.height].every((value) => Number.isFinite(value) && value > 0) || invalidGeometry) {
                throw new Error('non-finite or invalid SVG geometry');
              }
            } catch (e) {
              errors.push(`card ${String(i + 1).padStart(2, '0')}: micrographic render failed: ${e.message}`);
            }
          }
        }
        if (!errors.length) buildDeck(brief);
      } catch (e) {
        errors.push(`build failed: ${e.message}`);
      }
    }
    const mark = errors.length ? '✗' : '✓';
    console.log(`${mark} ${basename(file)}: W${brief?.week ?? "?"}, ${brief?.cards?.length ?? 0} cards, ${brief?.sources?.length ?? 0} sources`);
    for (const e of errors) console.log(`    error: ${e}`);
    for (const w of warnings) console.log(`    warning: ${w}`);
    failed ||= errors.length > 0;
  }
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(`✗ ${error.message}`);
  process.exitCode = 1;
});
