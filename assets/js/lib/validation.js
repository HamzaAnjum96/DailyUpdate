// Shared, browser-safe validation for published briefs and the archive index.
import { addDays, daysBetween, isoWeek, isoWeekYear, pad2, parseDate } from './dates.js';
import { checkMicrographic } from '../micrographics/index.js';
import { TYPE_ORDER, TYPES } from '../types.js';

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isStr = (v) => typeof v === 'string' && v.trim() !== '';
export const isBriefId = (v) => typeof v === 'string' && /^\d{4}-w(?:0[1-9]|[1-4]\d|5[0-3])$/.test(v);

export function isHttpUrl(value) {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value) || /[\s\\]/.test(value)) return false;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !!url.hostname && !url.username && !url.password;
  } catch {
    return false;
  }
}

function checkLinks(value, label, errors) {
  if (!Array.isArray(value)) return errors.push(`${label} must be a list of [url, label] pairs`);
  value.forEach((pair, i) => {
    if (!Array.isArray(pair) || pair.length !== 2 || !isStr(pair[1])) {
      errors.push(`${label}[${i}] must be a [url, non-empty label] pair`);
    } else if (!isHttpUrl(pair[0])) {
      errors.push(`${label}[${i}] URL must be an absolute http:// or https:// URL without credentials`);
    }
  });
}

export function validateBriefIndex(index) {
  const errors = [];
  if (!isObject(index) || !Array.isArray(index.briefs) || !index.briefs.length) {
    return { errors: ['briefs must be a non-empty list of brief ids'], warnings: [] };
  }
  index.briefs.forEach((id, i) => {
    if (!isBriefId(id)) errors.push(`briefs[${i}] must be a YYYY-wNN id with a week from 01 to 53`);
    else {
      // The ISO week containing 28 December is always the year's last week.
      if (Number(id.slice(6)) > isoWeek(parseDate(`${id.slice(0, 4)}-12-28`))) errors.push(`${id} does not exist in its ISO week year`);
      if (i > 0 && isBriefId(index.briefs[i - 1]) && index.briefs[i - 1] < id) errors.push('briefs must be ordered newest first');
    }
  });
  if (new Set(index.briefs).size !== index.briefs.length) errors.push('briefs must not contain duplicate ids');
  return { errors, warnings: [] };
}

export function validateBrief(b, { id } = {}) {
  const errors = [];
  const warnings = [];
  if (!isObject(b)) return { errors: ['brief must be an object'], warnings };

  if (!Number.isInteger(b.week) || b.week < 1 || b.week > 53) errors.push('week must be a whole number from 1 to 53');
  const dates = {};
  for (const key of ['start', 'end', 'checked']) {
    try {
      dates[key] = parseDate(b[key]);
    } catch (e) {
      errors.push(`${key}: ${e.message}`);
    }
  }
  const { start, end } = dates;
  if (start) {
    if (start.getUTCDay() !== 0) errors.push('start must be a Sunday');
    const monday = addDays(start, 1);
    if (b.week !== isoWeek(monday)) errors.push(`week must be ${isoWeek(monday)} for the Monday after start`);
    if (id !== undefined) {
      const expected = `${String(isoWeekYear(monday)).padStart(4, '0')}-w${pad2(isoWeek(monday))}`;
      if (id !== expected) errors.push(`brief id must be ${expected} for this date range`);
    }
  }
  if (start && end && daysBetween(start, end) !== 7) errors.push('end must be exactly 7 days after start (Sunday to Sunday)');
  for (const key of ['rev', 'tz']) if (b[key] != null && !isStr(b[key])) errors.push(`${key} must be a non-empty string`);
  if (b.note != null && typeof b.note !== 'string') errors.push('note must be a string');
  checkLinks(b.sources, 'sources', errors);
  if (!Array.isArray(b.cards) || !b.cards.length) return { errors: [...errors, 'cards must be a non-empty list'], warnings };

  const nSources = Array.isArray(b.sources) ? b.sources.length : 0;
  const ctx = start && { start, week: Number.isInteger(b.week) ? b.week : 0, serial: Number.isInteger(b.week) ? String(b.week).padStart(3, '0') : '000' };
  let priority = 0;
  b.cards.forEach((c, i) => {
    const at = `card ${pad2(i + 1)}${isStr(c?.title) ? ` "${c.title}"` : ''}`;
    if (!isObject(c)) return errors.push(`${at}: must be an object`);
    if (typeof c.type !== 'string' || !Object.hasOwn(TYPES, c.type)) errors.push(`${at}: type must be one of ${TYPE_ORDER.join(', ')}`);
    for (const key of ['title', 'body', 'when', 'what', 'where']) if (!isStr(c[key])) errors.push(`${at}: ${key} is required and must be a non-empty string`);
    for (const key of ['sub', 'short', 'tag', 'headline', 'meter_label', 'chip', 'mg_alt']) {
      if (c[key] != null && typeof c[key] !== 'string') errors.push(`${at}: ${key} must be a string`);
    }
    if (c.priority != null && typeof c.priority !== 'boolean') errors.push(`${at}: priority must be true or false`);
    if (c.priority === true) priority++;
    if (c.days == null) warnings.push(`${at}: no days, so its day strip is blank`);
    else if (!(Array.isArray(c.days) && c.days.every((d) => DAY_KEYS.includes(d)) && new Set(c.days).size === c.days.length)) {
      errors.push(`${at}: days must be a list of ${DAY_KEYS.join(', ')} with no repeats`);
    } else if (!c.days.length) warnings.push(`${at}: days is empty, so nothing is orange in its Mon–Sun strip`);
    if (c.meter != null && !(Number.isInteger(c.meter) && c.meter >= 0 && c.meter <= 5)) errors.push(`${at}: meter must be 0–5`);
    if (c.meter == null && !c.chip) warnings.push(`${at}: no meter or chip`);
    if (c.links != null) checkLinks(c.links, `${at}: links`, errors);
    if (c.src != null && !Array.isArray(c.src)) errors.push(`${at}: src must be a list of source numbers`);
    else for (const s of c.src ?? []) {
      if (!(Number.isInteger(s) && s >= 1 && s <= nSources)) errors.push(`${at}: src ${JSON.stringify(s)} is not a source number (1–${nSources})`);
    }
    if (c.mg != null) {
      if (!isObject(c.mg)) errors.push(`${at}: mg must be an object`);
      else if (ctx) {
        try {
          for (const p of checkMicrographic(c.mg, ctx)) errors.push(`${at}: mg (${c.mg.kind}): ${p}`);
        } catch (e) {
          errors.push(`${at}: mg (${c.mg.kind}): ${e.message}`);
        }
      }
      if (c.mg_caption != null && !(Array.isArray(c.mg_caption) && c.mg_caption.length === 2 && c.mg_caption.every((s) => typeof s === 'string'))) {
        errors.push(`${at}: mg_caption must be [left, right] strings`);
      } else if (c.mg_caption == null) warnings.push(`${at}: mg_caption should be [left, right]`);
      if (!isStr(c.mg_alt)) warnings.push(`${at}: mg_alt (screen-reader description) is missing`);
    } else warnings.push(`${at}: no micrographic`);
  });
  if (priority > 1) errors.push(`${priority} priority cards; there should be one`);
  if (priority === 0) warnings.push('no priority card; the cover will tease card 01');
  return { errors, warnings };
}
