// templates.html: renders every micrographic template from editable JSON params.
import { addDays, isoWeek, parseDate } from './lib/dates.js';
import { html } from './lib/markup.js';
import { checkMicrographic, renderMicrographic, templates } from './micrographics/index.js';

const grid = document.getElementById('templates');
const startInput = document.getElementById('week-start');
const weekNo = document.getElementById('week-no');

function context() {
  const start = parseDate(startInput.value || '2026-10-18');
  const week = isoWeek(addDays(start, 1)); // the week is numbered by its Monday
  return { start, week, serial: String(week).padStart(3, '0') };
}

// One-line JSON with a space after each comma and colon.
function flat(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(flat).join(', ')}]`;
  return `{${Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${flat(x)}`).join(', ')}}`;
}

// JSON with two-space indents; arrays and objects that fit in `width` stay on one line.
function pretty(v, ind = 0, col = 0, width = 56) {
  const one = flat(v);
  if (v === null || typeof v !== 'object' || col + one.length <= width) return one;
  const inner = ' '.repeat(ind + 2);
  const body = Array.isArray(v)
    ? v.map((x) => inner + pretty(x, ind + 2, ind + 2, width))
    : Object.entries(v).map(([k, x]) => {
        const key = `${JSON.stringify(k)}: `;
        return inner + key + pretty(x, ind + 2, ind + 2 + key.length, width);
      });
  const [open, close] = Array.isArray(v) ? ['[', ']'] : ['{', '}'];
  return `${open}\n${body.join(',\n')}\n${' '.repeat(ind)}${close}`;
}

const redraws = Object.values(templates).map(({ meta }) => {
  const el = document.createElement('section');
  el.className = 'g-tpl';
  el.id = meta.kind;
  const params = Object.entries(meta.params).map(([k, doc]) => html`<dt>${k}</dt><dd>${doc}</dd>`);
  el.innerHTML = String(html`<div class="g-in">
  <header class="card-top"><span class="ctype"><span class="code">MG</span>${meta.kind}</span><span>${meta.name}</span></header>
  <figure class="mg"><svg preserveAspectRatio="xMidYMid meet" role="img" aria-label="${meta.name} preview"></svg><figcaption><span>KIND / ${meta.kind}</span><span>assets/js/micrographics/${meta.kind}.js</span></figcaption></figure>
  <div class="g-body">
   <p class="g-use">${meta.use}</p>
   ${params.length ? html`<dl class="g-params">${params}</dl>` : ''}
   <label class="g-label" for="mg-${meta.kind}">"mg" params</label>
   <textarea id="mg-${meta.kind}" spellcheck="false" autocomplete="off"></textarea>
   <p class="g-msg" role="status"></p>
  </div>
 </div>`);
  grid.append(el);

  const fig = el.querySelector('.mg');
  const svgEl = fig.querySelector('svg');
  const area = el.querySelector('textarea');
  const msg = el.querySelector('.g-msg');
  const say = (text, cls = '') => {
    msg.textContent = text;
    msg.className = `g-msg ${cls}`;
  };
  area.value = pretty(meta.example);
  area.rows = Math.min(28, area.value.split('\n').length + 1);

  function redraw() {
    let p;
    try {
      p = JSON.parse(area.value);
    } catch (e) {
      return say(`JSON: ${e.message}`, 'err');
    }
    try {
      const ctx = context();
      const out = renderMicrographic({ kind: meta.kind, ...p }, ctx);
      svgEl.setAttribute('viewBox', `0 0 ${out.width} ${out.height}`);
      svgEl.innerHTML = String(out.svg);
      fig.classList.toggle('tall', out.height > 140);
      const problems = checkMicrographic({ kind: meta.kind, ...p }, ctx);
      say(problems.join(' · '), problems.length ? 'warn' : '');
    } catch (e) {
      say(e.message, 'err');
    }
  }
  area.addEventListener('input', redraw);
  return redraw;
});

function redrawAll() {
  weekNo.textContent = `W${context().week}`;
  redraws.forEach((r) => r());
}
startInput.addEventListener('change', redrawAll);
redrawAll();
