// Calendar dates as UTC midnights, so day arithmetic never shifts with the viewer's time zone.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_MS = 864e5;

export function parseDate(iso) {
  const m = typeof iso === 'string' && /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error(`Bad date "${iso}" (expected YYYY-MM-DD)`);
  // setUTCFullYear avoids Date.UTC's special treatment of years 00–99 as 1900–1999.
  const d = new Date(0);
  d.setUTCFullYear(+m[1], +m[2] - 1, +m[3]);
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) {
    throw new Error(`Bad date "${iso}" (not a real calendar date)`);
  }
  return d;
}

export const addDays = (d, n) => new Date(d.getTime() + n * DAY_MS);
export const daysBetween = (a, b) => Math.round((b - a) / DAY_MS);
export const isoDate = (d) => d.toISOString().slice(0, 10);
export const monthAbbr = (d) => MONTHS[d.getUTCMonth()];
export const dayAbbr = (d) => DAYS[d.getUTCDay()];
export const pad2 = (n) => String(n).padStart(2, '0');

// ISO week number of the given date.
export function isoWeek(d) {
  const thursday = addDays(d, 3 - ((d.getUTCDay() + 6) % 7));
  const jan1 = new Date(thursday);
  jan1.setUTCMonth(0, 1);
  return Math.floor(daysBetween(jan1, thursday) / 7) + 1;
}

export const isoWeekYear = (d) => addDays(d, 3 - ((d.getUTCDay() + 6) % 7)).getUTCFullYear();
