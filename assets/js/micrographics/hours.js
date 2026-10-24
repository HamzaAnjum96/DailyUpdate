// hours: a time axis with one opening window highlighted. For drop-ins, opening hours, one-day events.
import { svg } from '../lib/markup.js';
import { upper } from './parts.js';

export const meta = {
  kind: 'hours',
  name: 'Opening window',
  use: 'A single time window on one day: a drop-in, opening hours, a one-off event.',
  params: {
    title: 'Line at the top, e.g. "Thu 29 Oct · Central Library".',
    from: 'Window start, "HH:MM".',
    to: 'Window end, "HH:MM".',
    axis: 'Optional [first hour, last hour] for the axis, e.g. [10, 18]. Defaults to two hours either side.',
    label: 'Text inside the window bar, e.g. "Open · free drop-in".',
    foot: 'Optional line along the bottom.',
  },
  example: {
    kind: 'hours',
    title: 'Thu 29 Oct · Central Library',
    from: '12:00',
    to: '16:00',
    axis: [10, 18],
    label: 'Open · free drop-in',
    foot: 'Reading · meet + greet · theatre · crafts',
  },
};

// Layout: the axis runs from X_FIRST to X_LAST at AXIS_Y; the window bar sits just above it.
const X_FIRST = 20;
const X_LAST = 300;
const AXIS_Y = 100;
const BAR_H = 16;

const hoursOf = (t) => {
  const [h, m] = String(t).split(':').map(Number);
  return h + m / 60;
};

function duration(hrs) {
  const h = Math.floor(hrs);
  const m = Math.round((hrs - h) * 60);
  if (!m) return h === 1 ? '1 HR' : `${h} HRS`;
  return h ? `${h}H ${m}M` : `${m} MIN`;
}

export function render({ title = '', from, to, axis, label = '', foot = '' }) {
  const f = hoursOf(from);
  const t = hoursOf(to);
  const [a0, a1] = axis ?? [Math.max(0, Math.floor(f) - 2), Math.min(24, Math.ceil(t) + 2)];
  const x = (h) => X_FIRST + ((X_LAST - X_FIRST) * (h - a0)) / (a1 - a0);
  const out = [
    svg`<text x="14" y="18" class="t-stop">${upper(title)}</text>`,
    svg`<text x="13" y="52" class="t-big">${from}–${to}</text>`,
    svg`<text x="306" y="52" text-anchor="end" class="t-hot">${duration(t - f)}</text>`,
  ];
  for (let h = a0; h <= a1; h++) {
    const open = h >= f && h <= t;
    out.push(svg`<path d="M${x(h)} ${AXIS_Y}V${AXIS_Y + 5}" class="${open ? 's-line' : 's-dim'}"/>`);
    out.push(svg`<text x="${x(h)}" y="${AXIS_Y + 15}" text-anchor="middle" class="${open ? 't-paper' : 't-stop'}">${h}</text>`);
  }
  out.push(svg`<path d="M${X_FIRST} ${AXIS_Y}H${X_LAST}" class="s-dim"/>`);
  out.push(svg`<rect x="${x(f)}" y="${AXIS_Y - BAR_H}" width="${x(t) - x(f)}" height="${BAR_H}" class="f-hot"/>`);
  if (label) out.push(svg`<text x="${x(f) + 5}" y="${AXIS_Y - BAR_H + 10.5}" class="t-ink">${upper(label)}</text>`);
  if (foot) out.push(svg`<text x="14" y="134" class="t-stop">${upper(foot)}</text>`);
  return svg`${out}`;
}

export function check({ from, to, axis }) {
  const ok = (v) => /^\d{1,2}:\d{2}$/.test(String(v));
  if (!ok(from) || !ok(to)) return ['from and to must be "HH:MM"'];
  const errs = [];
  if (hoursOf(to) <= hoursOf(from)) errs.push('to must be after from');
  if (axis && !(Array.isArray(axis) && axis.length === 2 && axis[0] <= hoursOf(from) && axis[1] >= hoursOf(to))) {
    errs.push('axis must be [first hour, last hour] around the window');
  }
  return errs;
}
