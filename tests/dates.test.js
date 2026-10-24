import assert from 'node:assert/strict';
import test from 'node:test';
import { addDays, daysBetween, isoDate, isoWeek, isoWeekYear, parseDate } from '../assets/js/lib/dates.js';

test('calendar dates reject rollover and malformed values', () => {
  for (const value of ['2026-02-29', '2026-04-31', '2026-00-01', '2026-13-01', '2026-01-00', '2026-1-01', '2026-10-18T00:00:00Z', '', null, 20261018]) {
    assert.throws(() => parseDate(value), /Bad date/);
  }
  assert.equal(isoDate(parseDate('2024-02-29')), '2024-02-29');
  assert.equal(isoDate(parseDate('0099-02-28')), '0099-02-28');
  assert.throws(() => parseDate('1900-02-29'), /Bad date/);
  assert.equal(isoDate(parseDate('2000-02-29')), '2000-02-29');
});

test('week arithmetic is stable across daylight-saving changes', () => {
  const start = parseDate('2026-10-18');
  assert.equal(isoDate(addDays(start, 7)), '2026-10-25');
  assert.equal(daysBetween(start, parseDate('2026-10-25')), 7);
  assert.equal(isoWeek(addDays(start, 1)), 43);
  assert.equal(addDays(parseDate('2026-03-28'), 1).getUTCHours(), 0);
});

test('ISO week numbers and years handle calendar-year boundaries', () => {
  for (const [date, week, year] of [['2021-01-01', 53, 2020], ['2021-01-04', 1, 2021], ['2025-12-29', 1, 2026], ['2026-12-31', 53, 2026]]) {
    assert.equal(isoWeek(parseDate(date)), week, date);
    assert.equal(isoWeekYear(parseDate(date)), year, date);
  }
});
