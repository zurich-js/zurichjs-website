/**
 * Contacts the board released to this sponsor contact (docs/domains/sponsorship/raffles.md).
 *   GET ?s=<share id> (session cookie) → 200 { ok, purpose, fields, expiresAt, rows: [{ name, email }] } · 401 · 404 · 409 (expired, revoked, sharing off)
 * Only the named recipient can read it, only until it expires, and only while the sharing gate is
 * open. Every read narrows the rows to consent valid at that moment: a withdrawal removes the row.
 * Each read is logged with the number of rows.
 */
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed } from '../../../../../server/http.ts';
import { raffleStore, sharingGate } from '../../../../../server/raffle.ts';
import { signedInSponsor, type SponsorRouteDeps } from '../../../../../server/sponsor-route.ts';

export const prerender = false;

export const handleShareRead = (request: Request, id: string, deps: SponsorRouteDeps = {}) =>
  signedInSponsor(
    request,
    deps,
    async ({ sponsor: s, contact, env, user }) => {
      if (!s || !contact) return fail(404, 'No sponsorship for this email.');
      const raffles = deps.raffles ?? raffleStore(env);
      const r = await raffles.get(id);
      const share = await raffles.getShare(new URL(request.url).searchParams.get('s') ?? '');
      if (!r || r.sponsorId !== s.id || !share || share.raffleId !== r.id || share.recipientContactId !== contact.id) return fail(404, 'No such share.');
      const gate = sharingGate(env, r);
      if (!gate.open) return fail(409, 'Sharing is switched off. Write to us.');
      const read = await raffles.readShare(share.id, { kind: 'sponsor', id: user.id }, deps.now?.() ?? new Date());
      return json(200, { ok: true, purpose: share.purpose, fields: share.fields, expiresAt: share.expiresAt, rows: read.rows.map((x) => ({ name: x.name, email: x.email })) });
    },
    'load the shared contacts',
  );

export const GET: APIRoute = ({ request, params }) => handleShareRead(request, String(params.id ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('GET');
