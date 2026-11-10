import { describe, expect, it } from 'vitest';
import {
  atLeast,
  canApply,
  canStartAutomaticPayment,
  checkTransition,
  isMember,
  memoryStore,
  parseCsv,
  parseImport,
  priceLookupKey,
  supabaseStore,
  TERMS,
  TRANSITIONS,
  acceptedCurrent,
  TransitionError,
  DuplicateEmail,
  type NewMember,
  type Status,
} from '../src/index.ts';

const board = { kind: 'board', id: 'U123' } as const;
const member = { kind: 'member', id: 'auth-1' } as const;
const stripe = { kind: 'stripe', id: 'evt_1' } as const;
const script = { kind: 'script', id: 'import' } as const;

const applicant: NewMember = {
  kind: 'person',
  name: 'Ada Lovelace',
  organisationName: null,
  email: ' Ada@Example.com ',
  level: 'supporter',
  cycle: 'yearly',
  category: 'passive',
  status: 'applied',
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
  it('runs the self-serve path: apply (terms accepted), approve, pay, resign, end', () => {
    const path: [Status, Status, 'member' | 'board' | 'stripe'][] = [
      ['applied', 'approved', 'board'],
      ['approved', 'active', 'stripe'],
      ['active', 'resigning', 'member'],
    ];
    for (const [from, to, actor] of path) expect(code(() => checkTransition({ status: from }, to, actor))).toBe('ok');
    expect(checkTransition({ status: 'resigning' }, 'ended', 'board', 'resigned')).toEqual({ from: 'resigning', to: 'ended', endedReason: 'resigned' });
  });

  it('never lets members approve themselves or skip approval', () => {
    expect(code(() => checkTransition({ status: 'applied' }, 'approved', 'member'))).toBe('wrong_actor');
    expect(code(() => checkTransition({ status: 'applied' }, 'active', 'stripe'))).toBe('not_allowed');
    expect(code(() => checkTransition({ status: 'applied' }, 'active', 'board'))).toBe('not_allowed');
  });

  it('only lets Stripe say a payment happened', () => {
    expect(code(() => checkTransition({ status: 'approved' }, 'active', 'board'))).toBe('wrong_actor');
    expect(code(() => checkTransition({ status: 'imported_manual' }, 'active', 'member'))).toBe('wrong_actor');
  });

  it('has no way for the board to refuse a resignation, only to record it was withdrawn (Art. 5)', () => {
    expect(Object.keys(TRANSITIONS.resigning).sort()).toEqual(['active', 'ended']);
    expect(code(() => checkTransition({ status: 'resigning' }, 'active', 'member'))).toBe('wrong_actor');
  });

  it('needs a reason to end, and only the board can expel', () => {
    expect(code(() => checkTransition({ status: 'active' }, 'ended', 'board'))).toBe('reason_required');
    expect(code(() => checkTransition({ status: 'active' }, 'ended', 'stripe', 'expelled'))).toBe('reason_not_allowed');
    expect(code(() => checkTransition({ status: 'active' }, 'ended', 'board', 'expelled'))).toBe('ok');
    expect(code(() => checkTransition({ status: 'active' }, 'resigning', 'member', 'resigned'))).toBe('reason_not_allowed');
  });

  it('gives organisers a sentence they can read', () => {
    expect(() => checkTransition({ status: 'applied' }, 'approved', 'member')).toThrow('Only an organiser can change a membership from waiting for approval to approved.');
  });

  it('knows who is a member and who may apply again', () => {
    expect(isMember('resigning')).toBe(true);
    expect(isMember('signed')).toBe(false);
    expect(canApply(null) && canApply('ended') && canApply('rejected')).toBe(true);
    expect(canApply('applied')).toBe(false);
  });

  it('lets approved and imported members pay automatically only after accepting the current terms', () => {
    expect(canStartAutomaticPayment({ status: 'imported_manual', paymentMode: 'manual' }, false)).toBe(false);
    expect(canStartAutomaticPayment({ status: 'imported_manual', paymentMode: 'manual' }, true)).toBe(true);
    expect(canStartAutomaticPayment({ status: 'approved', paymentMode: 'automatic' }, true)).toBe(true);
    expect(canStartAutomaticPayment({ status: 'approved', paymentMode: 'automatic' }, false)).toBe(false);
    expect(canStartAutomaticPayment({ status: 'applied', paymentMode: 'automatic' }, true)).toBe(false);
    expect(canStartAutomaticPayment({ status: 'active', paymentMode: 'automatic' }, true)).toBe(false);
  });

  it('never lets the import script change a status (it only creates)', () => {
    for (const edges of Object.values(TRANSITIONS)) for (const actors of Object.values(edges)) expect(actors).not.toContain('script');
  });
});

describe('memory store', () => {
  it('normalises email, refuses duplicates and logs every change', async () => {
    const s = memoryStore();
    const m = await s.create(applicant, member);
    expect(m.email).toBe('ada@example.com');
    await expect(s.create({ ...applicant, email: 'ADA@example.com' }, member)).rejects.toBeInstanceOf(DuplicateEmail);
    await s.transition(m.id, { to: 'approved', actor: board, payload: { ts: '1.2' } });
    await s.linkStripe(m.id, { customerId: 'cus_1' }, script);
    const events = await s.events(m.id);
    expect(events.map((e) => e.type)).toEqual(['created', 'status_changed', 'stripe_linked']);
    expect(events[1]).toMatchObject({ fromStatus: 'applied', toStatus: 'approved', actor: board, payload: { ts: '1.2' } });
    expect((await s.byEmail('ada@EXAMPLE.com'))?.stripeCustomerId).toBe('cus_1');
  });

  it('refuses a change when the member is no longer in the status the caller saw', async () => {
    const s = memoryStore();
    const m = await s.create(applicant, member);
    await s.transition(m.id, { from: 'applied', to: 'approved', actor: board });
    // A second approver pressing Reject on the same card: approved → rejected is allowed in general, but not from this card.
    await expect(s.transition(m.id, { from: 'applied', to: 'rejected', actor: board })).rejects.toMatchObject({ code: 'conflict' });
    expect((await s.get(m.id))!.status).toBe('approved');
  });

  it('records terms acceptances and returns the latest version', async () => {
    const s = memoryStore();
    const m = await s.create(applicant, member);
    expect(await s.acceptedTerms(m.id)).toBeNull();
    await s.acceptTerms(m.id, '2026-01-01', member);
    await s.acceptTerms(m.id, TERMS.version, member);
    expect(await s.acceptedTerms(m.id)).toBe(TERMS.version);
    expect(acceptedCurrent(await s.acceptedTerms(m.id))).toBe(true);
    expect((await s.events(m.id)).at(-1)).toMatchObject({ type: 'terms_accepted', payload: { version: TERMS.version } });
  });

  it('refuses a change the status machine does not allow, and logs nothing', async () => {
    const s = memoryStore();
    const m = await s.create(applicant, member);
    await expect(s.transition(m.id, { to: 'active', actor: stripe })).rejects.toBeInstanceOf(TransitionError);
    expect((await s.events(m.id)).length).toBe(1);
  });
});

describe('supabase store', () => {
  const row = {
    id: 'm1',
    auth_user_id: null,
    email: 'ada@example.com',
    kind: 'person',
    name: 'Ada',
    organisation_name: null,
    level: 'supporter',
    cycle: 'yearly',
    category: 'passive',
    status: 'applied',
    ended_reason: null,
    source: 'self_serve',
    joined_at: null,
    paid_until: null,
    payment_mode: 'automatic',
    stripe_customer_id: null,
    stripe_subscription_id: null,
    notes: null,
    created_at: '2026-11-05T12:00:00Z',
    updated_at: '2026-11-05T12:00:00Z',
  };
  const env = { SUPABASE_URL: 'https://abc.supabase.co/', SUPABASE_SERVICE_ROLE_KEY: 'service-key' };

  const fake = (responses: [number, unknown][]) => {
    const calls: { url: string; method: string; body: unknown; headers: Record<string, string> }[] = [];
    const f = (async (url: string, init: RequestInit) => {
      calls.push({ url, method: init.method!, body: init.body ? JSON.parse(String(init.body)) : undefined, headers: init.headers as Record<string, string> });
      const [status, body] = responses.shift()!;
      return new Response(JSON.stringify(body), { status });
    }) as unknown as typeof fetch;
    return { f, calls };
  };

  it('needs both variables and an https URL', () => {
    expect(() => supabaseStore({})).toThrow(/SUPABASE_URL/);
    expect(() => supabaseStore({ ...env, SUPABASE_URL: 'ftp://x' })).toThrow(/must be https/);
  });

  it('reads with the service key and maps rows to members', async () => {
    const { f, calls } = fake([[200, [row]]]);
    const m = await supabaseStore(env, f).byEmail('Ada@Example.com');
    expect(calls[0]!.url).toBe('https://abc.supabase.co/rest/v1/members?select=*&email=eq.ada%40example.com&limit=1');
    expect(calls[0]!.headers.authorization).toBe('Bearer service-key');
    expect(m).toMatchObject({ id: 'm1', paymentMode: 'automatic', organisationName: null });
  });

  it('checks the transition before calling the database, and sends the expected from-status', async () => {
    const { f, calls } = fake([
      [200, [row]],
      [200, { ...row, status: 'approved' }],
    ]);
    const m = await supabaseStore(env, f).transition('m1', { to: 'approved', actor: board });
    expect(m.status).toBe('approved');
    expect(calls[1]).toMatchObject({
      url: 'https://abc.supabase.co/rest/v1/rpc/member_transition',
      body: { p_id: 'm1', p_from: 'applied', p_to: 'approved', p_ended_reason: null, p_actor_kind: 'board', p_actor_id: 'U123' },
    });

    const refused = fake([[200, [row]]]);
    await expect(supabaseStore(env, refused.f).transition('m1', { to: 'approved', actor: member })).rejects.toThrow(/Only an organiser/);
    expect(refused.calls).toHaveLength(1);
  });

  it('refuses a stale expected status before calling the database', async () => {
    const { f, calls } = fake([[200, [{ ...row, status: 'approved' }]]]);
    await expect(supabaseStore(env, f).transition('m1', { from: 'applied', to: 'rejected', actor: board })).rejects.toMatchObject({ code: 'conflict' });
    expect(calls).toHaveLength(1);
  });

  it('maps a lost race and a duplicate email to the store errors', async () => {
    const race = fake([
      [200, [row]],
      [400, { code: 'P0001', message: 'member_transition_conflict' }],
    ]);
    await expect(supabaseStore(env, race.f).transition('m1', { to: 'approved', actor: board })).rejects.toMatchObject({ code: 'conflict' });
    const dup = fake([[409, { code: '23505', message: 'duplicate key value violates unique constraint "members_email_key"' }]]);
    await expect(supabaseStore(env, dup.f).create(applicant, member)).rejects.toBeInstanceOf(DuplicateEmail);
  });

  it('sends only patchable columns to member_update', async () => {
    const { f, calls } = fake([[200, row]]);
    await supabaseStore(env, f).update('m1', { paidUntil: '2027-01-31', notes: undefined }, board);
    expect(calls[0]!.body).toEqual({ p_id: 'm1', p_patch: { paid_until: '2027-01-31' }, p_actor_kind: 'board', p_actor_id: 'U123' });
  });
});

describe('import', () => {
  const header = 'kind,name,organisation,email,level,cycle,category,joined_at,paid_until,declaration_pdf,notes';

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
        'person,Ada Lovelace,,Ada@Example.com,Supporter,yearly,active,2025-05-23,2026-05-22,ada.pdf,"Paid by Twint, 2025"',
        'organisation,Acme Rep,Acme AG,team@acme.ch,basic,quarterly,,,2026-12-31,,',
      ].join('\n'),
    );
    expect(problems).toEqual([]);
    expect(rows[0]).toMatchObject({
      line: 2,
      declarationPdf: 'ada.pdf',
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
        'person,,,,gold,monthly,,2025-02-30,,ada.docx,',
        'organisation,Rep,,rep@x.ch,basic,yearly,,2026-01-01,2025-12-31,,',
        'person,A,,a@x.ch,basic,yearly,,,2026-01-01,,',
        'person,A2,,A@x.ch,basic,yearly,,,2026-01-01,,',
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
      'declaration_pdf "ada.docx" is not a .pdf file.',
    ]);
    expect(problems.filter((p) => p.line === 3).map((p) => p.message)).toEqual(['An organisation needs its name in organisation.', 'paid_until is before joined_at.']);
    expect(problems.find((p) => p.line === 5)?.message).toBe('a@x.ch is already on line 4.');
  });

  it('refuses a file without the expected columns', () => {
    expect(parseImport('name,email\nAda,a@x.ch').problems[0]!.message).toMatch(/^Missing columns: kind, organisation, level/);
  });
});
