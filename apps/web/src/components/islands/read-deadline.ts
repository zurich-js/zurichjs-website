/**
 * How long an island waits for a read (a GET to the site's API) before it shows its error with
 * Try again. The server's own limits (a database query 10 s, outbound calls 50 s) end most
 * requests sooner; this covers a connection that never answers.
 */
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
