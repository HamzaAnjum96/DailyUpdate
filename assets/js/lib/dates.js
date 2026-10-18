// Calendar dates as UTC midnights, so day arithmetic never shifts with the viewer's time zone.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_MS = 864e5;

export function parseDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso));
  if (!m) throw new Error(`Bad date "${iso}" (expected YYYY-MM-DD)`);
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
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
  const jan1 = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  return Math.floor(daysBetween(jan1, thursday) / 7) + 1;
}
