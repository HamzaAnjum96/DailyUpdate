// templates.html: renders every micrographic template from editable JSON params.
import { addDays, isoWeek, parseDate } from './lib/dates.js';
import { html } from './lib/markup.js';
import { checkMicrographic, renderMicrographic, templates } from './micrographics/index.js';

const grid = document.getElementById('templates');
const startInput = document.getElementById('week-start');
const weekNo = document.getElementById('week-no');
const weekError = document.getElementById('week-error');
let currentContext = null;

function context() {
  if (!startInput.value) throw new Error('Choose a Sunday to start the week strip.');
  const start = parseDate(startInput.value);
  if (start.getUTCDay() !== 0) throw new Error('The week strip must start on a Sunday.');
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
  <header class="card-top"><span class="ctype"><span class="code">MG</span>${meta.kind}</span><h2 class="g-title">${meta.name}</h2></header>
  <figure class="mg"><svg preserveAspectRatio="xMidYMid meet" role="img" aria-label="${meta.name} preview"></svg><figcaption><span>KIND / ${meta.kind}</span><span>assets/js/micrographics/${meta.kind}.js</span></figcaption></figure>
  <div class="g-body">
   <p class="g-use">${meta.use}</p>
   ${params.length ? html`<dl class="g-params">${params}</dl>` : ''}
   <label class="g-label" for="mg-${meta.kind}">${meta.name} "mg" params</label>
   <textarea id="mg-${meta.kind}" spellcheck="false" autocomplete="off" aria-describedby="msg-${meta.kind}"></textarea>
   <button class="g-reset" type="button" aria-label="Reset ${meta.name} example">Reset example</button>
   <p class="g-msg" id="msg-${meta.kind}" role="status" aria-atomic="true"></p>
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
    // Never leave a previous drawing looking like it represents invalid edits.
    svgEl.replaceChildren();
    svgEl.setAttribute('aria-label', `${meta.name}: preview unavailable`);
    area.removeAttribute('aria-invalid');
    if (!currentContext) return say('');
    try {
      const p = JSON.parse(area.value);
      if (!p || typeof p !== 'object' || Array.isArray(p)) {
        throw new Error('Params must be a JSON object.');
      }
      if (p.kind !== undefined && p.kind !== meta.kind) {
        throw new Error(`Use kind "${meta.kind}" in this editor.`);
      }
      const mg = { ...p, kind: meta.kind };
      const problems = checkMicrographic(mg, currentContext);
      if (problems.length) throw new Error(problems.join(' · '));
      const out = renderMicrographic(mg, currentContext);
      svgEl.setAttribute('viewBox', `0 0 ${out.width} ${out.height}`);
      svgEl.innerHTML = String(out.svg);
      svgEl.setAttribute('aria-label', `${meta.name} preview`);
      fig.classList.toggle('tall', out.height > 140);
      say('');
    } catch (e) {
      area.setAttribute('aria-invalid', 'true');
      say(e instanceof SyntaxError ? `JSON: ${e.message}` : e.message, 'err');
    }
  }
  area.addEventListener('input', redraw);
  el.querySelector('.g-reset').addEventListener('click', () => {
    area.value = pretty(meta.example);
    redraw();
    area.focus();
  });
  return redraw;
});

function redrawAll() {
  try {
    currentContext = context();
    startInput.removeAttribute('aria-invalid');
    weekNo.textContent = `W${currentContext.week}`;
    weekError.textContent = '';
  } catch (e) {
    currentContext = null;
    startInput.setAttribute('aria-invalid', 'true');
    weekNo.textContent = '';
    weekError.textContent = e.message;
  }
  redraws.forEach((r) => r());
}
startInput.addEventListener('input', redrawAll);
redrawAll();
