/** Upcoming meetups a one-meetup sponsorship can be for. GET → { ok, meetups: [{ id, title, date }] }. Signed in. */
import type { APIRoute } from 'astro';
import { json, methodNotAllowed } from '../../../server/http.ts';
import { upcomingMeetups } from '../../../server/sponsor-meetups.ts';
import { signedInSponsor, type SponsorRouteDeps } from '../../../server/sponsor-route.ts';

export const prerender = false;

export const handleMeetups = (request: Request, deps: SponsorRouteDeps = {}) =>
  signedInSponsor(request, deps, async ({ env }) => json(200, { ok: true, meetups: await (deps.meetups ?? (() => upcomingMeetups(env, deps.fetch)))() }), 'load the meetups');

export const GET: APIRoute = ({ request }) => handleMeetups(request);
export const ALL: APIRoute = () => methodNotAllowed('GET');
