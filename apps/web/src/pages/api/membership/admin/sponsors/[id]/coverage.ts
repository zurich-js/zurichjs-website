/**
 * The meetups a recurring sponsorship covers, confirmed by the board. Being a sponsor does not
 * cover every meetup: only meetups confirmed here show on the sponsor's dashboard. Rows are taken
 * off, never deleted, and a meetup that has happened stays.
 *   GET → { ok, coverage: [{ eventId, title, date, confirmedAt, confirmedBy, removedAt, removedBy, current }], checked, locked }
 *     current: { date, state, url } as the sponsor sees it now, for rows still covered; checked: false when Sanity failed
 *   POST { action: 'add', eventId } (an upcoming published meetup) · { action: 'remove', eventId }
 *     → 200 { ok, coverage, locked } · 400 · 404 · 409 (one-time, ended, or a meetup that has happened)
 *     · 503 (remove: Sanity could not be reached, so the meetup's current date is unknown and the row stays)
 * Whether a meetup has happened is decided on its current date in Sanity, the date the sponsor sees.
 */
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../../../../server/http.ts';
import { note, slackText, who } from '../../../../../../server/sponsor.ts';
import { BOARD, resolveMeetups, sponsorAdminRoute, type SponsorAdminDeps } from '../../../../../../server/sponsor-admin.ts';
import { coverageForBoard, coverageLocked, removalCheck, sanityMeetups, type LiveLookup } from '../../../../../../server/sponsor-coverage.ts';
import { upcomingMeetups } from '../../../../../../server/sponsor-meetups.ts';

export const prerender = false;

export const handleAdminCoverage = (request: Request, id: string, deps: SponsorAdminDeps & { live?: LiveLookup } = {}) =>
  sponsorAdminRoute(
    request,
    deps,
    async ({ store, env, lifecycle }) => {
      const s = await store.get(id);
      if (!s) return fail(404, 'No such sponsor.');
      const live = deps.live ?? sanityMeetups(env, deps.fetch);
      const now = deps.now ? new Date(deps.now) : new Date();
      const answer = async () => json(200, { ok: true, ...(await coverageForBoard(await store.coverage(s.id), live, now)), locked: coverageLocked(s) });
      if (request.method === 'GET') return answer();

      const body = (await readJsonObject(request)) ?? {};
      const eventId = typeof body.eventId === 'string' && body.eventId.length <= 200 ? body.eventId : '';
      if (!eventId) return fail(400, 'Choose a meetup.', { field: 'eventId' });
      const locked = coverageLocked(s);
      if (locked) return fail(409, locked);
      if (body.action === 'add') {
        const [m] = await resolveMeetups([eventId], deps.meetups ?? (() => upcomingMeetups(env, deps.fetch)));
        await store.cover(s.id, m!, BOARD);
        await note(`:calendar: ${who(s)} now covers ${slackText(m!.title)}.`, lifecycle);
        return answer();
      }
      if (body.action === 'remove') {
        const row = (await store.meetups(s.id)).find((m) => m.eventId === eventId);
        if (!row) return fail(404, 'That meetup is not covered.');
        const check = await removalCheck(row, live, now);
        if (check === 'unverified') return fail(503, 'We couldn’t check the meetup’s current date, so it stays covered. Try again in a minute.');
        if (check === 'happened') return fail(409, 'That meetup has happened. It stays in the sponsorship’s history.');
        await store.uncover(s.id, eventId, BOARD);
        return answer();
      }
      return fail(400, 'Unknown action.', { field: 'action' });
    },
    'change the covered meetups',
  );

export const GET: APIRoute = ({ request, params }) => handleAdminCoverage(request, String(params.id ?? ''));
export const POST: APIRoute = ({ request, params }) => handleAdminCoverage(request, String(params.id ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('GET, POST');
