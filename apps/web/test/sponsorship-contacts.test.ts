/**
 * What the board and sponsors are told: resending invitations, access for running sponsorships,
 * contacts that cannot be emailed, logos that are not live, the billing portal, SVG logos and the
 * Slack notes. Real handlers on the in-memory store; Stripe, Resend and Slack faked (sponsor-faults.ts).
 */
import { memoryStore as memoryMembers } from '@zurichjs/membership';
import { AGREEMENT, memoryStore, type SponsorStore } from '@zurichjs/sponsorship';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleAdminSponsors } from '../src/pages/api/membership/admin/sponsors/index.ts';
import { handleAdminRemoveContact } from '../src/pages/api/membership/admin/sponsors/[id]/contacts/[cid].ts';
import { handleResendInvite } from '../src/pages/api/membership/admin/sponsors/[id]/invite.ts';
import { handleRecordPayment } from '../src/pages/api/membership/admin/sponsors/[id]/payment.ts';
import { handleRemoveContact } from '../src/pages/api/sponsorship/contacts/[id].ts';
import { handleEnd } from '../src/pages/api/sponsorship/end.ts';
import { handleLogoUpload } from '../src/pages/api/sponsorship/logo/index.ts';
import { handleSponsorPortal } from '../src/pages/api/sponsorship/portal.ts';
import { handleStripeWebhook } from '../src/pages/api/stripe/webhook.ts';
import { recipients } from '../src/server/sponsor.ts';
import { svgProblem } from '../src/server/sponsor-logo.ts';
import { resetRateLimits } from '../src/server/rateLimit.ts';
import { NOW, asAdmin, asAdminDelete, env, newSponsor, post, stripeEvent, unix, world } from './sponsor-faults.ts';

const BOARD = { kind: 'board', id: 'admin' } as const;
const grace = { id: 'user-grace', email: 'grace@acme.ch' };

describe('sponsorship contacts and notes', () => {
  let w: ReturnType<typeof world>;
  let store: SponsorStore;
  const admin = () => ({ env, store, fetch: w.f, slack: w.slack, logos: w.logos, now: NOW.getTime() });
  const user = () => ({ env, store, fetch: w.f, slack: w.slack, logos: w.logos, session: async () => grace, now: () => NOW });

  async function sponsor(over: Parameters<typeof newSponsor>[0] = {}) {
    const { sponsor: s } = await store.create(newSponsor(over), { email: grace.email, name: 'Grace Hopper', role: 'primary', addedBy: 'board' }, BOARD);
    await store.linkContact((await store.contactByEmail(grace.email))!.id, grace.id);
    return s.id;
  }
  const logo = () => {
    const form = new FormData();
    form.set('file', new File([new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>')], 'logo.svg', { type: 'image/svg+xml' }));
    return new Request('https://zurichjs.com/api/sponsorship/logo', { method: 'POST', headers: { origin: 'https://zurichjs.com' }, body: form });
  };

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    w = world();
    store = memoryStore({ now: () => NOW });
    resetRateLimits();
  });

  it('each "Email the invitation again" click sends one email; a double click sends it once', async () => {
    const id = await sponsor();
    const click = (requestId: string) => handleResendInvite(asAdmin(`/x`, { requestId }), id, admin());
    await click('click-0001');
    await click('click-0001');
    await click('click-0002');
    const delivered = w.emails.filter((e) => /ready to confirm/.test(e.subject));
    expect(delivered).toHaveLength(2);
  });

  it('a colleague who has not accepted is refused with a reason, and gets nothing', async () => {
    const id = await sponsor();
    const pat = await store.addContact(id, { email: 'pat@acme.ch', name: 'Pat', role: 'other', addedBy: 'sponsor' }, BOARD);
    const r = await handleResendInvite(asAdmin('/x', { contactId: pat.id, requestId: 'click-0003' }), id, admin());
    expect(r.status).toBe(409);
    expect(((await r.json()) as { error: string }).error).toContain('once they sign in and accept');
    expect(w.emails).toHaveLength(0);
  });

  it('a running sponsorship sends access to its page, not "ready to confirm … nothing is charged until you pay"', async () => {
    const id = await sponsor({ status: 'active', startedAt: '2026-11-18', paidUntil: '2027-02-18' });
    const billing = await store.addContact(id, { email: 'bob@acme.ch', name: 'Bob', role: 'billing', addedBy: 'board' }, BOARD);
    await handleResendInvite(asAdmin('/x', { contactId: billing.id, requestId: 'click-0004' }), id, admin());
    expect(w.emails.at(-1)).toMatchObject({ to: ['bob@acme.ch'], subject: 'You can now manage Acme’s ZurichJS sponsorship' });
    expect(w.emails.at(-1)!.text).not.toContain('Nothing is charged until you pay');
  });

  it('the last primary contact cannot be removed, and a recorded transfer says who gets the confirmation', async () => {
    const id = await sponsor({ status: 'active', paymentMode: 'manual', source: 'imported', cycle: 'yearly', startedAt: '2025-12-05', paidUntil: '2026-12-05' });
    const other = await store.addContact(id, { email: 'pat@acme.ch', name: 'Pat', role: 'other', addedBy: 'board' }, BOARD);
    const primary = (await store.contactByEmail(grace.email))!;
    const r = await handleAdminRemoveContact(asAdminDelete('/x'), id, primary.id, admin());
    expect(r.status).toBe(409);
    expect((await handleAdminRemoveContact(asAdminDelete('/x'), id, other.id, admin())).status).toBe(200);
    const paid = await handleRecordPayment(asAdmin('/x', { paidUntil: '2027-12-05' }), id, admin());
    expect(await paid.json()).toMatchObject({ confirmationTo: ['grace@acme.ch'] });
    expect(w.slackPosts.at(-1)).toContain('They are emailed a confirmation.');
  });

  it('a primary contact who has not accepted does not count: the confirmed one stays, for the board and for colleagues', async () => {
    const id = await sponsor({ status: 'active' });
    const confirmedPrimary = (await store.contactByEmail(grace.email))!;
    await store.addContact(id, { email: 'pending@acme.ch', name: 'Pending', role: 'primary', addedBy: 'sponsor' }, BOARD);
    const colleague = await store.addContact(id, { email: 'ada@acme.ch', name: 'Ada', role: 'other', addedBy: 'board' }, BOARD);
    await store.linkContact(colleague.id, 'user-ada');
    const board = await handleAdminRemoveContact(asAdminDelete('/x'), id, confirmedPrimary.id, admin());
    expect(board.status).toBe(409);
    expect(await board.json()).toMatchObject({ error: expect.stringContaining('confirmed primary contact') });
    const asAda = { ...user(), session: async () => ({ id: 'user-ada', email: 'ada@acme.ch' }) };
    const del = new Request('https://zurichjs.com/x', { method: 'DELETE', headers: { origin: 'https://zurichjs.com' } });
    expect((await handleRemoveContact(del, confirmedPrimary.id, asAda)).status).toBe(409);
    // Two removals at once (two board tabs): the store refuses the second.
    const second = await store.addContact(id, { email: 'bo@acme.ch', name: 'Bo', role: 'primary', addedBy: 'board' }, BOARD);
    const both = await Promise.all([confirmedPrimary.id, second.id].map((cid) => handleAdminRemoveContact(asAdminDelete('/x'), id, cid, admin())));
    expect(both.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await recipients(store, id, 'billing')).toHaveLength(1);
  });

  it('a company that started online and left Checkout is not an unanswered invitation', async () => {
    await sponsor({ source: 'self_serve' });
    const list = (await (await handleAdminSponsors(asAdmin('/api/membership/admin/sponsors'), { ...admin(), now: NOW.getTime() + 8 * 86_400_000 })).json()) as {
      sponsors: { attention: string[] }[];
    };
    expect(list.sponsors[0]!.attention).toEqual(['checkout_abandoned']);
  });

  it('logos: an ended sponsorship uploads nothing; a pending one is not asked to be published', async () => {
    const id = await sponsor();
    expect((await handleLogoUpload(logo(), user())).status).toBe(200);
    expect(w.slackPosts.at(-1)).toContain('Nothing to publish yet');
    await store.transition(id, { from: 'pending', to: 'ended', actor: BOARD, reason: 'withdrawn' });
    expect((await handleLogoUpload(logo(), user())).status).toBe(409);
  });

  it('a missing billing-portal setup is about card and receipts only', async () => {
    const id = await sponsor({ status: 'active' });
    await store.linkStripe(id, { customerId: 'cus_acme' }, BOARD);
    const r = await handleSponsorPortal(post('/api/sponsorship/portal', {}), { ...user(), env: { ...env, STRIPE_MEMBER_PORTAL_CONFIG: '' } });
    expect(r.status).toBe(503);
    expect(((await r.json()) as { error: string }).error).toMatch(/^Card and receipts are not available right now/);
  });

  it('an end confirmation in the agreements names the last day as a date', async () => {
    const id = await sponsor({ status: 'active', paymentMode: 'manual', source: 'imported', startedAt: '2026-11-18', paidUntil: '2027-02-18' });
    await store.acceptAgreement(
      id,
      { version: AGREEMENT.version, signerName: 'Grace Hopper', signerTitle: 'CTO', signerEmail: grace.email, context: 'start', summary: 'x' },
      BOARD,
    );
    await handleEnd(post('/api/sponsorship/end', { confirm: true, agreementVersion: AGREEMENT.version }), user());
    expect((await store.agreements(id))[0]!.summary).toContain('last day 17th February 2027');
  });

  it('the new-sponsor note asks for the partner record, not a Sanity edit', async () => {
    const id = await sponsor();
    const inv = {
      id: 'in_1',
      amount_paid: 84000,
      billing_reason: 'subscription_create',
      lines: { data: [{ period: { start: unix('2026-11-18T00:00:00Z'), end: unix('2027-02-18T00:00:00Z') }, price: { lookup_key: 'sponsor_friend_quarterly' } }] },
      parent: { subscription_details: { subscription: 'sub_acme', metadata: { source: 'zurichjs.com/partners', sponsorId: id } } },
    };
    await handleStripeWebhook(stripeEvent('evt_1', 'invoice.paid', inv), {
      env,
      sponsorStore: store,
      memberStore: memoryMembers({ now: () => NOW }),
      fetch: w.f,
      slack: w.slack,
      now: NOW.getTime(),
    });
    const note = w.slackPosts.find((t) => t.includes('New sponsor'))!;
    expect(note).toContain('Choose their partner record');
    expect(note).not.toContain('Sanity');
  });

  it.each([
    ['an escaped url(', '<svg><style>rect{fill:\\75 rl(https://x.example/a)}</style></svg>'],
    ['image-set()', '<svg><rect style="fill:image-set(&quot;https://x.example/a&quot; 1x)"/></svg>'],
    ['an escaped @import', '<svg><style>@\\69mport "https://x.example/a.css";</style></svg>'],
  ])('SVG logos with %s in their CSS are refused', (_, svg) => {
    expect(svgProblem(svg)).toBe('escaped or external CSS');
  });

  it('plain CSS in an SVG logo is still fine', () => {
    expect(svgProblem('<svg><style>.a{fill:#000}</style><rect class="a" style="opacity:.5"/></svg>')).toBeNull();
  });
});
