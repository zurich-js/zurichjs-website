/**
 * Sponsors for the admin area (server/sponsor-admin.ts).
 *   GET ?q=&status=   → { ok, sponsors, counts } (newest first, at most 500)
 *   POST { mode: 'invite' | 'import', companyName, legalName?, billingAddress?, vatId?, website?, contactName, contactEmail,
 *          tier, cycle, eventId? (one meetup), paidUntil? startedAt? (import), notes?, message?, sendEmail? }
 *     → 200 { ok, sponsor, emailed } · 400 { error, field } · 409 the email belongs to a sponsor
 */
import type { Status } from '@zurichjs/sponsorship';
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../../../server/http.ts';
import { adminSponsorView } from '../../../../../server/sponsor.ts';
import { createSponsor, parseNewSponsor, sponsorAdminRoute, type SponsorAdminDeps } from '../../../../../server/sponsor-admin.ts';
import { upcomingMeetups } from '../../../../../server/sponsor-meetups.ts';

export const prerender = false;

const STATUSES: Status[] = ['pending', 'active', 'past_due', 'ending', 'ended'];

export const handleAdminSponsors = (request: Request, deps: SponsorAdminDeps = {}) =>
  sponsorAdminRoute(
    request,
    deps,
    async ({ store }) => {
      const url = new URL(request.url);
      const q = url.searchParams.get('q')?.trim().slice(0, 200) || undefined;
      const status = STATUSES.find((s) => s === url.searchParams.get('status'));
      const sponsors = await store.search({ q, status, limit: 500 });
      const counts = q || status ? null : Object.fromEntries(STATUSES.map((s) => [s, sponsors.filter((x) => x.status === s).length]));
      return json(200, { ok: true, sponsors: sponsors.map(adminSponsorView), counts });
    },
    'load the sponsors',
  );

export const handleAddSponsor = (request: Request, deps: SponsorAdminDeps = {}) =>
  sponsorAdminRoute(
    request,
    deps,
    async ({ env, lifecycle }) => {
      const body = await readJsonObject(request);
      if (!body) return fail(400, 'Send the sponsor as JSON.');
      const parsed = parseNewSponsor(body);
      if (!parsed.ok) return fail(400, parsed.error, { field: parsed.field });
      const r = await createSponsor(parsed.value, { ...lifecycle, meetups: deps.meetups ?? (() => upcomingMeetups(env, deps.fetch)) });
      if (r.result === 'exists') return fail(409, `${r.contact.email} is already a contact of a sponsor.`, { field: 'contactEmail', sponsorId: r.contact.sponsorId });
      return json(200, { ok: true, sponsor: adminSponsorView(r.sponsor), emailed: r.emailed });
    },
    'add the sponsor',
  );

export const GET: APIRoute = ({ request }) => handleAdminSponsors(request);
export const POST: APIRoute = ({ request }) => handleAddSponsor(request);
export const ALL: APIRoute = () => methodNotAllowed('GET, POST');
