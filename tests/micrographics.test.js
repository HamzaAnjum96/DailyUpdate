import test from 'node:test';
import assert from 'node:assert/strict';
import { checkMicrographic, renderMicrographic, templates } from '../assets/js/micrographics/index.js';
import { parseDate } from '../assets/js/lib/dates.js';

const ctx = { start: parseDate('2026-10-18'), week: 43, serial: '043' };

test('every documented template example validates and renders finite SVG', () => {
  for (const { meta } of Object.values(templates)) {
    assert.deepEqual(checkMicrographic(meta.example, ctx), [], meta.kind);
    const result = renderMicrographic(meta.example, ctx);
    assert.ok(result.width > 0 && result.height > 0, meta.kind);
    assert.doesNotMatch(String(result.svg), /NaN|Infinity|undefined/, meta.kind);
  }
});

test('registry rejects inherited object keys and malformed micrographics', () => {
  for (const mg of [null, [], 'route', {}, { kind: 'constructor' }, { kind: '__proto__' }, { kind: { toString: null } }]) {
    assert.ok(checkMicrographic(mg, ctx).length);
    assert.throws(() => renderMicrographic(mg, ctx), /Invalid micrographic/);
  }
});

test('invalid prices cannot produce misleading or non-finite bars', () => {
  for (const overrides of [{ was: 0 }, { was: Infinity }, { now: Infinity }, { now: null }, { now: '' }, { now: -1 }, { now: 20 }, { pct: 101 }, { pct: '50' }]) {
    const mg = { kind: 'bars', was: 10, now: 5, ...overrides };
    assert.ok(checkMicrographic(mg, ctx).length, JSON.stringify(overrides));
    assert.throws(() => renderMicrographic(mg, ctx), /Invalid micrographic/);
  }
  for (const now of [0, 10]) assert.deepEqual(checkMicrographic({ kind: 'bars', was: 10, now }, ctx), []);
  assert.doesNotMatch(String(renderMicrographic({ kind: 'bars', was: 1e308, now: 5e307 }, ctx).svg), /NaN|Infinity/);
});

test('clock rejects impossible times and malformed lines', () => {
  for (const from of ['24:00', '02:60', '99:99', '2:1', null]) {
    assert.match(checkMicrographic({ kind: 'clock', from, to: '01:00' }, ctx).join(' '), /valid 24-hour times/);
  }
  assert.deepEqual(checkMicrographic({ kind: 'clock', from: '23:59', to: '00:00' }, ctx), []);
  for (const lines of ['text', [null], Array(5).fill('text')]) {
    assert.ok(checkMicrographic({ kind: 'clock', from: '02:00', to: '01:00', lines }, ctx).length);
  }
});

test('route diagnoses malformed rows and stop ranges without throwing', () => {
  const valid = { name: 'Line', stops: ['A', 'B'] };
  const invalidRows = [null, ['A', 'B'], { ...valid, stops: 'AB' }, { ...valid, stops: [null, 'B'] }, { ...valid, closed: {} }, { ...valid, closed: [null] }, { ...valid, closed: [[0, 1, 2]] }, { ...valid, closed: [[-1, 1]] }, { ...valid, closed: [[1, 0]] }, { ...valid, end: 2 }];
  for (const row of invalidRows) {
    const mg = { kind: 'route', rows: [row] };
    assert.ok(checkMicrographic(mg, ctx).length, JSON.stringify(row));
    assert.throws(() => renderMicrographic(mg, ctx), /Invalid micrographic/);
  }
});

test('week diagnoses malformed marks and repeated dates', () => {
  for (const marks of [null, {}, [null], [{ date: '2026-10-19', label: 12 }], [{ date: '2026-10-19' }, { date: '2026-10-19' }]]) {
    assert.ok(checkMicrographic({ kind: 'week', marks }, ctx).length);
  }
  assert.match(checkMicrographic({ kind: 'week', marks: [{ date: '2026-10-26' }] }, ctx).join(' '), /outside the strip/);
});

test('week rejects reversed and entirely off-strip spans but permits clipped spans', () => {
  for (const span of [{ from: '2026-10-20', to: '2026-10-19' }, { from: '2026-10-26', to: null }, { from: '2026-10-10', to: '2026-10-17' }, false, []]) {
    const mg = { kind: 'week', span };
    assert.ok(checkMicrographic(mg, ctx).length, JSON.stringify(span));
    assert.throws(() => renderMicrographic(mg, ctx), /Invalid micrographic/);
  }
  for (const span of [{ from: '2026-10-10', to: '2026-11-01' }, { from: '2026-10-25', to: null }, { from: '2026-10-18', to: '2026-10-18' }]) {
    assert.deepEqual(checkMicrographic({ kind: 'week', span }, ctx), []);
  }
});

test('count rejects blank and nonscalar values', () => {
  for (const value of ['   ', true, {}, null, Infinity]) {
    assert.ok(checkMicrographic({ kind: 'count', value }, ctx).length);
  }
  assert.deepEqual(checkMicrographic({ kind: 'count', value: 0 }, ctx), []);
});

test('week look-ahead, sub-labels and badges validate and render', () => {
  const ahead = { kind: 'week', ahead: { date: '2026-11-07', label: '17:00', sub: '20:00 main' } };
  assert.deepEqual(checkMicrographic(ahead, ctx), []);
  assert.match(String(renderMicrographic(ahead, ctx).svg), /THIS WEEK.*\+13D|\+13D.*THIS WEEK/s);
  for (const date of ['2026-10-25', '2026-10-20', 'soon']) {
    assert.ok(checkMicrographic({ kind: 'week', ahead: { date } }, ctx).length, date);
  }
  assert.ok(checkMicrographic({ ...ahead, span: { from: '2026-10-18', to: null } }, ctx).length);
  const marks = [{ date: '2026-10-21', label: 'City', sub: '+ Arena', n: 2 }];
  assert.match(String(renderMicrographic({ kind: 'week', marks }, ctx).svg), /×2.*\+ ARENA/s);
  for (const bad of [{ n: 1 }, { n: 2.5 }, { sub: 3 }]) {
    assert.ok(checkMicrographic({ kind: 'week', marks: [{ ...marks[0], ...bad }] }, ctx).length, JSON.stringify(bad));
  }
});

test('hours rejects impossible windows and axes', () => {
  const ok = { kind: 'hours', from: '12:00', to: '16:00', axis: [10, 18] };
  assert.deepEqual(checkMicrographic(ok, ctx), []);
  assert.match(String(renderMicrographic(ok, ctx).svg), /12:00–16:00.*4 HRS/s);
  for (const bad of [{ from: '24:00' }, { to: '11:00' }, { axis: [13, 18] }, { axis: [10, 25] }, { axis: [10.5, 18] }, { label: 4 }]) {
    assert.ok(checkMicrographic({ ...ok, ...bad }, ctx).length, JSON.stringify(bad));
  }
});
