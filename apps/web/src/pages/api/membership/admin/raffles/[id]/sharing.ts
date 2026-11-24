/**
 * Sharing a raffle's entrant contacts with its sponsor (docs/domains/sponsorship/raffles.md), for
 * the board. Off unless the sharing gate is open for this raffle (raffle.ts, sharingGate).
 *
 *   GET → { ok, gate, counts: { given, valid, withdrawn }, preview: [{ id, name, email }] (valid consent now),
 *           recipients: [{ id, name, email }] (the sponsor's confirmed contacts), shares, erasable }
 *   POST { action: 'release', entryIds, recipientContactId, fields: ['name'|'email'], days (1 to 30), confirm: true }
 *     The share is the chosen rows narrowed to valid consent now: the board narrows, never widens.
 *   POST { action: 'revoke', shareId }
 *   POST { action: 'erase', confirm: true }   names and emails removed once the retention period after
 *     the raffle has passed (fulfilled or cancelled); draws and counts stay.
 * Slack gets counts, never names or emails.
 */
import type { ShareField } from '@zurichjs/raffle';
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../../../../server/http.ts';
import { raffleStore, sharingGate } from '../../../../../../server/raffle.ts';
import { note, slackText } from '../../../../../../server/sponsor.ts';
import { BOARD, sponsorAdminRoute, type SponsorAdminDeps } from '../../../../../../server/sponsor-admin.ts';
import { confirmed } from '../../../../../../server/sponsor-stripe.ts';

export const prerender = false;

const DAY = 86_400_000;

export const handleRaffleSharing = (request: Request, id: string, deps: SponsorAdminDeps = {}) =>
  sponsorAdminRoute(
    request,
    deps,
    async ({ env, store, lifecycle }) => {
      const raffles = deps.raffles ?? raffleStore(env);
      const r = await raffles.get(id);
      if (!r) return fail(404, 'No such raffle.');
      const now = deps.now === undefined ? new Date() : new Date(deps.now);
      const gate = sharingGate(env, r);
      const recipients = (await store.contacts(r.sponsorId)).filter(confirmed);
      const ended = r.stage === 'fulfilled' || r.stage === 'cancelled';
      const erasableFrom = gate.open && ended && r.closesAt ? new Date(Date.parse(r.closesAt) + gate.retentionDays * DAY) : null;

      const answer = async () => {
        const [counts, preview, shares] = await Promise.all([
          raffles.consentCounts(r.id),
          r.sharingVersion && gate.open ? raffles.consentedEntries(r.id) : [],
          raffles.shares(r.id),
        ]);
        return json(200, {
          ok: true,
          gate: gate.open ? { open: true, version: gate.version, retentionDays: gate.retentionDays } : gate,
          offered: !!r.sharingVersion,
          purpose: r.sharePurpose,
          counts,
          preview: preview.map((e) => ({ id: e.id, name: e.name, email: e.email })),
          recipients: recipients.map((c) => ({ id: c.id, name: c.name, email: c.email })),
          shares: shares.map((s) => ({
            id: s.id,
            recipient: recipients.find((c) => c.id === s.recipientContactId)?.name ?? 'a former contact',
            fields: s.fields,
            count: s.entryIds.length,
            createdAt: s.createdAt,
            expiresAt: s.expiresAt,
            revokedAt: s.revokedAt,
          })),
          erasableFrom: erasableFrom?.toISOString() ?? null,
        });
      };
      if (request.method === 'GET') return answer();

      const body = (await readJsonObject(request)) ?? {};
      if (body.action === 'revoke') {
        const s = typeof body.shareId === 'string' ? await raffles.getShare(body.shareId) : null;
        if (!s || s.raffleId !== r.id) return fail(404, 'No such share.');
        await raffles.revokeShare(s.id, BOARD);
        return answer();
      }
      if (body.action === 'erase') {
        if (body.confirm !== true) return fail(400, 'Tick the box to erase the names and emails.', { field: 'confirm' });
        if (!erasableFrom) return fail(409, gate.open ? 'Only a fulfilled or cancelled raffle is erased.' : gate.reason);
        if (now < erasableFrom) return fail(409, `The retention period runs until ${erasableFrom.toISOString().slice(0, 10)}.`);
        const n = await raffles.eraseEntries(r.id, BOARD);
        await note(`:wastebasket: Raffle entries erased for ${slackText(r.eventTitle)}: ${n}.`, lifecycle);
        return answer();
      }
      if (body.action !== 'release') return fail(400, 'Unknown action.', { field: 'action' });
      if (!gate.open) return fail(409, gate.reason);
      if (!r.sharingVersion) return fail(409, 'This raffle opened without sharing: no entrant was asked.');
      if (body.confirm !== true) return fail(400, 'Tick the box to confirm what you release, to whom.', { field: 'confirm' });
      const recipient = recipients.find((c) => c.id === body.recipientContactId);
      if (!recipient) return fail(400, 'Choose a confirmed contact of the sponsor.', { field: 'recipientContactId' });
      const fields = Array.isArray(body.fields) ? [...new Set(body.fields.filter((f): f is ShareField => f === 'name' || f === 'email'))] : [];
      if (!fields.length) return fail(400, 'Choose what to release.', { field: 'fields' });
      const days = Number(body.days);
      if (!Number.isInteger(days) || days < 1 || days > 30) return fail(400, 'Choose for how many days, from 1 to 30.', { field: 'days' });
      const entryIds = Array.isArray(body.entryIds) ? body.entryIds.filter((x): x is string => typeof x === 'string').slice(0, 5000) : [];
      if (!entryIds.length) return fail(400, 'Choose the entries to release.', { field: 'entryIds' });
      const share = await raffles.createShare(r.id, {
        recipientContactId: recipient.id,
        fields,
        entryIds,
        expiresAt: new Date(now.getTime() + days * DAY).toISOString(),
        actor: BOARD,
      });
      await note(`:outbox_tray: Raffle contacts released for ${slackText(r.eventTitle)}: ${share.entryIds.length}, for ${days} days.`, lifecycle);
      return answer();
    },
    'share the raffle contacts',
  );

export const GET: APIRoute = ({ request, params }) => handleRaffleSharing(request, String(params.id ?? ''));
export const POST: APIRoute = ({ request, params }) => handleRaffleSharing(request, String(params.id ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('GET, POST');
