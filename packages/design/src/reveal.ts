/**
 * Scroll reveals (motion.css): each target rises in as it scrolls up into view. Scrolling back up, what drops below
 * the viewport hides again, to rise in again on the way down; what comes back in from above is simply there. Targets that come into view together go
 * one after another in reading order, so a grid fills row by row. BaseLayout's head script sets html[data-motion]
 * when motion is welcome; without it (reduced motion, no script) nothing is hidden or watched.
 */

/** Blocks of the page's content that reveal their children: sections holding no other section, and top-level blocks holding none. */
// eslint-disable-next-line better-tailwindcss/no-restricted-classes -- a DOM selector, not classes
const AUTO = ':is(main section:not(:has(section), [data-opening] *), main > :not([data-opening], section, :has(section)))';
/** The elements motion.css hides until they reveal. Keep in step with the selector there. */
// eslint-disable-next-line better-tailwindcss/no-restricted-classes -- a DOM selector, not classes
const TARGETS = `:is([data-reveal]:not([data-reveal='children']), [data-reveal='children'] > *, ${AUTO} > :not(:has([data-reveal])), ${AUTO} > astro-island > :not(:has([data-reveal])), body > footer > :not(:has([data-reveal]))):not([data-reveal='children'], [data-reveal-skip], dialog, script, style, template, astro-island, astro-slot)`;
/** At most this many steps of delay in one batch, so a long list never keeps the last items waiting. */
const MAX_STEPS = 6;

export function startReveal() {
  const root = document.documentElement;
  if (!root.hasAttribute('data-motion') || !('IntersectionObserver' in window)) return;
  // Tells the head script's fail-safe that reveals are running.
  root.setAttribute('data-motion-ready', '');

  // Targets wait one reveal distance lower: watch that much below the viewport, so each starts as its real place enters.
  const distance = getComputedStyle(root).getPropertyValue('--spacing-reveal').trim() || '0px';
  const io = new IntersectionObserver(
    (entries) => {
      const rising: HTMLElement[] = [];
      for (const e of entries) {
        const el = e.target as HTMLElement;
        const view = e.rootBounds ?? { top: 0, bottom: innerHeight };
        if (e.isIntersecting) {
          if (el.hasAttribute('data-revealed')) continue;
          // Coming in from above (scrolling up, or a link to the middle of the page): shown as it is, no animation.
          if (e.boundingClientRect.top < view.top) el.setAttribute('data-reveal-done', '');
          else rising.push(el);
          el.setAttribute('data-revealed', '');
        } else if (el.hasAttribute('data-revealed') && e.boundingClientRect.top >= view.bottom && !el.matches(':focus-within')) {
          // Gone below the viewport (scrolling up): hidden again, to rise in again on the way down. Hiding moves it
          // lower still, so it never comes straight back into view.
          el.removeAttribute('data-revealed');
          el.removeAttribute('data-reveal-done');
          el.style.removeProperty('--reveal-i');
        }
      }
      rising
        .sort((x, y) => {
          const rx = x.getBoundingClientRect();
          const ry = y.getBoundingClientRect();
          return Math.round(rx.top - ry.top) || rx.left - ry.left;
        })
        .forEach((el, i) => el.style.setProperty('--reveal-i', String(Math.min(i, MAX_STEPS))));
    },
    { rootMargin: `0px 0px ${distance} 0px` },
  );
  // Once risen in, a target drops the animation, so hovers and transitions on it run as usual.
  document.addEventListener('animationend', (e) => {
    const el = e.target as Element;
    if (e.animationName === 'motion-reveal' && el.hasAttribute('data-revealed')) el.setAttribute('data-reveal-done', '');
  });

  const seen = new WeakSet<Element>();
  const observe = (el: Element) => {
    if (seen.has(el)) return;
    seen.add(el);
    io.observe(el);
  };
  const watch = (scope: ParentNode) => {
    if (scope instanceof Element && scope.matches(TARGETS)) observe(scope);
    scope.querySelectorAll(TARGETS).forEach(observe);
  };
  watch(document);
  // Islands render new elements later (a state swap, a list update): watch those too, or they would stay hidden.
  new MutationObserver((records) => {
    for (const r of records) r.addedNodes.forEach((n) => n instanceof Element && watch(n));
  }).observe(document.body, { childList: true, subtree: true });

  // Gallery thumbnails (motion-load) fade in once loaded.
  document.querySelectorAll<HTMLImageElement>('img.motion-load').forEach(fadeOnLoad);
}

/** Hides an image until it has loaded, then lets it fade in (motion-load). Does nothing to one already loaded. */
export function fadeOnLoad(img: HTMLImageElement) {
  if (img.complete || !document.documentElement.hasAttribute('data-motion')) return;
  img.setAttribute('data-loading', '');
  const done = () => img.removeAttribute('data-loading');
  img.addEventListener('load', done, { once: true });
  img.addEventListener('error', done, { once: true });
}
