/** Members for the admin area. GET ?q=&status= → { ok, members } (newest first, at most 500). */
import { isMember, type Status } from '@zurichjs/membership';
import type { APIRoute } from 'astro';
import { adminRoute, type AdminDeps } from '../../../../../server/admin-route.ts';
import { adminMember } from '../../../../../server/admin-views.ts';
import { json, methodNotAllowed } from '../../../../../server/http.ts';

export const prerender = false;

const STATUSES: Status[] = ['pending', 'active', 'past_due', 'imported_manual', 'resigning', 'ended'];

export const handleAdminMembers = (request: Request, deps: AdminDeps = {}) =>
  adminRoute(
    request,
    deps,
    async ({ store }) => {
      const url = new URL(request.url);
      const q = url.searchParams.get('q')?.trim().slice(0, 200) || undefined;
      const status = STATUSES.find((s) => s === url.searchParams.get('status'));
      const members = await store.search({ q, status, limit: 500 });
      // Totals for the overview, only when the list is not filtered.
      const counts =
        q || status
          ? null
          : { members: members.filter((m) => isMember(m.status)).length, ...Object.fromEntries(STATUSES.map((s) => [s, members.filter((m) => m.status === s).length])) };
      return json(200, { ok: true, members: members.map(adminMember), counts });
    },
    'load the members',
  );

export const GET: APIRoute = ({ request }) => handleAdminMembers(request);
export const ALL: APIRoute = () => methodNotAllowed('GET');
