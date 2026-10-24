import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { isBriefId, isHttpUrl, validateBrief, validateBriefIndex } from '../assets/js/lib/validation.js';

const original = JSON.parse(readFileSync(new URL('../data/briefs/2026-w43.json', import.meta.url), 'utf8'));
const fixture = () => structuredClone(original);

test('the current brief validates without changing its editorial content', () => {
  const result = validateBrief(fixture(), { id: '2026-w43' });
  assert.deepEqual(result.errors, []);
  assert.ok(result.warnings.some((warning) => warning.includes('days is empty')));
});

test('brief ranges, week numbers and filenames must agree, including New Year', () => {
  const b = fixture();
  b.week = 44;
  b.end = '2026-10-26';
  assert.match(validateBrief(b, { id: '2026-w42' }).errors.join('\n'), /week must be 43/);
  assert.match(validateBrief(b).errors.join('\n'), /exactly 7 days/);
  assert.match(validateBrief(b, { id: '2026-w42' }).errors.join('\n'), /brief id must be 2026-w43/);
  b.cards = [b.cards[0]];
  b.start = '2025-12-28';
  b.end = '2026-01-04';
  b.week = 1;
  assert.deepEqual(validateBrief(b, { id: '2026-w01' }).errors, []);
  b.start = '2025-12-29';
  assert.match(validateBrief(b).errors.join('\n'), /start must be a Sunday/);
});

test('malformed brief and card shapes report useful errors without throwing', () => {
  for (const value of [null, [], 'brief', 3]) assert.ok(validateBrief(value).errors.length);
  for (const value of [null, [], 'card', 3]) {
    const b = fixture();
    b.cards = [value];
    assert.match(validateBrief(b).errors.join('\n'), /card 01: must be an object/);
  }
  for (const value of [null, {}, 4]) {
    const b = fixture();
    b.sources = value;
    assert.match(validateBrief(b).errors.join('\n'), /sources must be a list/);
  }
  const b = fixture();
  Object.assign(b.cards[0], { src: 9, links: {}, mg: [], days: ['mon', 'mon'], priority: 'yes', type: 'constructor' });
  const errors = validateBrief(b).errors.join('\n');
  for (const message of ['src must be a list', 'links must be a list', 'mg must be an object', 'days must be a list', 'priority must be true or false', 'type must be one of']) assert.ok(errors.includes(message), message);
});

test('unsafe links are rejected in both cards and the source register', () => {
  for (const value of ['javascript:alert(1)', 'data:text/html,x', '//example.com', '/relative', 'https://user:secret@example.com', 'https://example.com\n', 'https:\\example.com', 'https://']) {
    assert.equal(isHttpUrl(value), false, value);
    const b = fixture();
    b.cards[0].links = [[value, 'Read more']];
    b.sources[0][0] = value;
    const errors = validateBrief(b).errors;
    assert.ok(errors.some((e) => e.startsWith('sources[0]')));
    assert.ok(errors.some((e) => e.includes('links[0]')));
  }
  assert.equal(isHttpUrl('https://example.com/path?q=1&b=2#section'), true);
  assert.equal(isHttpUrl('http://example.com'), true);
});

test('archive ids are safe, unique, real ISO weeks and newest first', () => {
  for (const id of ['../2026-w43', '2026-w00', '2026-w54', '2026-w1', 'constructor']) assert.equal(isBriefId(id), false, id);
  assert.deepEqual(validateBriefIndex({ briefs: ['2026-w44', '2026-w43'] }).errors, []);
  assert.deepEqual(validateBriefIndex({ briefs: ['2026-w53'] }).errors, []);
  for (const index of [null, {}, { briefs: [] }, { briefs: ['2026-w43', '2026-w43'] }, { briefs: ['2026-w43', '2026-w44'] }, { briefs: ['2025-w53'] }, { briefs: ['../secret'] }]) {
    assert.ok(validateBriefIndex(index).errors.length, JSON.stringify(index));
  }
});

test('CLI reports malformed JSON files and keeps checking subsequent briefs', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'city-ops-check-'));
  try {
    const invalid = join(directory, '2026-w42.json');
    await writeFile(invalid, 'null');
    const script = new URL('../scripts/check.js', import.meta.url);
    const valid = new URL('../data/briefs/2026-w43.json', import.meta.url);
    const { fileURLToPath } = await import('node:url');
    const result = spawnSync(process.execPath, [fileURLToPath(script), invalid, fileURLToPath(valid)], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /brief must be an object/);
    assert.match(result.stdout, /✓ 2026-w43.json/);
    assert.doesNotMatch(result.stderr, /TypeError|at file:/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('CLI permits Infinity in graphic labels while rejecting non-finite graphic inputs', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'city-ops-geometry-'));
  try {
    const file = join(directory, '2026-w43.json');
    const b = fixture();
    b.cards[0].mg = { kind: 'junction', a: 'J17', b: 'J18', window: 'Infinity Bridge closure' };
    await writeFile(file, JSON.stringify(b));
    const { fileURLToPath } = await import('node:url');
    const command = [fileURLToPath(new URL('../scripts/check.js', import.meta.url)), file];
    const valid = spawnSync(process.execPath, command, { encoding: 'utf8' });
    assert.equal(valid.status, 0, valid.stdout + valid.stderr);

    // JSON numbers can overflow to Infinity even though the Infinity literal is invalid JSON.
    b.cards[0].mg = { kind: 'bars', was: 'OVERFLOW_PRICE', now: 10 };
    await writeFile(file, JSON.stringify(b).replace('"OVERFLOW_PRICE"', '1e400'));
    const invalid = spawnSync(process.execPath, command, { encoding: 'utf8' });
    assert.equal(invalid.status, 1);
    assert.match(invalid.stdout, /finite prices/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
