/**
 * Adding a member who paid manually (cash/bank) from the admin area (owner, 11th
 * November 2026), instead of a CSV import. The board gives who they are, the level and cycle, and
 * the month their paid term started; the term runs one cycle from there.
 *
 *   1. The member is recorded as paid manually, cash/bank (imported_manual) until the end of that term.
 *   2. They get the certificate of membership for that term.
 *   3. Optionally they are emailed: their membership is on the website now, the certificate is
 *      attached, and they are asked to set up automatic payment. When they do (account page,
 *      "Switch to automatic payment"), Stripe charges nothing before the term ends (trial_end,
 *      membership-stripe.ts), and the first Stripe payment renews them as usual.
 *   4. The board gets a Slack note.
 */
import { DuplicateEmail, isCycle, isLevel, normaliseEmail, type Category, type Certificate, type Member, type MemberKind, type MemberStore } from '@zurichjs/membership';
import { manualTerm } from '../lib/membership.ts';
import { lastDay, longDate } from './dates.ts';
import { isEmail, type Env } from './http.ts';
import { issueAndSendCertificate } from './membership-certificate.ts';
import { notify, who, type MembershipSlack } from './membership-slack.ts';

export interface ManualMemberInput {
  kind: MemberKind;
  name: string;
  organisationName: string | null;
  email: string;
  level: Member['level'];
  cycle: Member['cycle'];
  /** The month the paid term started, YYYY-MM. */
  startMonth: string;
  category: Category;
  notes: string | null;
  /** Email them the certificate and the link to set up automatic payment. */
  sendEmail: boolean;
}

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string; field: string };

/** Who the member is and which membership: the fields the admin forms share (adding a manual member, inviting). */
export type MemberDetails = Pick<ManualMemberInput, 'kind' | 'name' | 'organisationName' | 'email' | 'level' | 'cycle' | 'notes'>;

/** Checks who the member is and which membership. Errors name the field, in the words the forms use. */
export function parseMemberDetails(body: Record<string, unknown>): Parsed<MemberDetails> {
  const str = (k: string) => (typeof body[k] === 'string' ? (body[k] as string).trim() : '');
  const kind = str('kind') || 'person';
  if (kind !== 'person' && kind !== 'organisation') return { ok: false, field: 'kind', error: 'Choose person or organisation.' };
  const name = str('name').slice(0, 200);
  if (!name) return { ok: false, field: 'name', error: 'Add their name.' };
  const organisationName = str('organisationName').slice(0, 200) || null;
  if (kind === 'organisation' && !organisationName) return { ok: false, field: 'organisationName', error: 'Add the organisation’s name.' };
  const email = normaliseEmail(str('email'));
  if (!isEmail(email)) return { ok: false, field: 'email', error: 'Enter an email like name@example.com.' };
  const level = str('level');
  if (!isLevel(level)) return { ok: false, field: 'level', error: 'Choose a membership level.' };
  const cycle = str('cycle');
  if (!isCycle(cycle)) return { ok: false, field: 'cycle', error: 'Choose quarterly or yearly.' };
  return { ok: true, value: { kind, name, organisationName: kind === 'organisation' ? organisationName : null, email, level, cycle, notes: str('notes').slice(0, 2000) || null } };
}

/** Checks the admin form. Errors name the field, in the words the form uses. */
export function parseManualMember(body: Record<string, unknown>): Parsed<ManualMemberInput> {
  const details = parseMemberDetails(body);
  if (!details.ok) return details;
  const startMonth = typeof body.startMonth === 'string' ? body.startMonth.trim() : '';
  if (!MONTH.test(startMonth)) return { ok: false, field: 'startMonth', error: 'Choose the month their paid term started.' };
  const category = body.category === 'active' ? 'active' : 'passive';
  return { ok: true, value: { ...details.value, startMonth, category, sendEmail: body.sendEmail !== false } };
}

export interface ManualDeps {
  env: Env;
  store: MemberStore;
  origin: string;
  fetch?: typeof fetch;
  slack?: MembershipSlack;
  log?: (m: string) => void;
  signature?: () => Promise<Uint8Array | null>;
}

export type AddResult = { result: 'added'; member: Member; certificate: Certificate; emailed: boolean } | { result: 'exists'; member: Member };

export async function addManualMember(input: ManualMemberInput, deps: ManualDeps): Promise<AddResult> {
  const { store } = deps;
  const log = deps.log ?? console.log;
  const existing = await store.byEmail(input.email);
  if (existing) return { result: 'exists', member: existing };
  const term = manualTerm(input.startMonth, input.cycle);
  const actor = { kind: 'board', id: 'admin' } as const;
  let member: Member;
  try {
    member = await store.create(
      {
        kind: input.kind,
        name: input.name,
        organisationName: input.organisationName,
        email: input.email,
        level: input.level,
        cycle: input.cycle,
        category: input.category,
        status: 'imported_manual',
        source: 'imported',
        joinedAt: term.start,
        paidUntil: term.end,
        paymentMode: 'manual',
        notes: input.notes,
      },
      actor,
    );
  } catch (cause) {
    // Added at the same moment from another tab.
    if (cause instanceof DuplicateEmail) return { result: 'exists', member: (await store.byEmail(input.email))! };
    throw cause;
  }

  const certDeps = { env: deps.env, store, origin: deps.origin, actor, fetch: deps.fetch, log, signature: deps.signature, template: 'membership-ported' as const };
  const termOf = { periodStart: term.start, periodEnd: term.end, stripeInvoiceId: null };
  const certificate = input.sendEmail ? await issueAndSendCertificate(member, termOf, true, certDeps) : await store.issueCertificate(member.id, termOf, actor);

  await notify(
    `:inbox_tray: Added, paid manually (cash/bank): ${who(member)}, paid until ${longDate(lastDay(term.end))} (certificate ${certificate.number}). ${input.sendEmail ? 'Emailed to set up automatic payment.' : 'Not emailed.'}`,
    { env: deps.env, slack: deps.slack, fetch: deps.fetch, log },
  );
  return { result: 'added', member, certificate, emailed: input.sendEmail };
}
