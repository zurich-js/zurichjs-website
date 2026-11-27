/**
 * The board records the next term of a member who pays by cash or bank transfer
 * (server/membership-manual.ts): paid until moves to the end of that term and its certificate is
 * issued, optionally emailed.
 *
 * POST /api/membership/admin/members/:id/manual-payment   { startMonth: 'YYYY-MM', sendEmail? }
 *   200 { ok, member, certificate, emailed } · 400 { error, field } · 404
 *   409 not paying by cash or bank transfer, or that term is already recorded · 401 · 403 · 503
 */
import { label } from '@zurichjs/membership';
import type { APIRoute } from 'astro';
import { longDate } from '../../../../../../server/dates.ts';
import { adminRoute, type AdminDeps } from '../../../../../../server/admin-route.ts';
import { adminMember } from '../../../../../../server/admin-views.ts';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../../../../server/http.ts';
import { parseStartMonth, recordManualPayment, type ManualDeps } from '../../../../../../server/membership-manual.ts';

export const prerender = false;

export const handleManualPayment = (request: Request, id: string, deps: AdminDeps & Pick<ManualDeps, 'slack' | 'signature'> = {}) =>
  adminRoute(
    request,
    deps,
    async ({ env, store, origin }) => {
      const body = await readJsonObject(request);
      const startMonth = body && parseStartMonth(body);
      if (!body || !startMonth) return fail(400, 'Choose the month the paid term starts.', { field: 'startMonth' });
      const r = await recordManualPayment(
        id,
        { startMonth, sendEmail: body.sendEmail !== false },
        { env, store, origin, fetch: deps.fetch, slack: deps.slack, log: deps.log, signature: deps.signature },
      );
      if (r.result === 'not_found') return fail(404, 'No such member.');
      if (r.result === 'not_manual') return fail(409, `Only a membership paid by cash or bank transfer can be recorded here. This one is ${label(r.member.status)}.`);
      if (r.result === 'exists')
        return fail(409, `The term from ${longDate(r.certificate.periodStart)} is already recorded (certificate ${r.certificate.number}).`, { field: 'startMonth' });
      return json(200, { ok: true, member: adminMember(r.member), certificate: { number: r.certificate.number }, emailed: r.emailed });
    },
    'record the payment',
  );

export const POST: APIRoute = ({ request, params }) => handleManualPayment(request, String(params.id ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('POST');
