/**
 * Time budgets for outbound calls. Netlify stops a synchronous function after 60 s and a scheduled
 * one after 30 s, with no response and no log line from the code. Each Stripe, Resend, Slack or
 * Sanity call has its own timeout, but several in a row can add up past the limit. Every call made
 * through one deadline's `fetch` shares a single budget. Database queries do not go through it:
 * each one has its own limit (DB_TIMEOUTS), and a sequence of them is not capped.
 *
 * A call that would start after the deadline is not sent (it rejects with DeadlineExceeded). A
 * call still waiting at the deadline is aborted with DeadlineExceeded as the reason, so a caller
 * can tell "the budget stopped it" from an answer or an error of the service.
 */

/** Synchronous functions: Netlify's 60 s, less time for the database writes after the last call. */
export const REQUEST_BUDGET_MS = 50_000;
/** Scheduled functions: inside Netlify's 30 s, with time left to log the result. */
export const SCHEDULED_BUDGET_MS = 25_000;

export class DeadlineExceeded extends Error {
  override name = 'DeadlineExceeded';
}

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
        const cutoff = new AbortController();
        setTimeout(() => cutoff.abort(new DeadlineExceeded(`time budget ran out during ${describe(input)}`)), left).unref?.();
        const own = init.signal ?? (input instanceof Request ? input.signal : undefined);
        return fetchImpl(input, { ...init, signal: own ? AbortSignal.any([own, cutoff.signal]) : cutoff.signal });
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
