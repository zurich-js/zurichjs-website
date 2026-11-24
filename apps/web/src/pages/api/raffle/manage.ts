/**
 * An entrant's own link (/raffle/manage#t=…), without an account.
 *   POST { token, action: 'view' }    → 200 { ok, entry } · 404
 *   POST { token, action: 'confirm' } → 200 { ok, entry } (the email is verified by its owner's click)
 *   POST { token, action: 'share' }    → 200 { ok, entry } (lets the sponsor have the contact; the link proves the address)
 *   POST { token, action: 'withdraw' } → 200 { ok, entry } (stops any later share; works without an account, any time)
 * `entry.sharing` says whether this raffle shares, with whom and why, and the entrant's current choice.
 * Opening the page only views; the address is verified only when its owner clicks Confirm, so a mail
 * scanner that opens links cannot confirm it.
 */
import type { APIRoute } from 'astro';
import { longDate } from '../../../server/dates.ts';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../server/http.ts';
import { sharingGate, tokenHash } from '../../../server/raffle.ts';
import { raffleRoute, type RaffleRouteDeps } from '../../../server/raffle-route.ts';
import { clientKey, rateLimited } from '../../../server/rateLimit.ts';

export const prerender = false;

export const handleManage = (request: Request, deps: RaffleRouteDeps = {}) =>
  raffleRoute(
    request,
    deps,
    async ({ raffles, sponsors, env, now }) => {
      if (rateLimited('raffle-manage', clientKey(request), 30, 10 * 60_000)) return fail(429, 'Too many tries. Wait a few minutes.');
      const body = (await readJsonObject(request)) ?? {};
      const token = typeof body.token === 'string' && /^[A-Za-z0-9_-]{20,100}$/.test(body.token) ? body.token : '';
      let entry = token ? await raffles.entryByToken(tokenHash(token)) : null;
      if (!entry) return fail(404, 'This link is not valid. Use the link in your latest raffle email.');
      const r = (await raffles.get(entry.raffleId))!;
      const gate = sharingGate(env, r);
      if (body.action === 'confirm') entry = await raffles.verifyEntry(entry.id);
      else if (body.action === 'share') {
        if (!r.sharingVersion || !gate.open) return fail(409, 'This raffle does not share contacts with its sponsor.');
        await raffles.giveConsent(entry.id, { verified: true, at: now });
      } else if (body.action === 'withdraw') await raffles.withdrawConsent(entry.id, now);
      else if (body.action !== 'view') return fail(400, 'Unknown action.', { field: 'action' });
      const consent = await raffles.consentOf(entry.id);
      const sponsorName = r.sharingVersion ? ((await sponsors.get(r.sponsorId))?.companyName ?? 'the sponsor') : null;
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
          // A withdrawal always works (and is confirmed back); offering the choice needs the gate open now.
          sharing:
            r.sharingVersion && (gate.open || consent || body.action === 'withdraw')
              ? {
                  sponsorName,
                  purpose: r.sharePurpose,
                  sponsorPrivacyUrl: r.sharePrivacyUrl,
                  noticeUrl: gate.open ? gate.noticeUrl : null,
                  given: !!consent,
                  counts: !!consent?.verifiedAt,
                  canGive: gate.open,
                }
              : null,
        },
      });
    },
    'open your entry',
  );

export const POST: APIRoute = ({ request }) => handleManage(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
