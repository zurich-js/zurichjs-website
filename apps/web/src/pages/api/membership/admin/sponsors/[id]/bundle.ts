/**
 * The meetups (and price per meetup) of a one-time sponsorship: a bundle at a custom price before
 * it is paid, or moving its meetups afterwards (e.g. a meetup was cancelled).
 *   POST { eventIds: string[], pricePerMeetup?: number | null (CHF; null = list price) } → 200 { ok, sponsor } · 400 · 404 · 409
 */
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../../../../server/http.ts';
import { adminSponsorView } from '../../../../../../server/sponsor.ts';
import { BOARD, resolveMeetups, sponsorAdminRoute, type SponsorAdminDeps } from '../../../../../../server/sponsor-admin.ts';
import { parsePrice } from '../../../../../../server/sponsor-input.ts';
import { setBundle } from '../../../../../../server/sponsor-lifecycle.ts';
import { upcomingMeetups } from '../../../../../../server/sponsor-meetups.ts';

export const prerender = false;

export const handleBundle = (request: Request, id: string, deps: SponsorAdminDeps = {}) =>
  sponsorAdminRoute(
    request,
    deps,
    async ({ store, env, lifecycle }) => {
      const s = await store.get(id);
      if (!s) return fail(404, 'No such sponsor.');
      const body = (await readJsonObject(request)) ?? {};
      const ids = Array.isArray(body.eventIds) ? [...new Set(body.eventIds.filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length <= 200))] : [];
      if (!ids.length) return fail(400, 'Choose at least one meetup.', { field: 'eventIds' });
      const price = parsePrice('pricePerMeetup' in body ? body.pricePerMeetup : s.pricePerMeetup);
      if (!price.ok) return fail(400, price.error, { field: price.field });
      const meetups = await resolveMeetups(ids, deps.meetups ?? (() => upcomingMeetups(env, lifecycle.fetch)));
      const updated = await setBundle(s, meetups, price.value, BOARD, lifecycle);
      return json(200, { ok: true, sponsor: adminSponsorView(updated, await store.meetups(s.id), (await store.documents(s.id)).length > 0) });
    },
    'save the meetups',
  );

export const POST: APIRoute = ({ request, params }) => handleBundle(request, String(params.id ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('POST');
