/**
 * Plumbing for the sponsorship page's API (/api/sponsorship/*): who is signed in (the same
 * Better Auth sign-in as members), which contact and sponsor that is, and one place that turns
 * "not configured" into 503, expected refusals into 4xx and failures into 502. Writes must come
 * from this site (Origin check), as in the admin area.
 *
 * Linking a sign-in to a contact: contacts the board added (or who started the sponsorship) are
 * linked the first time their email signs in. A contact another colleague added is not: they
 * see an invitation and accept it first (POST /api/sponsorship/invitation), so nobody can attach
 * someone else's email to a sponsorship they did not ask to join. A contact already linked to
 * another account is never taken over.
 */
import type { Contact, Sponsor, SponsorStore } from '@zurichjs/sponsorship';
import { TransitionError } from '@zurichjs/sponsorship';
import { sameOrigin } from './admin-auth.ts';
import { sessionUser, siteOrigin, type AuthUser } from './auth.ts';
import { CONTACT_EMAIL, fail, type Env } from './http.ts';
import { MembershipUnavailable } from './membership-db.ts';
import type { MembershipSlack } from './membership-slack.ts';
import { sponsorStore } from './sponsor.ts';
import { SponsorshipError, type LifecycleDeps } from './sponsor-lifecycle.ts';
import type { LogoStore } from './sponsor-logo.ts';
import { AlreadySubscribed, PaymentLinkRace } from './sponsor-stripe.ts';
import { StripeUnavailable } from './stripe.ts';

export interface SponsorRouteDeps {
  env?: Env;
  store?: SponsorStore;
  session?: (request: Request) => Promise<AuthUser | null>;
  fetch?: typeof fetch;
  slack?: MembershipSlack;
  now?: () => Date;
  log?: (m: string) => void;
  logos?: LogoStore;
  /** Upcoming meetups for one-time sponsorships (Sanity). */
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
  /** A colleague added this email to a sponsorship; the person has not accepted yet. */
  invitation: { contact: Contact; sponsor: Sponsor } | null;
  origin: string;
  deps: SponsorRouteDeps;
  lifecycle: LifecycleDeps;
}

export async function contactFor(user: AuthUser, store: SponsorStore): Promise<{ contact: Contact | null; invitation: Contact | null }> {
  const linked = await store.contactByUser(user.id);
  if (linked) return { contact: linked, invitation: null };
  const byEmail = await store.contactByEmail(user.email);
  if (!byEmail || byEmail.userId) return { contact: null, invitation: null };
  if (byEmail.addedBy === 'sponsor') return { contact: null, invitation: byEmail };
  return { contact: await store.linkContact(byEmail.id, user.id), invitation: null };
}

export function lifecycleDeps(env: Env, store: SponsorStore, origin: string, deps: Pick<SponsorRouteDeps, 'fetch' | 'slack' | 'log' | 'now'>): LifecycleDeps {
  return { env, store, origin, fetch: deps.fetch, slack: deps.slack, log: deps.log, now: deps.now, stripe: { env, fetch: deps.fetch, now: deps.now } };
}

/** Errors every sponsorship route answers the same way. Returns null for anything unexpected. */
export function knownFailure(cause: unknown): Response | null {
  if (cause instanceof SponsorshipError) return fail(cause.status, cause.message, cause.field ? { field: cause.field } : {});
  if (cause instanceof AlreadySubscribed) return fail(409, 'Payment is already set up. Reload the page in a moment to see it.');
  if (cause instanceof PaymentLinkRace) return fail(409, 'Someone created a payment link at the same moment. Reload to see it.');
  if (cause instanceof TransitionError) return fail(409, cause.message);
  return null;
}

export async function signedInSponsor(request: Request, deps: SponsorRouteDeps, fn: (ctx: SponsorCtx) => Promise<Response>, what = 'do that'): Promise<Response> {
  const env = deps.env ?? process.env;
  if (request.method !== 'GET' && !(request.headers.get('origin') && sameOrigin(request))) return fail(403, 'Refused: the request did not come from this site.');
  try {
    const user = await (deps.session ?? ((r: Request) => sessionUser(r, env)))(request);
    if (!user) return fail(401, 'Your session has ended. Sign in again.');
    const store = deps.store ?? sponsorStore(env);
    const { contact, invitation } = await contactFor(user, store);
    const sponsor = contact ? await store.get(contact.sponsorId) : null;
    const invited = invitation ? await store.get(invitation.sponsorId) : null;
    const origin = siteOrigin(env);
    return await fn({
      env,
      store,
      user,
      contact,
      sponsor,
      invitation: invitation && invited ? { contact: invitation, sponsor: invited } : null,
      origin,
      deps,
      lifecycle: lifecycleDeps(env, store, origin, deps),
    });
  } catch (cause) {
    const known = knownFailure(cause);
    if (known) return known;
    if (cause instanceof MembershipUnavailable || cause instanceof StripeUnavailable) {
      console.error('[sponsorship] not configured:', (cause as Error).message);
      return fail(503, `Sponsorship pages are not available yet. Write to ${CONTACT_EMAIL}.`);
    }
    console.error(`[sponsorship] ${what} failed`, cause);
    return fail(502, `We couldn’t ${what} right now. Try again, or write to ${CONTACT_EMAIL}.`);
  }
}
