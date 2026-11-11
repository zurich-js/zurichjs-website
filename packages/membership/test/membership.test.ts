import { describe, expect, it } from 'vitest';
import {
  DuplicateEmail,
  TERMS,
  TRANSITIONS,
  TransitionError,
  acceptedCurrent,
  atLeast,
  canJoin,
  canStartAutomaticPayment,
  checkTransition,
  isMember,
  memoryStore,
  parseCsv,
  parseImport,
  priceLookupKey,
  type NewMember,
  type Status,
  resignationState,
} from '../src/index.ts';

const member = { kind: 'member', id: 'user-1' } as const;
const stripe = { kind: 'stripe', id: 'evt_1' } as const;

const joiner: NewMember = {
  kind: 'person',
  name: 'Ada Lovelace',
  organisationName: null,
  email: ' Ada@Example.com ',
  level: 'supporter',
  cycle: 'yearly',
  category: 'passive',
  status: 'pending',
  source: 'self_serve',
  joinedAt: null,
  paidUntil: null,
  paymentMode: 'automatic',
  notes: null,
};

const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return (e as TransitionError).code;
  }
  return 'ok';
};

describe('levels', () => {
  it('orders the levels and names Stripe prices after them', () => {
    expect(atLeast('supporter', 'basic')).toBe(true);
    expect(atLeast('supporter', 'supporter')).toBe(true);
    expect(atLeast('basic', 'supporter')).toBe(false);
    expect(priceLookupKey('basic', 'quarterly')).toBe('member_basic_quarterly');
  });
});

describe('status machine', () => {
  it('runs the self-serve path: sign up (terms accepted), pay, resign, end', () => {
    const path: [Status, Status, 'member' | 'board' | 'stripe'][] = [
      ['pending', 'active', 'stripe'],
      ['active', 'resigning', 'member'],
    ];
    for (const [from, to, actor] of path) expect(code(() => checkTransition({ status: from }, to, actor))).toBe('ok');
    expect(checkTransition({ status: 'resigning' }, 'ended', 'board', 'resigned')).toEqual({ from: 'resigning', to: 'ended', endedReason: 'resigned' });
  });

  it('has no approval step: only a Stripe payment makes someone active', () => {
    expect(Object.keys(TRANSITIONS.pending)).toEqual(['active']);
    expect(code(() => checkTransition({ status: 'pending' }, 'active', 'board'))).toBe('wrong_actor');
    expect(code(() => checkTransition({ status: 'pending' }, 'active', 'member'))).toBe('wrong_actor');
    expect(code(() => checkTransition({ status: 'imported_manual' }, 'active', 'member'))).toBe('wrong_actor');
  });

  it('has no way for the board to refuse a resignation; it ends, or the member undoes it (Art. 5; owner, 10th November 2026)', () => {
    // Out of resigning: ended, or back to where the member was before resigning (an undo).
    expect(Object.keys(TRANSITIONS.resigning).sort()).toEqual(['active', 'ended', 'imported_manual', 'past_due']);
    expect(code(() => checkTransition({ status: 'resigning' }, 'active', 'member'))).toBe('ok');
    expect(code(() => checkTransition({ status: 'resigning' }, 'past_due', 'board'))).toBe('ok');
    expect(code(() => checkTransition({ status: 'resigning' }, 'active', 'stripe'))).toBe('wrong_actor');
    expect(code(() => checkTransition({ status: 'resigning' }, 'ended', 'member', 'resigned'))).toBe('wrong_actor');
  });

  it('tells a waiting resignation from a confirmed one', () => {
    expect(resignationState({ status: 'resigning', resignationConfirmedAt: null })).toBe('waiting');
    expect(resignationState({ status: 'resigning', resignationConfirmedAt: '2026-11-12T10:00:00.000Z' })).toBe('confirmed');
    expect(resignationState({ status: 'active', resignationConfirmedAt: null })).toBeNull();
  });

  it('needs a reason to end, and only the board can expel', () => {
    expect(code(() => checkTransition({ status: 'active' }, 'ended', 'board'))).toBe('reason_required');
    expect(code(() => checkTransition({ status: 'active' }, 'ended', 'stripe', 'expelled'))).toBe('reason_not_allowed');
    expect(code(() => checkTransition({ status: 'active' }, 'ended', 'board', 'expelled'))).toBe('ok');
    expect(code(() => checkTransition({ status: 'active' }, 'resigning', 'member', 'resigned'))).toBe('reason_not_allowed');
  });

  it('gives a sentence a person can read', () => {
    expect(() => checkTransition({ status: 'pending' }, 'active', 'member')).toThrow('Only Stripe can change a membership from waiting for the first payment to active.');
  });

  it('knows who is a member and who may join (again)', () => {
    expect(isMember('resigning')).toBe(true);
    expect(isMember('pending')).toBe(false);
    expect(canJoin(null) && canJoin('ended')).toBe(true);
    expect(canJoin('pending') || canJoin('active')).toBe(false);
    expect(code(() => checkTransition({ status: 'ended' }, 'pending', 'member'))).toBe('ok');
  });

  it('lets new and imported members pay automatically only after accepting the current terms', () => {
    expect(canStartAutomaticPayment({ status: 'pending', paymentMode: 'automatic' }, true)).toBe(true);
    expect(canStartAutomaticPayment({ status: 'pending', paymentMode: 'automatic' }, false)).toBe(false);
    expect(canStartAutomaticPayment({ status: 'imported_manual', paymentMode: 'manual' }, false)).toBe(false);
    expect(canStartAutomaticPayment({ status: 'imported_manual', paymentMode: 'manual' }, true)).toBe(true);
    expect(canStartAutomaticPayment({ status: 'active', paymentMode: 'automatic' }, true)).toBe(false);
  });

  it('never lets the import script change a status (it only creates)', () => {
    for (const edges of Object.values(TRANSITIONS)) for (const actors of Object.values(edges)) expect(actors).not.toContain('script');
  });
});

describe('memory store', () => {
  it('normalises email, refuses duplicates and logs every change', async () => {
    const s = memoryStore();
    const m = await s.create(joiner, member);
    expect(m.email).toBe('ada@example.com');
    await expect(s.create({ ...joiner, email: 'ADA@example.com' }, member)).rejects.toBeInstanceOf(DuplicateEmail);
    await s.linkStripe(m.id, { customerId: 'cus_1' }, stripe);
    await s.transition(m.id, { to: 'active', actor: stripe, payload: { invoice: 'in_1' } });
    const events = await s.events(m.id);
    expect(events.map((e) => e.type)).toEqual(['created', 'stripe_linked', 'status_changed']);
    expect(events[2]).toMatchObject({ fromStatus: 'pending', toStatus: 'active', actor: stripe, payload: { invoice: 'in_1' } });
    expect((await s.byEmail('ada@EXAMPLE.com'))?.stripeCustomerId).toBe('cus_1');
  });

  it('refuses a change when the member is no longer in the status the caller saw', async () => {
    const s = memoryStore();
    const m = await s.create(joiner, member);
    await s.transition(m.id, { from: 'pending', to: 'active', actor: stripe });
    // A retried webhook for the first payment.
    await expect(s.transition(m.id, { from: 'pending', to: 'active', actor: stripe })).rejects.toMatchObject({ code: 'conflict' });
  });

  it('records terms acceptances and returns the latest version', async () => {
    const s = memoryStore();
    const m = await s.create(joiner, member);
    expect(await s.acceptedTerms(m.id)).toBeNull();
    await s.acceptTerms(m.id, '2026-01-01', member);
    await s.acceptTerms(m.id, TERMS.version, member);
    expect(await s.acceptedTerms(m.id)).toBe(TERMS.version);
    expect(acceptedCurrent(await s.acceptedTerms(m.id))).toBe(true);
    expect((await s.events(m.id)).at(-1)).toMatchObject({ type: 'terms_accepted', payload: { version: TERMS.version } });
  });

  it('issues one certificate per paid invoice', async () => {
    const s = memoryStore();
    const m = await s.create(joiner, member);
    const term = { periodStart: '2026-11-10', periodEnd: '2027-11-10', stripeInvoiceId: 'in_1' };
    const c = await s.issueCertificate(m.id, term, stripe);
    expect(c).toMatchObject({ number: 'ZJS-2026-0001', level: 'supporter', periodStart: '2026-11-10', periodEnd: '2027-11-10' });
    expect(await s.issueCertificate(m.id, term, stripe)).toEqual(c);
    expect(await s.certificates(m.id)).toHaveLength(1);
  });

  it('refuses a change the status machine does not allow, and logs nothing', async () => {
    const s = memoryStore();
    const m = await s.create(joiner, member);
    await expect(s.transition(m.id, { to: 'resigning', actor: member })).rejects.toBeInstanceOf(TransitionError);
    expect((await s.events(m.id)).length).toBe(1);
  });
});

describe('import', () => {
  const header = 'kind,name,organisation,email,level,cycle,category,joined_at,paid_until,notes';

  it('parses quoted CSV fields', () => {
    expect(parseCsv('a,"b, c","say ""hi"""\r\n1,2,3\n')).toEqual([
      ['a', 'b, c', 'say "hi"'],
      ['1', '2', '3'],
    ]);
  });

  it('turns rows into manual members paid until a date', () => {
    const { rows, problems } = parseImport(
      [
        header,
        'person,Ada Lovelace,,Ada@Example.com,Supporter,yearly,active,2025-05-23,2026-05-22,"Paid by Twint, 2025"',
        'organisation,Acme Rep,Acme AG,team@acme.ch,basic,quarterly,,,2026-12-31,',
      ].join('\n'),
    );
    expect(problems).toEqual([]);
    expect(rows[0]).toMatchObject({
      line: 2,
      member: {
        email: 'ada@example.com',
        level: 'supporter',
        category: 'active',
        status: 'imported_manual',
        paymentMode: 'manual',
        source: 'imported',
        notes: 'Paid by Twint, 2025',
      },
    });
    expect(rows[1]!.member).toMatchObject({ kind: 'organisation', organisationName: 'Acme AG', category: 'passive', joinedAt: null });
  });

  it('reports every problem with its line, and imports nothing from a bad row', () => {
    const { rows, problems } = parseImport(
      [
        header,
        'person,,,,gold,monthly,,2025-02-30,,',
        'organisation,Rep,,rep@x.ch,basic,yearly,,2026-01-01,2025-12-31,',
        'person,A,,a@x.ch,basic,yearly,,,2026-01-01,',
        'person,A2,,A@x.ch,basic,yearly,,,2026-01-01,',
      ].join('\n'),
    );
    expect(rows.map((r) => r.line)).toEqual([4]);
    expect(problems.filter((p) => p.line === 2).map((p) => p.message)).toEqual([
      'name is empty.',
      'email "" is not an email address.',
      'level must be basic or supporter, not "gold".',
      'cycle must be quarterly or yearly, not "monthly".',
      'joined_at "2025-02-30" is not a date like 2025-05-23.',
      'paid_until is empty: say until when they have paid.',
    ]);
    expect(problems.filter((p) => p.line === 3).map((p) => p.message)).toEqual(['An organisation needs its name in organisation.', 'paid_until is before joined_at.']);
    expect(problems.find((p) => p.line === 5)?.message).toBe('a@x.ch is already on line 4.');
  });

  it('refuses a file without the expected columns', () => {
    expect(parseImport('name,email\nAda,a@x.ch').problems[0]!.message).toMatch(/^Missing columns: kind, organisation, level/);
  });
});
