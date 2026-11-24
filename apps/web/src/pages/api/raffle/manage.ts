/**
 * An entrant's own link (/raffle/manage#t=…), without an account.
 *   POST { token, action: 'view' }    → 200 { ok, entry } · 404
 *   POST { token, action: 'confirm' } → 200 { ok, entry } (the email is verified by its owner's click)
 * Opening the page only views; the address is verified only when its owner clicks Confirm, so a mail
 * scanner that opens links cannot confirm it.
 */
import type { APIRoute } from 'astro';
import { longDate } from '../../../server/dates.ts';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../server/http.ts';
import { tokenHash } from '../../../server/raffle.ts';
import { raffleRoute, type RaffleRouteDeps } from '../../../server/raffle-route.ts';
import { clientKey, rateLimited } from '../../../server/rateLimit.ts';

export const prerender = false;

export const handleManage = (request: Request, deps: RaffleRouteDeps = {}) =>
  raffleRoute(
    request,
    deps,
    async ({ raffles }) => {
      if (rateLimited('raffle-manage', clientKey(request), 30, 10 * 60_000)) return fail(429, 'Too many tries. Wait a few minutes.');
      const body = (await readJsonObject(request)) ?? {};
      const token = typeof body.token === 'string' && /^[A-Za-z0-9_-]{20,100}$/.test(body.token) ? body.token : '';
      let entry = token ? await raffles.entryByToken(tokenHash(token)) : null;
      if (!entry) return fail(404, 'This link is not valid. Use the link in your latest raffle email.');
      if (body.action === 'confirm') entry = await raffles.verifyEntry(entry.id);
      else if (body.action !== 'view') return fail(400, 'Unknown action.', { field: 'action' });
      const r = (await raffles.get(entry.raffleId))!;
      return json(200, {
        ok: true,
        entry: {
          name: entry.name,
          email: entry.email,
          claimCode: entry.claimCode,
          verified: !!entry.emailVerifiedAt,
          prize: r.prize,
          eventTitle: r.eventTitle,
          eventDateLabel: longDate(r.eventDate),
          raffleId: r.id,
        },
      });
    },
    'open your entry',
  );

export const POST: APIRoute = ({ request }) => handleManage(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
