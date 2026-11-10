/** What the admin area shows of a member: everything the board needs, nothing for the public. */
import { label, levelInfo, type Member } from '@zurichjs/membership';
import { resignationLabel } from './membership.ts';

export const adminMember = (m: Member) => ({
  id: m.id,
  name: m.name,
  organisationName: m.organisationName,
  email: m.email,
  kind: m.kind,
  level: m.level,
  levelName: levelInfo(m.level).name,
  cycle: m.cycle,
  category: m.category,
  status: m.status,
  statusLabel: resignationLabel(m) ?? label(m.status),
  endedReason: m.endedReason,
  source: m.source,
  paymentMode: m.paymentMode,
  joinedAt: m.joinedAt,
  paidUntil: m.paidUntil,
  hasAccount: !!m.userId,
  stripeCustomerId: m.stripeCustomerId,
  stripeSubscriptionId: m.stripeSubscriptionId,
  notes: m.notes,
  resignedAt: m.resignedAt,
  resignationConfirmedAt: m.resignationConfirmedAt,
  createdAt: m.createdAt,
});

export type AdminMember = ReturnType<typeof adminMember>;

const CSV_COLUMNS = ['name', 'organisationName', 'email', 'levelName', 'cycle', 'category', 'status', 'paymentMode', 'joinedAt', 'paidUntil', 'source', 'createdAt'] as const;

/** RFC 4180; a leading = + - @ is prefixed with ' so spreadsheets do not run it as a formula. */
const cell = (v: unknown) => {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const membersCsv = (members: Member[]) =>
  [
    CSV_COLUMNS.join(','),
    ...members.map((m) => {
      const v = adminMember(m);
      return CSV_COLUMNS.map((c) => cell(v[c])).join(',');
    }),
  ].join('\r\n') + '\r\n';
