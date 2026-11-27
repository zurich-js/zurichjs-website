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
import { tryMembershipNotices } from './membership-delivery.ts';
import { expireOpenCheckouts } from './membership-stripe.ts';
import { termLabel } from './membership.ts';
import { who, type MembershipSlack } from './membership-slack.ts';

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

/** The month a paid term started (YYYY-MM), or null. */
export const parseStartMonth = (body: Record<string, unknown>): string | null => {
  const v = typeof body.startMonth === 'string' ? body.startMonth.trim() : '';
  return MONTH.test(v) ? v : null;
};

/** Checks the admin form. Errors name the field, in the words the form uses. */
export function parseManualMember(body: Record<string, unknown>): Parsed<ManualMemberInput> {
  const details = parseMemberDetails(body);
  if (!details.ok) return details;
  const startMonth = parseStartMonth(body);
  if (!startMonth) return { ok: false, field: 'startMonth', error: 'Choose the month their paid term started.' };
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

const BOARD = { kind: 'board', id: 'admin' } as const;

export async function addManualMember(input: ManualMemberInput, deps: ManualDeps): Promise<AddResult> {
  const save = () => deps.store.transaction((tx) => addManualTerm(input, { ...deps, store: tx }));
  let result: AddResult;
  try {
    result = await save();
  } catch (error) {
    if (!(error instanceof DuplicateEmail)) throw error;
    result = await save();
  }
  const pending = await tryMembershipNotices(manualOperation(result.member.id, input.startMonth), deps);
  if (result.result === 'added' && pending.some((d) => d.payload.kind === 'certificate')) return { ...result, emailed: false };
  return result;
}

const manualOperation = (id: string, month: string) => `manual:${id}:${month}`;

async function addManualTerm(input: ManualMemberInput, deps: ManualDeps): Promise<AddResult> {
  const { store } = deps;
  const term = manualTerm(input.startMonth, input.cycle);
  const details = { kind: input.kind, name: input.name, organisationName: input.organisationName, level: input.level, cycle: input.cycle, category: input.category };
  const existing = await store.byEmail(input.email);
  if (existing && (await existingTerm(store, existing, term, input.startMonth))) return { result: 'exists', member: existing };
  let member: Member;
  if (!existing) {
    member = await store.create(
      { ...details, email: input.email, status: 'imported_manual', source: 'imported', joinedAt: term.start, paidUntil: term.end, paymentMode: 'manual', notes: input.notes },
      BOARD,
    );
  } else if (existing.status === 'imported_manual' && existing.paidUntil === term.end) {
    member = existing;
  } else if (existing.status === 'pending' || existing.status === 'ended') {
    if (existing.status === 'pending' && existing.stripeCustomerId) await expireOpenCheckouts(existing.stripeCustomerId, { env: deps.env, fetch: deps.fetch });
    await store.retireSubscription(existing.id);
    await store.update(
      existing.id,
      { ...details, paidUntil: term.end, paymentMode: 'manual', source: 'imported', joinedAt: existing.joinedAt ?? term.start, ...(input.notes ? { notes: input.notes } : {}) },
      BOARD,
    );
    member = await store.transition(existing.id, { from: existing.status, to: 'imported_manual', actor: BOARD, payload: { paidFrom: term.start } });
  } else return { result: 'exists', member: existing };

  const operation = manualOperation(member.id, input.startMonth);
  const certificate = await store.issueCertificate(member.id, { periodStart: term.start, periodEnd: term.end, stripeInvoiceId: null }, BOARD);
  if (input.sendEmail)
    await store.enqueue(member.id, operation, `member-certificate:${certificate.id}`, { kind: 'certificate', certificateId: certificate.id, template: 'membership-ported' });
  await store.enqueue(member.id, operation, `board:${operation}`, {
    kind: 'board',
    text: `:inbox_tray: ${existing && existing.status !== 'imported_manual' ? 'Recorded again' : 'Added'}, paid manually (cash/bank): ${who(member)}, paid until ${longDate(lastDay(term.end))} (certificate ${certificate.number}).`,
  });
  return { result: 'added', member, certificate, emailed: input.sendEmail };
}

async function existingTerm(store: MemberStore, m: Member, term: ReturnType<typeof manualTerm>, startMonth: string) {
  const certs = await store.certificates(m.id);
  const issued = certs.find((c) => c.periodStart === term.start && c.periodEnd === term.end);
  if (issued?.stripeInvoiceId) {
    const observed = (await store.events(m.id)).some((e) => e.type === 'manual_payment_overlap' && e.payload.invoice === issued.stripeInvoiceId);
    if (!observed) await store.logEvent(m.id, 'manual_payment_overlap', BOARD, { invoice: issued.stripeInvoiceId, periodStart: term.start, periodEnd: term.end });
    await store.enqueue(m.id, manualOperation(m.id, startMonth), `board:overlap:${issued.id}`, {
      kind: 'board',
      text: `:warning: A cash or bank payment was reported for ${who(m)} for a term already paid on invoice ${issued.stripeInvoiceId}. Reconcile both payments.`,
    });
  }
  return issued;
}

export type PaymentResult =
  | { result: 'recorded'; member: Member; certificate: Certificate; emailed: boolean }
  | { result: 'exists'; member: Member; certificate: Certificate }
  | { result: 'not_found' }
  | { result: 'not_manual'; member: Member };

export async function recordManualPayment(memberId: string, input: { startMonth: string; sendEmail: boolean }, deps: ManualDeps): Promise<PaymentResult> {
  const operation = manualOperation(memberId, input.startMonth);
  const result = await deps.store.transaction(async (store): Promise<PaymentResult> => {
    const m = await store.get(memberId);
    if (!m) return { result: 'not_found' };
    const term = manualTerm(input.startMonth, m.cycle);
    const issued = await existingTerm(store, m, term, input.startMonth);
    if (issued) return { result: 'exists', member: m, certificate: issued };
    if (m.status !== 'imported_manual' || m.paymentMode !== 'manual') return { result: 'not_manual', member: m };
    const member = await store.update(m.id, { paidUntil: m.paidUntil && m.paidUntil > term.end ? m.paidUntil : term.end }, BOARD);
    const certificate = await store.issueCertificate(m.id, { periodStart: term.start, periodEnd: term.end, stripeInvoiceId: null }, BOARD);
    if (input.sendEmail)
      await store.enqueue(m.id, operation, `member-certificate:${certificate.id}`, { kind: 'certificate', certificateId: certificate.id, template: 'membership-manual-payment' });
    await store.enqueue(m.id, operation, `board:${operation}`, {
      kind: 'board',
      text: `:moneybag: Payment recorded (cash/bank): ${who(member)}, ${termLabel(term.start, term.end)}, paid until ${longDate(lastDay(member.paidUntil!))} (certificate ${certificate.number}).`,
    });
    return { result: 'recorded', member, certificate, emailed: input.sendEmail };
  });
  const pending = await tryMembershipNotices(operation, deps);
  if (result.result === 'recorded' && pending.some((d) => d.payload.kind === 'certificate')) return { ...result, emailed: false };
  return result;
}
