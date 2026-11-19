/**
 * Runs a DOM update that swaps what a list shows (a search, a filter, a billing switch) inside a same-document
 * view transition, so the old and new states cross-fade (motion.css). Browsers without view transitions, and
 * visitors who prefer reduced motion, get the update at once.
 */
let running = 0;
export function swap(update: () => void) {
  if (!('startViewTransition' in document) || matchMedia('(prefers-reduced-motion: reduce)').matches) return update();
  const root = document.documentElement;
  // Marks the transition as a swap (a plain cross-fade, not a page's rise); a counter, since a new swap can skip a running one.
  running++;
  root.setAttribute('data-motion-swap', '');
  void document.startViewTransition(update).finished.finally(() => {
    if (--running === 0) root.removeAttribute('data-motion-swap');
  });
}
