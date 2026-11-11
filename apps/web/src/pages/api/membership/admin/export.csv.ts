/** All members as CSV (for the board and the bookkeeping). GET → text/csv. */
import type { APIRoute } from 'astro';
import { adminRoute, type AdminDeps } from '../../../../server/admin-route.ts';
import { membersCsv } from '../../../../server/admin-views.ts';
import { methodNotAllowed } from '../../../../server/http.ts';

export const prerender = false;

export const handleAdminExport = (request: Request, deps: AdminDeps = {}) =>
  adminRoute(
    request,
    deps,
    async ({ store }) =>
      new Response(membersCsv(await store.search({ limit: 1000 })), {
        status: 200,
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="zurichjs-members-${new Date().toISOString().slice(0, 10)}.csv"`,
          'cache-control': 'private, no-store',
        },
      }),
    'export the members',
  );

export const GET: APIRoute = ({ request }) => handleAdminExport(request);
export const ALL: APIRoute = () => methodNotAllowed('GET');
