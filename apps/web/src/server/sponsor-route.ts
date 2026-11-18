/**
 * Plumbing for the sponsor portal API (/api/sponsorship/*): who is signed in (the same
 * Better Auth sign-in as members), which contact and sponsor that is, and one place that
 * turns "not configured" into 503, expected refusals into 4xx and failures into 502.
 *
 * A contact is linked to the account the first time their email signs in (an invited
 * sponsor). A contact already linked to another account is never taken over.
 */
import type { Contact, Sponsor, SponsorStore } from '@zurichjs/sponsorship';
import { TransitionError } from '@zurichjs/sponsorship';
import { sessionUser, siteOrigin, type AuthUser } from './auth.ts';
import { CONTACT_EMAIL, fail, type Env } from './http.ts';
import { MembershipUnavailable } from './membership-db.ts';
import type { MembershipSlack } from './membership-slack.ts';
import { sponsorStore } from './sponsor.ts';
import { SponsorshipError, type LifecycleDeps } from './sponsor-lifecycle.ts';
import { AlreadySubscribed } from './sponsor-stripe.ts';
import { StripeUnavailable } from './stripe.ts';
import type { LogoStore } from './sponsor-logo.ts';

export interface SponsorRouteDeps {
  env?: Env;
  store?: SponsorStore;
  session?: (request: Request) => Promise<AuthUser | null>;
  fetch?: typeof fetch;
  slack?: MembershipSlack;
  now?: () => Date;
  log?: (m: string) => void;
  logos?: LogoStore;
  /** Upcoming meetups for one-meetup sponsorships (Sanity). */
  meetups?: () => Promise<Meetup[]>;
}

export interface Meetup {
  id: string;
  title: string;
  /** YYYY-MM-DD in Zurich. */
  date: string;
}

export interface SponsorCtx {
  env: Env;
  store: SponsorStore;
  user: AuthUser;
  contact: Contact | null;
  sponsor: Sponsor | null;
  origin: string;
  deps: SponsorRouteDeps;
  lifecycle: LifecycleDeps;
}

export async function contactFor(user: AuthUser, store: SponsorStore): Promise<Contact | null> {
  const linked = await store.contactByUser(user.id);
  if (linked) return linked;
  const byEmail = await store.contactByEmail(user.email);
  if (!byEmail || byEmail.userId) return null;
  return store.linkContact(byEmail.id, user.id);
}

export function lifecycleDeps(env: Env, store: SponsorStore, origin: string, deps: Pick<SponsorRouteDeps, 'fetch' | 'slack' | 'log' | 'now'>): LifecycleDeps {
  return { env, store, origin, fetch: deps.fetch, slack: deps.slack, log: deps.log, now: deps.now, stripe: { env, fetch: deps.fetch, now: deps.now } };
}

/** Errors every sponsorship route answers the same way. Returns null for anything unexpected. */
export function knownFailure(cause: unknown): Response | null {
  if (cause instanceof SponsorshipError) return fail(cause.status, cause.message, cause.field ? { field: cause.field } : {});
  if (cause instanceof AlreadySubscribed) return fail(409, 'Payment is already set up. Reload the page in a moment to see it.');
  if (cause instanceof TransitionError) return fail(409, cause.message);
  return null;
}

export async function signedInSponsor(request: Request, deps: SponsorRouteDeps, fn: (ctx: SponsorCtx) => Promise<Response>, what = 'do that'): Promise<Response> {
  const env = deps.env ?? process.env;
  try {
    const user = await (deps.session ?? ((r: Request) => sessionUser(r, env)))(request);
    if (!user) return fail(401, 'Your session has ended. Sign in again.');
    const store = deps.store ?? sponsorStore(env);
    const contact = await contactFor(user, store);
    const sponsor = contact ? await store.get(contact.sponsorId) : null;
    const origin = siteOrigin(env);
    return await fn({ env, store, user, contact, sponsor, origin, deps, lifecycle: lifecycleDeps(env, store, origin, deps) });
  } catch (cause) {
    const known = knownFailure(cause);
    if (known) return known;
    if (cause instanceof MembershipUnavailable || cause instanceof StripeUnavailable) {
      console.error('[sponsorship] not configured:', (cause as Error).message);
      return fail(503, `Sponsor accounts are not available yet. Write to ${CONTACT_EMAIL}.`);
    }
    console.error(`[sponsorship] ${what} failed`, cause);
    return fail(502, `We couldn’t ${what} right now. Try again, or write to ${CONTACT_EMAIL}.`);
  }
}
