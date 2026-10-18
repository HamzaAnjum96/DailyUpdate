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
import { parseDate } from '../assets/js/lib/dates.js';
import { checkMicrographic } from '../assets/js/micrographics/index.js';
import { TYPE_ORDER, TYPES } from '../assets/js/types.js';

const BRIEFS = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'briefs');

const isStr = (v) => typeof v === 'string' && v.trim() !== '';
const isPair = (v) => Array.isArray(v) && v.length === 2 && isStr(v[0]) && isStr(v[1]);

function checkBrief(b) {
  const errors = [];
  const warnings = [];

  if (!Number.isInteger(b.week)) errors.push('week must be a whole number');
  let start;
  for (const key of ['start', 'end', 'checked']) {
    try {
      const d = parseDate(b[key]);
      if (key === 'start') start = d;
    } catch (e) {
      errors.push(`${key}: ${e.message}`);
    }
  }
  if (start && start.getUTCDay() !== 0) warnings.push('start is not a Sunday; the week strip begins on the start date');
  if (!Array.isArray(b.sources) || !b.sources.every(isPair)) errors.push('sources must be a list of [url, label] pairs');
  if (!Array.isArray(b.cards) || !b.cards.length) return { errors: [...errors, 'cards must be a non-empty list'], warnings };

  const nSources = b.sources?.length ?? 0;
  const ctx = start && { start, week: b.week, serial: String(b.week).padStart(3, '0') };
  let lastType = -1;

  b.cards.forEach((c, i) => {
    const at = `card ${String(i + 1).padStart(2, '0')}${c.title ? ` "${c.title}"` : ''}`;
    if (!TYPES[c.type]) {
      errors.push(`${at}: type "${c.type}" is not one of ${TYPE_ORDER.join(', ')}`);
    } else {
      const order = TYPE_ORDER.indexOf(c.type);
      if (order < lastType) warnings.push(`${at}: ${c.type} card comes after ${TYPE_ORDER[lastType]} cards; the cover groups cards by type`);
      lastType = Math.max(lastType, order);
    }
    for (const key of ['title', 'body', 'when', 'what', 'where']) if (!isStr(c[key])) errors.push(`${at}: ${key} is required`);
    if (c.meter != null && !(Number.isInteger(c.meter) && c.meter >= 0 && c.meter <= 5)) errors.push(`${at}: meter must be 0–5`);
    if (c.meter == null && !c.chip) warnings.push(`${at}: no meter or chip`);
    if (c.links && !(Array.isArray(c.links) && c.links.every(isPair))) errors.push(`${at}: links must be [url, label] pairs`);
    for (const s of c.src ?? []) {
      if (!(Number.isInteger(s) && s >= 1 && s <= nSources)) errors.push(`${at}: src ${s} is not a source number (1–${nSources})`);
    }
    if (c.mg) {
      if (ctx) for (const p of checkMicrographic(c.mg, ctx)) errors.push(`${at}: mg (${c.mg.kind}): ${p}`);
      if (!(Array.isArray(c.mg_caption) && c.mg_caption.length === 2)) warnings.push(`${at}: mg_caption should be [left, right]`);
      if (!isStr(c.mg_alt)) warnings.push(`${at}: mg_alt (screen-reader description) is missing`);
    } else {
      warnings.push(`${at}: no micrographic`);
    }
  });

  const priority = b.cards.filter((c) => c.priority).length;
  if (priority > 1) errors.push(`${priority} priority cards; there should be one`);
  if (priority === 0) warnings.push('no priority card; the cover will tease card 01');

  if (!errors.length) {
    try {
      buildDeck(b);
    } catch (e) {
      errors.push(`build failed: ${e.message}`);
    }
  }
  return { errors, warnings };
}

async function main() {
  let files = process.argv.slice(2);
  let failed = false;
  if (!files.length) {
    const { briefs } = JSON.parse(await readFile(join(BRIEFS, 'index.json'), 'utf8'));
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
    const { errors, warnings } = checkBrief(brief);
    const mark = errors.length ? '✗' : '✓';
    console.log(`${mark} ${basename(file)}: W${brief.week}, ${brief.cards?.length ?? 0} cards, ${brief.sources?.length ?? 0} sources`);
    for (const e of errors) console.log(`    error: ${e}`);
    for (const w of warnings) console.log(`    warning: ${w}`);
    failed ||= errors.length > 0;
  }
  process.exit(failed ? 1 : 0);
}

main();
