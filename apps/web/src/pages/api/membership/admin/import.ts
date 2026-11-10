/**
 * Imports members who joined on paper and pay by hand (CSV format in
 * packages/membership/src/import.ts), from the admin area or
 * `pnpm membership:import` (the admin password as a Bearer token). Netlify
 * Database changes to production data go through the application, and member
 * data must not be committed to git as a migration, hence this endpoint.
 *
 * POST /api/membership/admin/import   admin session cookie, or Authorization: Bearer <MEMBERSHIP_ADMIN_PASSWORD>
 *   JSON { csv, apply?: boolean }
 *   200 { ok: true, applied, rows: [{ line, email, name, … }], problems: [] }   dry run unless apply
 *   400 { ok: false, problems }   nothing imported
 *   401 not signed in · 403 not from this site · 503 not set up
 */
import { parseImport } from '@zurichjs/membership';
import type { APIRoute } from 'astro';
import { adminRoute, type AdminDeps } from '../../../../server/admin-route.ts';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../../server/http.ts';

export const prerender = false;

export const handleImport = (request: Request, deps: AdminDeps = {}) =>
  adminRoute(
    request,
    deps,
    async ({ store }) => {
      const body = await readJsonObject(request);
      if (!body || typeof body.csv !== 'string' || body.csv.length > 2_000_000) return fail(400, 'Send { csv } as JSON (at most 2 MB).');
      const { rows, problems } = parseImport(body.csv);
      for (const r of rows) if (await store.byEmail(r.member.email)) problems.push({ line: r.line, message: `${r.member.email} is already a member.` });
      if (problems.length) return json(400, { ok: false, error: 'Nothing imported. Fix the rows listed.', problems: problems.sort((a, b) => a.line - b.line) });
      const summary = rows.map((r) => ({ line: r.line, email: r.member.email, name: r.member.name, level: r.member.level, cycle: r.member.cycle, paidUntil: r.member.paidUntil }));
      if (body.apply !== true) return json(200, { ok: true, applied: false, rows: summary, problems: [] });
      const actor = { kind: 'script', id: 'membership-import' } as const;
      let done = 0;
      for (const r of rows) {
        await store.create(r.member, actor);
        done++;
      }
      return json(200, { ok: true, applied: true, imported: done, rows: summary, problems: [] });
    },
    'import the members',
  );

export const POST: APIRoute = ({ request }) => handleImport(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
