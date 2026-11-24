/**
 * Enter a raffle: free, no account, a name or nickname and an email, and the rules accepted.
 *   POST { raffleId, name, email, rules: true, share?: boolean (the optional, unticked sharing box), company? (honeypot, must be empty) }
 *     → 200 { ok } · 400 { error, field } · 404 · 409 (entries closed) · 429
 * One entry per email per raffle. The answer is the same for a new and a repeated email, so the
 * form never tells anyone whether an address entered. The entry counts at once; the email we send
 * has the claim code and the entrant's own link, where they confirm the address.
 */
import { claimCode, RaffleRuleError } from '@zurichjs/raffle';
import { renderEmail } from '@zurichjs/emails';
import { sendMemberEmail } from '@zurichjs/integrations';
import type { APIRoute } from 'astro';
import { longDate } from '../../../server/dates.ts';
import { fail, isEmail, json, methodNotAllowed, readJsonObject } from '../../../server/http.ts';
import { manageUrl, newEntryToken, sharingGate } from '../../../server/raffle.ts';
import { raffleRoute, type RaffleRouteDeps } from '../../../server/raffle-route.ts';
import { clientKey, rateLimited } from '../../../server/rateLimit.ts';

export const prerender = false;

export const handleEnter = (request: Request, deps: RaffleRouteDeps = {}) =>
  raffleRoute(
    request,
    deps,
    async ({ env, raffles, sponsors, origin, now }) => {
      if (rateLimited('raffle-enter', clientKey(request), 10, 10 * 60_000)) return fail(429, 'Too many entries from here. Wait a few minutes, then try again.');
      const body = (await readJsonObject(request)) ?? {};
      if (typeof body.company === 'string' && body.company) return json(200, { ok: true });
      const name = typeof body.name === 'string' ? body.name.replace(/\s+/g, ' ').trim() : '';
      if (!name || name.length > 80) return fail(400, 'Enter a name or nickname, up to 80 characters.', { field: 'name' });
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      if (!isEmail(email) || email.length > 254) return fail(400, 'Enter an email like name@example.com.', { field: 'email' });
      if (body.rules !== true) return fail(400, 'Accept the raffle rules to enter.', { field: 'rules' });
      const raffleId = typeof body.raffleId === 'string' ? body.raffleId : '';
      if (rateLimited('raffle-enter-email', `${raffleId}:${email}`, 3, 60 * 60_000)) return fail(429, 'Too many tries for this email. Try again later.');
      const r = await raffles.get(raffleId);
      if (!r || !r.openedAt) return fail(404, 'No such raffle.');
      if (r.stage !== 'open' || !r.closesAt || now.toISOString() >= r.closesAt) throw new RaffleRuleError('Entries for this raffle are closed.');

      const { token, hash } = newEntryToken();
      let added: Awaited<ReturnType<typeof raffles.addEntry>> | null = null;
      for (let i = 0; i < 3 && !added; i++) {
        try {
          added = await raffles.addEntry(r.id, { name, email, claimCode: claimCode(), tokenHash: hash }, now);
        } catch (cause) {
          if (!(cause instanceof RaffleRuleError && /Claim code/.test(cause.message))) throw cause;
        }
      }
      if (!added) throw new Error('No free claim code after three tries.');
      if (added.created) {
        // The sharing choice is separate from entering, and counts only once the email is confirmed.
        if (body.share === true && r.sharingVersion && sharingGate(env, r).open) await raffles.giveConsent(added.entry.id, { verified: false, at: now });
        const s = await sponsors.get(r.sponsorId);
        const message = renderEmail('raffle-entry', {
          name,
          prize: r.prize,
          meetup: `${r.eventTitle}, ${longDate(r.eventDate)}`,
          sponsorName: s?.companyName ?? 'a sponsor',
          claimCode: added.entry.claimCode,
          manageUrl: manageUrl(origin, token),
          rulesUrl: r.rulesUrl!,
        });
        await sendMemberEmail(env, { to: email, ...message }, { idempotencyKey: `raffle-entry:${added.entry.id}`, fetch: deps.fetch, log: deps.log }).catch((e: Error) =>
          (deps.log ?? console.log)(`[raffle] entry email for ${added.entry.id} failed: ${e.message}`),
        );
      }
      return json(200, { ok: true });
    },
    'save your entry',
  );

export const POST: APIRoute = ({ request }) => handleEnter(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
