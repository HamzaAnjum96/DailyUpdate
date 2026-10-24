// Deck navigation works from scroll position, including on browsers without
// IntersectionObserver. Explicit navigation moves focus to the destination card,
// and the current card gets the "now" class that starts its arrival animation.
export function startNav() {
  const deck = document.querySelector('.deck');
  const slides = deck ? [...deck.querySelectorAll('.slide')] : [];
  if (!slides.length) return () => {};

  const segs = [...document.querySelectorAll('.progress i')];
  const idx = [...document.querySelectorAll('.index a')];
  const controls = [...document.querySelectorAll('.deck-controls [data-step]')];
  const position = document.querySelector('.card-position');
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let cur = -1;
  let pending = null;
  let frame = null;
  let settleTimer;
  let stopped = false;
  const listeners = [];

  function listen(target, event, fn, options) {
    target.addEventListener(event, fn, options);
    listeners.push(() => target.removeEventListener(event, fn, options));
  }

  function set(i) {
    if (cur === i) return;
    cur = i;
    slides.forEach((s, k) => s.classList.toggle('now', k === i)); // starts the card's arrival animation
    segs.forEach((s, k) => (s.className = k === i ? 'now' : k < i ? 'seen' : ''));
    idx.forEach((a, k) => {
      a.classList.toggle('now', k === i);
      if (k === i) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
    controls.forEach((button) => {
      const step = Number(button.dataset.step);
      button.disabled = step < 0 ? i === 0 : i === slides.length - 1;
    });
    if (position) {
      position.textContent = i === 0 ? 'Cover'
        : i === slides.length - 1 ? 'Sources'
          : `Card ${i} of ${slides.length - 2}`;
    }
    try {
      history.replaceState(history.state, '', '#' + slides[i].id);
    } catch {} // File previews and sandboxed embeds may not permit history writes.
  }

  function topOf(slide) {
    return slide.getBoundingClientRect().top - deck.getBoundingClientRect().top
      + deck.scrollTop - deck.clientTop;
  }

  function sync() {
    if (stopped) return;
    // Keep rapid successive key presses relative to the requested destination
    // until smooth scrolling reaches it, settles, or the user interrupts it.
    if (pending !== null) {
      if (Math.abs(topOf(slides[pending]) - deck.scrollTop) > 2) return;
      pending = null;
    }
    const top = deck.getBoundingClientRect().top + deck.clientTop;
    const bottom = top + deck.clientHeight;
    let best = cur < 0 ? 0 : cur;
    let visible = 0;
    slides.forEach((slide, i) => {
      const rect = slide.getBoundingClientRect();
      const amount = Math.max(0, Math.min(bottom, rect.bottom) - Math.max(top, rect.top));
      if (amount > visible) {
        best = i;
        visible = amount;
      }
    });
    set(best);
  }

  function queueSync() {
    if (frame !== null || stopped) return;
    frame = window.requestAnimationFrame(() => {
      frame = null;
      sync();
    });
  }

  function settled() {
    clearTimeout(settleTimer);
    pending = null;
    queueSync();
  }

  function waitForSettle() {
    clearTimeout(settleTimer);
    // scrollend is not available everywhere; inactivity is the fallback.
    settleTimer = setTimeout(settled, 180);
  }

  function go(i, { instant = false, focus = false } = {}) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    pending = i;
    set(i);
    deck.scrollTo({
      top: topOf(slides[i]),
      // 'auto' can still animate when CSS sets scroll-behavior: smooth.
      behavior: instant || reducedMotion?.matches ? 'instant' : 'smooth',
    });
    if (focus) {
      slides[i].tabIndex = -1;
      slides[i].focus({ preventScroll: true });
    }
    queueSync();
    waitForSettle();
  }

  function innerCanScroll(target, direction) {
    for (let el = target; el && el !== deck && el !== document.body; el = el.parentElement) {
      if (el.scrollHeight <= el.clientHeight + 1) continue;
      if (!/^(auto|scroll)$/.test(window.getComputedStyle(el).overflowY)) continue;
      if (direction < 0 ? el.scrollTop > 1 : el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
    }
    return false;
  }

  listen(deck, 'scroll', () => { queueSync(); waitForSettle(); }, { passive: true });
  listen(deck, 'scrollend', settled);
  for (const event of ['wheel', 'touchstart', 'pointerdown']) {
    listen(deck, event, settled, { passive: true });
  }
  listen(window, 'resize', queueSync);

  listen(document, 'keydown', (e) => {
    if (e.defaultPrevented || e.isComposing || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target.closest?.('input, textarea, select, button, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="button"], [role="combobox"], [role="slider"], [role="spinbutton"]')) return;
    const k = e.key;
    if (e.shiftKey && k !== ' ') return;
    let next;
    if (['ArrowDown', 'PageDown', 'j'].includes(k) || (k === ' ' && !e.shiftKey)) next = cur + 1;
    else if (['ArrowUp', 'PageUp', 'k'].includes(k) || (k === ' ' && e.shiftKey)) next = cur - 1;
    else if (k === 'Home') next = 0;
    else if (k === 'End') next = slides.length - 1;
    else return;
    if (k !== 'j' && k !== 'k' && innerCanScroll(e.target, next < cur || k === 'Home' ? -1 : 1)) return;
    e.preventDefault();
    go(next, { focus: true });
  });

  listen(document, 'click', (e) => {
    if (e.defaultPrevented || e.button > 0 || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const button = e.target.closest?.('.deck-controls [data-step]');
    if (button) {
      if (!button.disabled) go(cur + Number(button.dataset.step));
      return;
    }
    const a = e.target.closest?.('a[href^="#"]');
    if (!a || a.hasAttribute('download') || (a.target && a.target !== '_self')) return;
    const i = slides.findIndex((slide) => '#' + slide.id === a.getAttribute('href'));
    if (i < 0) return;
    e.preventDefault();
    go(i, { focus: true });
  });

  listen(window, 'hashchange', () => {
    const i = slides.findIndex((slide) => '#' + slide.id === location.hash);
    if (i >= 0) go(i, { instant: true, focus: true });
  });

  const start = slides.findIndex((slide) => '#' + slide.id === location.hash);
  const mayFocus = document.activeElement === document.body || document.activeElement === deck;
  go(Math.max(0, start), { instant: true, focus: mayFocus && start > 0 });
  if (mayFocus && start <= 0) deck.focus({ preventScroll: true });

  return () => {
    stopped = true;
    listeners.forEach((remove) => remove());
    clearTimeout(settleTimer);
    if (frame !== null) window.cancelAnimationFrame(frame);
  };
}
