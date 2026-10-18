// Deck behaviour: progress bar, index rail highlight, keyboard and in-deck link navigation.
export function startNav() {
  const deck = document.querySelector('.deck');
  const slides = [...document.querySelectorAll('.slide')];
  const segs = [...document.querySelectorAll('.progress i')];
  const idx = [...document.querySelectorAll('.index a')];
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let cur = 0;

  function set(i) {
    cur = i;
    segs.forEach((s, k) => (s.className = k === i ? 'now' : k < i ? 'seen' : ''));
    idx.forEach((a, k) => a.classList.toggle('now', k === i));
    try {
      history.replaceState(null, '', '#' + slides[i].id);
    } catch {}
  }

  function go(i, instant) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    deck.scrollTo({ top: slides[i].offsetTop, behavior: instant || reduce ? 'auto' : 'smooth' });
  }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && set(slides.indexOf(e.target))),
      { root: deck, threshold: 0.6 },
    );
    slides.forEach((s) => io.observe(s));
  }

  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key;
    if (k === 'ArrowDown' || k === 'PageDown' || k === 'j' || (k === ' ' && !e.shiftKey)) {
      e.preventDefault();
      go(cur + 1);
    } else if (k === 'ArrowUp' || k === 'PageUp' || k === 'k' || (k === ' ' && e.shiftKey)) {
      e.preventDefault();
      go(cur - 1);
    } else if (k === 'Home') {
      e.preventDefault();
      go(0);
    } else if (k === 'End') {
      e.preventDefault();
      go(slides.length - 1);
    }
  });

  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('a[href^="#c"]');
    if (!a) return;
    const t = document.getElementById(a.getAttribute('href').slice(1));
    if (!t) return;
    e.preventDefault();
    go(slides.indexOf(t));
  });

  const hash = location.hash.slice(1);
  const start = slides.findIndex((s) => s.id === hash);
  if (start > 0) go(start, true);
  set(Math.max(0, start));
  deck.focus({ preventScroll: true });
}
