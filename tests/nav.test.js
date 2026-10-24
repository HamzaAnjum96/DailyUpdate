import test from 'node:test';
import assert from 'node:assert/strict';
import { startNav } from '../assets/js/nav.js';

// Small DOM/event harness: scroll position and animation completion are controlled
// by each test, so rapid inputs and old scroll events are reproducible.
function setup(t, { hash = '', reduced = false, empty = false } = {}) {
  const previous = Object.fromEntries(['document', 'window', 'history', 'location'].map((key) => [key, globalThis[key]]));
  const frames = new Map();
  let frameId = 0;
  let document;
  function element(extra = {}) {
    const handlers = new Map();
    const attrs = new Map();
    const el = {
      className: '', scrollTop: 0, clientTop: 0, clientHeight: 0, scrollHeight: 0,
      parentElement: null, dataset: {},
      addEventListener(name, fn) {
        if (!handlers.has(name)) handlers.set(name, new Set());
        handlers.get(name).add(fn);
      },
      removeEventListener(name, fn) { handlers.get(name)?.delete(fn); },
      dispatch(name, values = {}) {
        const event = { target: el, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...values };
        for (const fn of handlers.get(name) ?? []) fn(event);
        return event;
      },
      setAttribute(name, value) { attrs.set(name, value); },
      getAttribute(name) { return attrs.get(name) ?? null; },
      removeAttribute(name) { attrs.delete(name); },
      hasAttribute(name) { return attrs.has(name); },
      focus() { document.activeElement = el; },
      closest(selector) {
        if (el.interactive && selector.startsWith('input,')) return el;
        if (el.control && selector === '.deck-controls [data-step]') return el;
        if (el.getAttribute('href')?.startsWith('#') && selector === 'a[href^="#"]') return el;
        return null;
      },
      ...extra,
    };
    el.classList = { toggle(name, enabled) {
      const names = new Set(el.className.split(' ').filter(Boolean));
      if (enabled) names.add(name); else names.delete(name);
      el.className = [...names].join(' ');
    } };
    return el;
  }
  const body = element();
  const calls = [];
  const deck = element({
    clientHeight: 500, scrollHeight: 2000, parentElement: body,
    getBoundingClientRect: () => ({ top: 64, bottom: 564 }),
    scrollTo(options) {
      calls.push(options);
      if (options.behavior === 'instant') this.scrollTop = options.top;
    },
  });
  const slides = Array.from({ length: empty ? 0 : 4 }, (_, i) => element({
    id: `c0${i}`, parentElement: deck,
    getBoundingClientRect: () => ({ top: 64 + i * 500 - deck.scrollTop, bottom: 64 + (i + 1) * 500 - deck.scrollTop }),
  }));
  deck.querySelectorAll = () => slides;
  const index = slides.map((slide) => {
    const link = element();
    link.setAttribute('href', '#' + slide.id);
    return link;
  });
  const segs = slides.map(() => element());
  const controls = [-1, 1].map((step) => element({ control: true, interactive: true, dataset: { step: String(step) } }));
  const position = element();
  document = element({ body, activeElement: body,
    querySelector(selector) { return selector === '.deck' ? deck : selector === '.card-position' ? position : null; },
    querySelectorAll(selector) {
      return selector === '.progress i' ? segs : selector === '.index a' ? index : controls;
    },
  });
  const window = element({
    matchMedia: () => ({ matches: reduced }),
    requestAnimationFrame(fn) { frames.set(++frameId, fn); return frameId; },
    cancelAnimationFrame(id) { frames.delete(id); },
    getComputedStyle(el) { return { overflowY: el.overflowY ?? 'visible' }; },
  });
  const location = { hash };
  const state = { retained: 'app state' };
  const history = { state, writes: [], replaceState(value, _, url) {
    assert.equal(value, state);
    location.hash = url;
    this.writes.push(url);
  } };
  Object.assign(globalThis, { document, window, history, location });
  const stop = startNav();
  t.after(() => {
    stop();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
    }
  });
  function flush() {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((fn) => fn());
  }
  flush();
  const key = (key, extra = {}) => document.dispatch('keydown', { key, target: document.activeElement, ...extra });
  const click = (target, extra = {}) => document.dispatch('click', { target, button: 0, ...extra });
  return { deck, slides, index, segs, controls, position, document, window, location, history, calls, flush, key, click, element, stop };
}

test('initial deep link scrolls instantly to the card in an offset deck and exposes current state', (t) => {
  const h = setup(t, { hash: '#c02' });
  assert.deepEqual(h.calls[0], { top: 1000, behavior: 'instant' });
  assert.equal(h.document.activeElement, h.slides[2]);
  assert.equal(h.index[2].getAttribute('aria-current'), 'location');
  assert.equal(h.index[0].getAttribute('aria-current'), null);
  assert.deepEqual(h.segs.map((el) => el.className), ['seen', 'seen', 'now', '']);
  assert.equal(h.position.textContent, 'Card 2 of 2');
});

test('rapid navigation uses the requested card while smooth scrolling is in progress', (t) => {
  const h = setup(t);
  h.key('ArrowDown');
  h.deck.dispatch('scroll');
  h.flush(); // An early scroll frame still sees the cover.
  h.key('ArrowDown');
  assert.equal(h.calls.at(-1).top, 1000);
  assert.equal(h.location.hash, '#c02');
  assert.equal(h.document.activeElement, h.slides[2]);
});

test('manual scroll updates progress without IntersectionObserver and interrupts a pending jump', (t) => {
  const h = setup(t);
  h.key('End');
  h.deck.dispatch('wheel');
  h.deck.scrollTop = 500;
  h.deck.dispatch('scroll');
  h.flush();
  assert.equal(h.location.hash, '#c01');
  assert.equal(h.index[1].getAttribute('aria-current'), 'location');
  h.key('ArrowDown');
  assert.equal(h.calls.at(-1).top, 1000);
});

test('external hash changes navigate to the destination and unknown fragments are ignored', (t) => {
  const h = setup(t);
  h.location.hash = '#c03';
  h.window.dispatch('hashchange');
  assert.deepEqual(h.calls.at(-1), { top: 1500, behavior: 'instant' });
  assert.equal(h.controls[1].disabled, true);
  assert.equal(h.position.textContent, 'Sources');
  const before = h.calls.length;
  h.location.hash = '#unknown';
  h.window.dispatch('hashchange');
  assert.equal(h.calls.length, before);
});

test('standard shortcuts do not interfere with editable fields, controls, or handled events', (t) => {
  const h = setup(t);
  const before = h.calls.length;
  for (const values of [{ target: h.element({ interactive: true }) }, { ctrlKey: true }, { metaKey: true }, { altKey: true }, { shiftKey: true }, { isComposing: true }, { defaultPrevented: true }]) {
    h.key('ArrowDown', values);
  }
  assert.equal(h.calls.length, before);
});

test('focused inner scroll regions keep native scroll keys until their content is exhausted', (t) => {
  const h = setup(t);
  const region = h.element({ parentElement: h.slides[0], clientHeight: 100, scrollHeight: 300, overflowY: 'auto' });
  assert.equal(h.key('ArrowDown', { target: region }).defaultPrevented, false);
  assert.equal(h.calls.length, 1);
  region.scrollTop = 200;
  assert.equal(h.key('ArrowDown', { target: region }).defaultPrevented, true);
  assert.equal(h.calls.at(-1).top, 500);
});

test('modified or new-tab links keep native behavior; ordinary deck links move focus', (t) => {
  const h = setup(t);
  const link = h.index[2];
  for (const values of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { shiftKey: true }, { button: 1 }]) {
    assert.equal(h.click(link, values).defaultPrevented, false);
  }
  link.target = '_blank';
  assert.equal(h.click(link).defaultPrevented, false);
  link.target = '';
  assert.equal(h.calls.length, 1);
  assert.equal(h.click(link).defaultPrevented, true);
  assert.equal(h.document.activeElement, h.slides[2]);
  assert.equal(h.calls.at(-1).top, 1000);
});

test('previous/next controls disable at endpoints and preserve button focus for repeated activation', (t) => {
  const h = setup(t);
  assert.equal(h.controls[0].disabled, true);
  assert.equal(h.controls[1].disabled, false);
  h.click(h.controls[0]);
  assert.equal(h.calls.length, 1);
  h.controls[1].focus();
  h.click(h.controls[1]);
  assert.equal(h.controls[0].disabled, false);
  assert.equal(h.calls.at(-1).top, 500);
  assert.equal(h.document.activeElement, h.controls[1]);
  h.click(h.controls[1]);
  h.click(h.controls[1]);
  assert.equal(h.controls[1].disabled, true);
});

test('reduced motion bypasses CSS smooth scrolling and cleanup removes navigation handlers', (t) => {
  const h = setup(t, { reduced: true });
  h.key('End');
  assert.equal(h.calls.at(-1).behavior, 'instant');
  const before = h.calls.length;
  h.stop();
  h.key('Home');
  h.window.dispatch('hashchange');
  assert.equal(h.calls.length, before);
});

test('an empty deck is a harmless no-op', (t) => {
  const h = setup(t, { empty: true });
  h.key('ArrowDown');
  assert.equal(h.calls.length, 0);
});
