/**
 * Join, or switch to automatic payment: sends the signed-in person to Stripe
 * Checkout (owner, 10th November 2026: anyone can join, no approval).
 *
 * POST /api/membership/checkout   (session cookie)
 *   JSON { kind?, name, organisationName?, level, cycle, termsVersion }   new or returning member
 *   JSON { termsVersion }                                                 imported member switching to automatic payment
 *   200 { ok: true, url }   the Stripe Checkout page
 *   400 { ok: false, error, field? }   invalid fields, or the terms not accepted (termsVersion must be the current one)
 *   409 { ok: false, error }           already a paying member
 *   429 · 401 · 503 · 502
 *
 * Accepting the membership terms (which follow the bylaws) is the agreement;
 * the accepted version is recorded. The membership starts with the first
 * payment (Stripe webhook). An imported member is not charged before their
 * paid period ends.
 */
import { DuplicateEmail, TERMS, canJoin, canStartAutomaticPayment, isCycle, isLevel, type Cycle, type Level, type Member, type MemberKind } from '@zurichjs/membership';
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject, text } from '../../../server/http.ts';
import { createCheckout } from '../../../server/membership-stripe.ts';
import { signedIn, type RouteDeps } from '../../../server/membership-route.ts';
import { clientKey, rateLimited } from '../../../server/rateLimit.ts';

export const prerender = false;

export interface Choice {
  kind: MemberKind;
  name: string;
  organisationName: string | null;
  level: Level;
  cycle: Cycle;
}

type Parsed<T> = { ok: true; data: T } | { ok: false; error: string; field: string };

export function parseTerms(body: Record<string, unknown>): Parsed<null> {
  if (body.termsVersion !== TERMS.version)
    return {
      ok: false,
      error: body.termsVersion ? 'The membership terms changed. Reload the page and accept the current terms.' : 'Accept the membership terms to continue.',
      field: 'terms',
    };
  return { ok: true, data: null };
}

export function parseChoice(body: Record<string, unknown>): Parsed<Choice> {
  const kind = body.kind === undefined || body.kind === 'person' ? 'person' : body.kind === 'organisation' ? 'organisation' : null;
  if (!kind) return { ok: false, error: 'Choose a person or an organisation.', field: 'kind' };
  const name = text(body.name, 200);
  if (!name) return { ok: false, error: kind === 'organisation' ? 'Add the name of the person who joins for the organisation.' : 'Add your full name.', field: 'name' };
  const org = text(body.organisationName, 200);
  if (org === false) return { ok: false, error: 'Keep the organisation name under 200 characters, without HTML.', field: 'organisationName' };
  if (kind === 'organisation' && !org) return { ok: false, error: 'Add the organisation’s name.', field: 'organisationName' };
  if (!isLevel(body.level)) return { ok: false, error: 'Choose Basic Member or Supporter.', field: 'level' };
  if (!isCycle(body.cycle)) return { ok: false, error: 'Choose quarterly or yearly.', field: 'cycle' };
  return { ok: true, data: { kind, name, organisationName: kind === 'organisation' ? (org as string) : null, level: body.level, cycle: body.cycle } };
}

export const handleCheckout = (request: Request, deps: RouteDeps = {}) => {
  if (rateLimited('membership-checkout', clientKey(request), 5, 10 * 60_000)) return Promise.resolve(fail(429, 'Too many attempts. Wait a few minutes, then try again.'));
  return signedIn(
    request,
    deps,
    async ({ user, member, store, origin, env }) => {
      const body = await readJsonObject(request);
      if (!body) return fail(400, 'Send the form as JSON.');
      const terms = parseTerms(body);
      if (!terms.ok) return fail(400, terms.error, { field: terms.field });
      const actor = { kind: 'member', id: user.id } as const;
      const stripe = { env, fetch: deps.fetch, now: deps.now };

      // An imported member switching from paying by hand: same level and cycle, charged when the paid period ends.
      if (member?.status === 'imported_manual') {
        await store.acceptTerms(member.id, TERMS.version, actor);
        if (!canStartAutomaticPayment(member, true)) return fail(409, 'Your membership is already paid automatically.');
        return json(200, { ok: true, url: await createCheckout(member, store, origin, stripe) });
      }
      if (member && !canJoin(member.status) && member.status !== 'pending') return fail(409, 'You already have a membership. See it on your account page.');

      const parsed = parseChoice(body);
      if (!parsed.ok) return fail(400, parsed.error, { field: parsed.field });
      const c = parsed.data;
      let m: Member;
      try {
        if (member) {
          // An earlier checkout that was not finished, or a membership that ended: same record.
          m = await store.update(member.id, { kind: c.kind, name: c.name, organisationName: c.organisationName, level: c.level, cycle: c.cycle, paymentMode: 'automatic' }, actor);
          if (m.status === 'ended') m = await store.transition(m.id, { from: 'ended', to: 'pending', actor });
        } else {
          m = await store.create(
            {
              ...c,
              email: user.email,
              category: 'passive',
              status: 'pending',
              source: 'self_serve',
              joinedAt: null,
              paidUntil: null,
              paymentMode: 'automatic',
              notes: null,
              userId: user.id,
            },
            actor,
          );
        }
      } catch (cause) {
        if (cause instanceof DuplicateEmail) return fail(409, 'A membership with your email already exists. Sign in again to see it.');
        throw cause;
      }
      await store.acceptTerms(m.id, TERMS.version, actor);
      return json(200, { ok: true, url: await createCheckout(m, store, origin, stripe) });
    },
    'start the payment',
  );
};

export const POST: APIRoute = ({ request }) => handleCheckout(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
