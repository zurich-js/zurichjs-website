/** Upcoming meetups for one-meetup sponsorships, for the admin forms. GET → { ok, meetups }. */
import type { APIRoute } from 'astro';
import { json, methodNotAllowed } from '../../../../../server/http.ts';
import { sponsorAdminRoute, type SponsorAdminDeps } from '../../../../../server/sponsor-admin.ts';
import { upcomingMeetups } from '../../../../../server/sponsor-meetups.ts';

export const prerender = false;

export const handleAdminMeetups = (request: Request, deps: SponsorAdminDeps = {}) =>
  sponsorAdminRoute(request, deps, async ({ env }) => json(200, { ok: true, meetups: await (deps.meetups ?? (() => upcomingMeetups(env, deps.fetch)))() }), 'load the meetups');

export const GET: APIRoute = ({ request }) => handleAdminMeetups(request);
export const ALL: APIRoute = () => methodNotAllowed('GET');
