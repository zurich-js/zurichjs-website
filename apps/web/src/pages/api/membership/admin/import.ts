/**
 * Imports members who joined on paper and pay by hand (CSV format in
 * packages/membership/src/import.ts). Called by `pnpm membership:import`.
 * Netlify Database changes to production data go through the application,
 * not a direct connection, and member data must not be committed to git as a
 * migration, hence this endpoint.
 *
 * POST /api/membership/admin/import   Authorization: Bearer <MEMBERSHIP_ADMIN_TOKEN>
 *   JSON { csv, apply?: boolean }
 *   200 { ok: true, applied, rows: [{ line, email, name }], problems: [] }   dry run unless apply
 *   400 { ok: false, problems }   nothing imported
 *   401 wrong or missing token · 503 not configured
 */
import { timingSafeEqual } from 'node:crypto';
import { parseImport, type MemberStore } from '@zurichjs/membership';
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject, type Env } from '../../../../server/http.ts';
import { MembershipUnavailable, memberStore } from '../../../../server/membership-db.ts';

export const prerender = false;

const sameToken = (given: string, expected: string) => {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

export async function handleImport(request: Request, deps: { env?: Env; store?: MemberStore } = {}): Promise<Response> {
  const env = deps.env ?? process.env;
  const expected = env.MEMBERSHIP_ADMIN_TOKEN;
  if (!expected || expected.length < 32) return fail(503, 'MEMBERSHIP_ADMIN_TOKEN (32+ characters) is not set.');
  const given = /^Bearer (.+)$/.exec(request.headers.get('authorization') ?? '')?.[1] ?? '';
  if (!sameToken(given, expected)) return fail(401, 'Wrong or missing token.');
  const body = await readJsonObject(request);
  if (!body || typeof body.csv !== 'string' || body.csv.length > 2_000_000) return fail(400, 'Send { csv } as JSON (at most 2 MB).');
  try {
    const store = deps.store ?? memberStore(env);
    const { rows, problems } = parseImport(body.csv);
    for (const r of rows) if (await store.byEmail(r.member.email)) problems.push({ line: r.line, message: `${r.member.email} is already a member.` });
    if (problems.length) return json(400, { ok: false, problems: problems.sort((a, b) => a.line - b.line) });
    const summary = rows.map((r) => ({ line: r.line, email: r.member.email, name: r.member.name, level: r.member.level, cycle: r.member.cycle, paidUntil: r.member.paidUntil }));
    if (body.apply !== true) return json(200, { ok: true, applied: false, rows: summary, problems: [] });
    const actor = { kind: 'script', id: 'membership-import' } as const;
    let done = 0;
    for (const r of rows) {
      await store.create(r.member, actor);
      done++;
    }
    return json(200, { ok: true, applied: true, imported: done, rows: summary, problems: [] });
  } catch (cause) {
    if (cause instanceof MembershipUnavailable) return fail(503, 'Membership database not configured.');
    console.error('[membership] import failed', cause);
    return fail(502, 'The import failed part way; run it again (imported emails are reported as already members).');
  }
}

export const POST: APIRoute = ({ request }) => handleImport(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
