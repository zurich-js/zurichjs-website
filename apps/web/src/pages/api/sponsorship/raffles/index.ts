/**
 * The signed-in sponsor's raffle add-ons (docs/domains/sponsorship/raffles.md). A raffle is a paid
 * add-on for a running sponsorship, never part of a tier.
 *
 * GET  → 200 { ok, raffles: RaffleView[], eligible, reason?, terms: { open, version?, url? } }
 * POST { eventId, prize, quantity, budgetChf, fulfilment: 'zurichjs' | 'in_kind' }
 *      → 200 { ok, raffle } · 400 · 401 · 404 (no sponsorship) · 409 (not eligible)
 *   Proposing works before the raffle terms are approved: it waits as a draft for the board.
 */
import { RaffleRuleError, eligibility } from '@zurichjs/raffle';
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../../server/http.ts';
import { assertEligible, raffleStore, raffleView, termsGate } from '../../../../server/raffle.ts';
import { note, slackText, zurichDay } from '../../../../server/sponsor.ts';
import { feeStore } from '../../../../server/sponsor-fees.ts';
import { upcomingMeetups } from '../../../../server/sponsor-meetups.ts';
import { signedInSponsor, type SponsorRouteDeps } from '../../../../server/sponsor-route.ts';
import { rateLimited } from '../../../../server/rateLimit.ts';

export const prerender = false;

export const handleRaffles = (request: Request, deps: SponsorRouteDeps = {}) =>
  signedInSponsor(
    request,
    deps,
    async ({ sponsor: s, contact, env, user, lifecycle }) => {
      if (!s || !contact) return fail(404, 'No sponsorship for this email.');
      const raffles = deps.raffles ?? raffleStore(env);
      const now = deps.now?.() ?? new Date();
      if (request.method === 'GET') {
        const fees = deps.fees ?? feeStore(env);
        const list = await raffles.bySponsor(s.id);
        const quotes = await Promise.all(list.map((r) => (r.quoteId ? fees.quote(r.quoteId) : null)));
        // Counts and the winning claim code only: entrant data never reaches the sponsor here.
        const counts = await Promise.all(list.map((r) => (r.openedAt ? raffles.entryCounts(r.id) : null)));
        const codes = await Promise.all(
          list.map(async (r) => {
            const last = (await raffles.draws(r.id)).at(-1);
            return last ? ((await raffles.entries(r.id)).find((e) => e.id === last.entryId)?.claimCode ?? null) : null;
          }),
        );
        // Releases addressed to this contact, still readable: ids and dates only here.
        const shares = await Promise.all(
          list.map(async (r) =>
            (await raffles.shares(r.id))
              .filter((x) => x.recipientContactId === contact.id && !x.revokedAt && x.expiresAt > now.toISOString())
              .map((x) => ({ id: x.id, expiresAt: x.expiresAt, count: x.entryIds.length })),
          ),
        );
        const tasks = await Promise.all(list.map((r) => raffles.deletionTasks(r.id, contact.id)));
        const e = eligibility(s, zurichDay(now));
        const gate = termsGate(env);
        return json(200, {
          ok: true,
          raffles: list.map((r, i) => ({ ...raffleView(r, quotes[i] ?? null, counts[i] ?? null, codes[i] ?? null), shares: shares[i] ?? [], deletionTasks: tasks[i] })),
          eligible: e.ok,
          reason: e.ok ? null : e.reason,
          terms: gate.open ? { open: true, version: gate.version, url: gate.url } : { open: false },
        });
      }

      if (rateLimited('raffle-propose', user.id, 5, 60 * 60_000)) return fail(429, 'Too many proposals. Try again in an hour.');
      assertEligible(s, now);
      const body = (await readJsonObject(request)) ?? {};
      const prize = typeof body.prize === 'string' ? body.prize.replace(/\s+/g, ' ').trim() : '';
      if (prize.length < 2 || prize.length > 200) return fail(400, 'Say what the prize is, in up to 200 characters.', { field: 'prize' });
      const quantity = typeof body.quantity === 'number' ? body.quantity : Number(body.quantity);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) return fail(400, 'Choose how many prizes, from 1 to 50.', { field: 'quantity' });
      const fulfilment = body.fulfilment === 'in_kind' ? 'in_kind' : body.fulfilment === 'zurichjs' ? 'zurichjs' : null;
      if (!fulfilment) return fail(400, 'Say who gets the prize: ZurichJS buys it, or you send it.', { field: 'fulfilment' });
      const budget = fulfilment === 'in_kind' ? 0 : Number(body.budgetChf);
      if (fulfilment === 'zurichjs' && (!Number.isInteger(budget) || budget < 1 || budget > 10_000))
        return fail(400, 'Give a budget in whole francs, from 1 to 10’000.', { field: 'budgetChf' });
      const eventId = typeof body.eventId === 'string' ? body.eventId : '';
      const m = (await (deps.meetups ?? (() => upcomingMeetups(env, lifecycle.fetch)))()).find((x) => x.id === eventId);
      if (!m) throw new RaffleRuleError('Choose an upcoming meetup.', 'invalid');

      const r = await raffles.create(
        { sponsorId: s.id, eventId: m.id, eventTitle: m.title, eventDate: m.date, prize, quantity, budgetMinor: budget * 100, fulfilment },
        { kind: 'sponsor', id: user.id },
      );
      await note(`:gift: *${slackText(s.companyName)}* proposed a raffle for ${slackText(m.title)}. Review it in the admin area.`, lifecycle);
      return json(200, { ok: true, raffle: raffleView(r, null) });
    },
    'handle your raffles',
  );

export const GET: APIRoute = ({ request }) => handleRaffles(request);
export const POST: APIRoute = ({ request }) => handleRaffles(request);
export const ALL: APIRoute = () => methodNotAllowed('GET, POST');
