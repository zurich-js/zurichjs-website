/**
 * The one Stripe webhook: memberships, sponsorships and donations. Stripe › Developers › Webhooks:
 * https://zurichjs.com/api/stripe/webhook with the events in STRIPE_WEBHOOK_EVENTS; its signing
 * secret in STRIPE_WEBHOOK_SECRET. `pnpm membership:stripe-setup --webhook-url …` creates it, and
 * `pnpm local` forwards to it with `stripe listen`. How it runs the parts: server/stripe-webhook.ts.
 *
 *   POST (signed by Stripe) → 200 · 400 bad signature or JSON · 503 not configured · 500 retry
 */
import type { MemberStore } from '@zurichjs/membership';
import type { RaffleStore } from '@zurichjs/raffle';
import type { FeeStore, SponsorStore } from '@zurichjs/sponsorship';
import type { APIRoute } from 'astro';
import { methodNotAllowed, type Env } from '../../../server/http.ts';
import type { MembershipSlack } from '../../../server/membership-slack.ts';
import { processRaffleEvent } from '../../../server/raffle-webhook.ts';
import { processSponsorEvent } from '../../../server/sponsor-webhook.ts';
import { dispatchStripeEvent, readStripeEvent } from '../../../server/stripe-webhook.ts';
import { processDonationEvent } from '../donate/webhook.ts';
import { processMembershipEvent } from '../membership/webhook.ts';

export const prerender = false;

export interface StripeWebhookDeps {
  env?: Env;
  memberStore?: MemberStore;
  sponsorStore?: SponsorStore;
  fees?: FeeStore;
  raffles?: RaffleStore;
  fetch?: typeof fetch;
  slack?: MembershipSlack;
  now?: number;
  log?: (m: string) => void;
  signature?: () => Promise<Uint8Array | null>;
}

export async function handleStripeWebhook(request: Request, deps: StripeWebhookDeps = {}): Promise<Response> {
  const env = deps.env ?? process.env;
  const read = await readStripeEvent(request, env, 'STRIPE_WEBHOOK_SECRET', 'stripe', deps);
  if ('response' in read) return read.response;
  const shared = { env, fetch: deps.fetch, slack: deps.slack, now: deps.now, log: deps.log };
  return dispatchStripeEvent(read.event, [
    (e) => processMembershipEvent(e, { ...shared, store: deps.memberStore, signature: deps.signature }),
    (e) => processSponsorEvent(e, { ...shared, store: deps.sponsorStore, fees: deps.fees }),
    (e) => processRaffleEvent(e, { ...shared, raffles: deps.raffles, sponsors: deps.sponsorStore, fees: deps.fees }),
    (e) => processDonationEvent(e, shared),
  ]);
}

export const POST: APIRoute = ({ request }) => handleStripeWebhook(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
