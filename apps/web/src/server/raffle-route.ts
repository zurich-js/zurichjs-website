/**
 * Plumbing for the public raffle API (/api/raffle/*): no sign-in, the site's Origin check on writes,
 * rate limits, and one place that turns failures into answers. Entrants have no account; their own
 * link carries a token we keep only as a hash.
 */
import { RaffleNotFound, RaffleRuleError, type RaffleStore } from '@zurichjs/raffle';
import type { SponsorStore } from '@zurichjs/sponsorship';
import { sameOrigin } from './admin-auth.ts';
import { siteOrigin } from './auth.ts';
import { CONTACT_EMAIL, fail, type Env } from './http.ts';
import { MembershipUnavailable } from './membership-db.ts';
import { raffleStore } from './raffle.ts';
import { sponsorStore } from './sponsor.ts';

export interface RaffleRouteDeps {
  env?: Env;
  raffles?: RaffleStore;
  sponsors?: SponsorStore;
  fetch?: typeof fetch;
  now?: () => Date;
  log?: (m: string) => void;
}

export interface RaffleCtx {
  env: Env;
  raffles: RaffleStore;
  sponsors: SponsorStore;
  origin: string;
  now: Date;
}

export async function raffleRoute(request: Request, deps: RaffleRouteDeps, fn: (ctx: RaffleCtx) => Promise<Response>, what: string): Promise<Response> {
  const env = deps.env ?? process.env;
  if (request.method !== 'GET' && !(request.headers.get('origin') && sameOrigin(request))) return fail(403, 'Refused: the request did not come from this site.');
  try {
    return await fn({
      env,
      raffles: deps.raffles ?? raffleStore(env),
      sponsors: deps.sponsors ?? sponsorStore(env),
      origin: siteOrigin(env),
      now: deps.now?.() ?? new Date(),
    });
  } catch (cause) {
    if (cause instanceof RaffleNotFound) return fail(404, 'No such raffle.');
    if (cause instanceof RaffleRuleError) return fail(409, cause.message);
    if (cause instanceof MembershipUnavailable) return fail(503, `Raffles are not available right now. Write to ${CONTACT_EMAIL}.`);
    console.error(`[raffle] ${what} failed`, cause);
    return fail(502, `We couldn’t ${what} right now. Try again, or write to ${CONTACT_EMAIL}.`);
  }
}
