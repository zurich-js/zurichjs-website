/** Time before an account read offers Try again. */
export const READ_DEADLINE_MS = 20_000;

/**
 * Aborts after `ms`, or when `own` aborts. Built on AbortController and a timer, so it works in
 * browsers without AbortSignal.timeout or AbortSignal.any.
 */
export function timeoutSignal(ms: number, own?: AbortSignal | null): AbortSignal {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  controller.signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
  if (own?.aborted) controller.abort();
  else own?.addEventListener('abort', () => controller.abort(), { once: true });
  return controller.signal;
}
