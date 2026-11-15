// fixture: a match-day board, two teams over a pitch with the kick-off time on the centre spot.
import { svg } from '../lib/markup.js';
import { upper } from './parts.js';

export const meta = {
  kind: 'fixture',
  name: 'Match-day board',
  use: 'A home match: teams, kick-off, competition and venue.',
  params: {
    home: 'Home team, up to ~10 characters, e.g. "Man City".',
    away: 'Away team, up to ~10 characters.',
    time: 'Kick-off, "HH:MM".',
    date: 'Short date, e.g. "Sat 21 Nov".',
    comp: 'Competition, e.g. "Premier League".',
    venue: 'Line under the pitch, e.g. "Etihad Stadium".',
  },
  example: { kind: 'fixture', home: 'Man City', away: 'Brighton', time: '15:00', date: 'Sat 31 Oct', comp: 'Premier League', venue: 'Etihad Stadium' },
};

// Layout: team boxes along the top, a pitch outline below, kick-off over the centre spot.
const TEAM_Y = 22;
const TEAM_H = 26;
const PITCH = { x: 62, y: 58, w: 196, h: 62 };

export function render({ home, away, time, date = '', comp = '', venue = '' }) {
  const { x, y, w, h } = PITCH;
  const cx = x + w / 2;
  const cy = y + h / 2;
  return svg`<text x="14" y="13" class="t-hot">${upper(comp)}</text>
<text x="306" y="13" text-anchor="end" class="t-paper">${upper(date)}</text>
<rect x="14" y="${TEAM_Y}" width="128" height="${TEAM_H}" class="f-ink s-dim"/>
<rect x="178" y="${TEAM_Y}" width="128" height="${TEAM_H}" class="f-ink s-dim"/>
<text x="78" y="${TEAM_Y + 18}" text-anchor="middle" class="t-date">${upper(home)}</text>
<text x="242" y="${TEAM_Y + 18}" text-anchor="middle" class="t-date">${upper(away)}</text>
<text x="160" y="${TEAM_Y + 17}" text-anchor="middle" class="t-hot">V</text>
<text x="20" y="${TEAM_Y + TEAM_H + 9}" class="t-stop">HOME</text>
<text x="300" y="${TEAM_Y + TEAM_H + 9}" text-anchor="end" class="t-stop">AWAY</text>
<rect x="${x}" y="${y}" width="${w}" height="${h}" class="s-dim"/>
<path d="M${cx} ${y}V${y + h}" class="s-dim"/>
<rect x="${x}" y="${cy - 14}" width="22" height="28" class="s-dim"/>
<rect x="${x + w - 22}" y="${cy - 14}" width="22" height="28" class="s-dim"/>
<circle cx="${cx}" cy="${cy}" r="17" class="f-none s-dim"/>
<rect x="${cx - 46}" y="${cy - 15}" width="92" height="30" class="f-ink"/>
<text x="${cx}" y="${cy + 11}" text-anchor="middle" class="t-big">${time}</text>
<text x="160" y="134" text-anchor="middle" class="t-stop">${upper(venue)}</text>`;
}

export function check({ home, away, time }) {
  const errs = [];
  for (const [k, v] of Object.entries({ home, away })) {
    if (typeof v !== 'string' || !v.trim()) errs.push(`${k} is required`);
    else if (v.length > 11) errs.push(`${k} "${v}" is over 11 characters; abbreviate it`);
  }
  if (typeof time !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) errs.push('time must be a 24-hour "HH:MM"');
  return errs;
}
