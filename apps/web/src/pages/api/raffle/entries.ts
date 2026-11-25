/**
 * Enter a raffle: free, no account, a name or nickname and an email, and the rules accepted.
 *   POST { raffleId, name, email, rules: true, share?: boolean (the optional, unticked sharing box), company? (honeypot, must be empty) }
 *     → 200 { ok } · 400 { error, field } · 404 · 409 (entries closed) · 429
 * One entry per email per raffle. The answer is the same for a new and a repeated email, so the
 * form never tells anyone whether an address entered. The entry counts at once; the email we send
 * has the claim code and the entrant's own link, where they confirm the address.
 */
import { claimCode, RaffleRuleError } from '@zurichjs/raffle';
import { deliverRaffleMail, managementGrant } from '../../../server/raffle-mail.ts';
import type { APIRoute } from 'astro';
import { fail, isEmail, json, methodNotAllowed, readJsonObject } from '../../../server/http.ts';
import { sharingGate } from '../../../server/raffle.ts';
import { raffleRoute, type RaffleRouteDeps } from '../../../server/raffle-route.ts';
import { clientKey, rateLimited } from '../../../server/rateLimit.ts';

export const prerender = false;

export const handleEnter = (request: Request, deps: RaffleRouteDeps = {}) =>
  raffleRoute(
    request,
    deps,
    async ({ env, raffles, sponsors, origin, now, fetch }) => {
      if (rateLimited('raffle-enter', clientKey(request), 10, 10 * 60_000)) return fail(429, 'Too many entries from here. Wait a few minutes, then try again.');
      const body = (await readJsonObject(request)) ?? {};
      if (typeof body.company === 'string' && body.company) return json(200, { ok: true });
      if (body.action === 'recover') {
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        const rid = typeof body.raffleId === 'string' ? body.raffleId : '';
        if (!isEmail(email) || !rid) return fail(400, 'Enter your raffle email.');
        if (!rateLimited('raffle-recovery', rid + ':' + email, 3, 60 * 60_000)) {
          const { nonce, hash } = managementGrant(env);
          await raffles.recover(rid, email, nonce, hash);
        }
        return json(200, { ok: true });
      }
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

      const gate = sharingGate(env, r);
      const noticeDecision = gate.open && r.sharingVersion ? body.share === true && body.noticeVersion === r.sharingVersion : undefined;
      if (body.share === true && gate.open && r.sharingVersion && noticeDecision !== true) return fail(409, 'Review the current sharing notice before entering.');
      const { nonce, hash } = managementGrant(env);
      let added: Awaited<ReturnType<typeof raffles.addEntry>> | null = null;
      for (let i = 0; i < 3 && !added; i++) {
        try {
          added = await raffles.addEntry(r.id, { name, email, claimCode: claimCode(), tokenHash: hash, mailNonce: nonce, noticeDecision }, now);
        } catch (cause) {
          if (!(cause instanceof RaffleRuleError && /Claim code/.test(cause.message))) throw cause;
        }
      }
      if (!added) throw new Error('No free claim code after three tries.');
      await deliverRaffleMail(env, raffles, sponsors, origin, { fetch, entryId: added.entry.id });
      return json(200, { ok: true });
    },
    'save your entry',
  );

export const POST: APIRoute = ({ request }) => handleEnter(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
