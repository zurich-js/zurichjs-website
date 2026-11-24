/**
 * Sponsors for the admin area (server/sponsor-admin.ts).
 *   GET ?q=&status=   → { ok, sponsors: [AdminSponsorView & { attention: Attention[] }], truncated, counts, attentionLabels }
 *                       (newest first, at most LIST_LIMIT, `truncated` when more match; `counts` per status over
 *                       every sponsorship, unfiltered lists only; `attention` is what needs someone today)
 *   POST { mode: 'invite' | 'import', companyName, legalName?, billingAddress?, vatId?, website?, contactName, contactEmail,
 *          tier, cycle, eventIds? (one-time), pricePerMeetup? (one-time, CHF), startedAt?, paidUntil? (import), notes?, message?, sendEmail? }
 *     → 200 { ok, sponsor, emailed } · 400 { error, field } · 409 the email belongs to a sponsorship
 */
import type { Status } from '@zurichjs/sponsorship';
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../../../server/http.ts';
import { adminSponsorView, zurichDay } from '../../../../../server/sponsor.ts';
import { LIST_LIMIT } from '../../../../../server/admin-views.ts';
import { ATTENTION_LABEL, attention, createSponsor, parseNewSponsor, sponsorAdminRoute, type SponsorAdminDeps } from '../../../../../server/sponsor-admin.ts';
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
      const found = await store.search({ q, status, limit: LIST_LIMIT + 1 });
      const sponsors = found.slice(0, LIST_LIMIT);
      const today = zurichDay(deps.now ? new Date(deps.now) : new Date());
      const summaries = await store.summaries(sponsors.map((s) => s.id));
      const rows = sponsors.map((s) => {
        const summary = summaries.get(s.id)!;
        return { ...adminSponsorView(s, summary.meetups, summary.hasContract), attention: attention(s, summary, today) };
      });
      const all = q || status ? null : await store.statusCounts();
      const counts = all && Object.fromEntries(STATUSES.map((s) => [s, all[s] ?? 0]));
      return json(200, { ok: true, sponsors: rows, truncated: found.length > LIST_LIMIT, counts, attentionLabels: ATTENTION_LABEL });
    },
    'load the sponsors',
  );

export const handleAddSponsor = (request: Request, deps: SponsorAdminDeps = {}) =>
  sponsorAdminRoute(
    request,
    deps,
    async ({ env, lifecycle, store }) => {
      const body = await readJsonObject(request);
      if (!body) return fail(400, 'Send the sponsor as JSON.');
      const parsed = parseNewSponsor(body);
      if (!parsed.ok) return fail(400, parsed.error, { field: parsed.field });
      const r = await createSponsor(parsed.value, { ...lifecycle, meetups: deps.meetups ?? (() => upcomingMeetups(env, deps.fetch)) });
      if (r.result === 'exists') return fail(409, `${r.contact.email} is already a contact of a sponsorship.`, { field: 'contactEmail', sponsorId: r.contact.sponsorId });
      return json(200, { ok: true, sponsor: adminSponsorView(r.sponsor, await store.meetups(r.sponsor.id)), emailed: r.emailed });
    },
    'add the sponsor',
  );

export const GET: APIRoute = ({ request }) => handleAdminSponsors(request);
export const POST: APIRoute = ({ request }) => handleAddSponsor(request);
export const ALL: APIRoute = () => methodNotAllowed('GET, POST');
