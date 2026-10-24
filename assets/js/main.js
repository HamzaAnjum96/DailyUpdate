// Entry point: load the brief named by ?brief=<id> (default: newest in data/briefs/index.json),
// render it and start the swipe deck.
import { buildDeck } from './deck.js';
import { esc } from './lib/markup.js';
import { validateBrief, validateBriefIndex } from './lib/validation.js';
import { startNav } from './nav.js';

const app = document.getElementById('app');

async function getJSON(url) {
  const res = await fetch(url, { cache: 'no-cache', signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const index = await getJSON('data/briefs/index.json');
  const indexErrors = validateBriefIndex(index).errors;
  if (indexErrors.length) throw new Error(`Invalid brief list: ${indexErrors.join('; ')}`);
  const { briefs } = index;
  const wanted = new URLSearchParams(location.search).get('brief');
  if (wanted !== null && !briefs.includes(wanted)) throw new Error(`Brief "${wanted}" is not available. Open the latest brief below.`);
  const id = wanted ?? briefs[0];
  const brief = await getJSON(`data/briefs/${id}.json`);
  const briefErrors = validateBrief(brief, { id }).errors;
  if (briefErrors.length) throw new Error(`Invalid brief: ${briefErrors.join('; ')}`);
  const deck = buildDeck(brief, { briefs, selectedId: id });
  document.title = deck.title;
  app.innerHTML = deck.html;
  app.removeAttribute('aria-busy');
  document.getElementById('brief-select')?.addEventListener('change', (event) => {
    const url = new URL(location.href);
    url.searchParams.set('brief', event.target.value);
    url.hash = '';
    location.assign(url);
  });
  startNav();
}

main().catch((err) => {
  console.error(err);
  if (location.protocol === 'file:') return; // index.html already shows how to serve the folder
  app.removeAttribute('aria-busy');
  app.innerHTML = `<div class="load-error" role="alert"><b>Brief failed to load</b><p>${esc(err.message)}</p><p><a href="./">Open latest brief</a> · <button type="button" id="retry-load">Try again</button></p></div>`;
  document.getElementById('retry-load').addEventListener('click', () => location.reload());
});
