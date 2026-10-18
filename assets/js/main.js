// Entry point: load the brief named by ?brief=<id> (default: newest in data/briefs/index.json),
// render it and start the swipe deck.
import { buildDeck } from './deck.js';
import { esc } from './lib/markup.js';
import { startNav } from './nav.js';

const app = document.getElementById('app');

async function getJSON(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const { briefs } = await getJSON('data/briefs/index.json');
  const wanted = new URLSearchParams(location.search).get('brief');
  const id = briefs.includes(wanted) ? wanted : briefs[0];
  const deck = buildDeck(await getJSON(`data/briefs/${id}.json`));
  document.title = deck.title;
  app.innerHTML = deck.html;
  startNav();
}

main().catch((err) => {
  console.error(err);
  if (location.protocol === 'file:') return; // index.html already shows how to serve the folder
  app.innerHTML = `<div class="load-error"><b>Brief failed to load</b>${esc(err.message)}</div>`;
});
