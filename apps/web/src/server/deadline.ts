/**
 * Time budgets for outbound calls. Netlify stops a synchronous function after 60 s and a scheduled
 * one after 30 s, with no response and no log line from the code. Each Stripe, Resend, Slack or
 * Sanity call has its own timeout, but a request that makes several of them in a row can still add
 * up past the limit. A deadline makes every call through one `fetch` share a single budget, so the
 * route answers its own error before the platform kills it.
 *
 * A call that would start after the deadline is not sent at all (DeadlineExceeded), so no new write
 * begins that the function cannot wait for. A call in flight at the deadline is aborted, as its own
 * timeout would abort it.
 */

/** Synchronous functions: Netlify's 60 s, less time for the database writes after the last call. */
export const REQUEST_BUDGET_MS = 50_000;
/** Scheduled functions: inside Netlify's 30 s, with time left to log the result. */
export const SCHEDULED_BUDGET_MS = 25_000;

export class DeadlineExceeded extends Error {}

export interface Deadline {
  /** Milliseconds left; 0 or less once it has passed. */
  remaining(): number;
  /** `fetchImpl` with every call cut off at this deadline. */
  fetch(fetchImpl?: typeof fetch): typeof fetch;
}

export function deadline(budgetMs: number, clock: () => number = Date.now): Deadline {
  const at = clock() + budgetMs;
  const remaining = () => at - clock();
  return {
    remaining,
    fetch:
      (fetchImpl = fetch) =>
      (input, init = {}) => {
        const left = remaining();
        if (left <= 0) return Promise.reject(new DeadlineExceeded(`time budget used up before ${describe(input)}`));
        const cutoff = AbortSignal.timeout(left);
        return fetchImpl(input, { ...init, signal: init.signal ? AbortSignal.any([init.signal, cutoff]) : cutoff });
      },
  };
}

const describe = (input: RequestInfo | URL) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  try {
    const u = new URL(url);
    return `${u.host}${u.pathname}`;
  } catch {
    return 'a call';
  }
};
