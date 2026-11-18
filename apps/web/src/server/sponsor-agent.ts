/**
 * Sponsorships for the Slack agent: organisers ask the bot in the organisers' channel
 * ("who sponsors us right now?", "which sponsors are behind on payment?", "is Acme's
 * proposal still open?").
 *
 *   - Read-only. The model cannot change a sponsorship: changes are agreed with the sponsor
 *     and go through the admin area (/admin/sponsors) and the sponsor's own confirmation.
 *   - What the model sees is company-level: name, tier, billing, status, dates, open proposal,
 *     logo state. No contact names or emails, no notes, no Stripe ids.
 */
import { tool, z, type ToolSet } from '@zurichjs/agent';
import { ENDED_REASON_LABEL, cycleInfo, feeLabel, isRunning, label, tierInfo, type Sponsor, type SponsorStore, type Status } from '@zurichjs/sponsorship';
import { lastDay, longDate } from './dates.ts';

const STATUSES = ['pending', 'active', 'past_due', 'ending', 'ended'] as const satisfies readonly Status[];
const MAX_RESULTS = 15;

export const SPONSORSHIP_INSTRUCTIONS = `Sponsorships (companies sponsoring ZurichJS):
- You can answer organisers' questions about sponsors with sponsorshipOverview and findSponsors. These only read. You cannot change a sponsorship: plan changes and endings are proposed in the admin area at /admin/sponsors and confirmed by the sponsor in their portal. Never claim you changed one.
- Statuses: pending (invited or started, not paid yet), active, past due (a card payment failed or an invoice is overdue), ending (agreed to end with the paid period), ended.
- Tiers, lowest first: Community Supporter, Community Friend, Community Builder, Community Champion. Billing: monthly, quarterly, yearly, or one meetup.
- You do not see contact names or emails, on purpose. Point people to /admin/sponsors for those.
- Sponsor details are business-confidential: only discuss them here, in the organisers' channel.`;

const forModel = async (s: Sponsor, store: SponsorStore) => {
  const [proposals, logos] = await Promise.all([store.proposals(s.id), store.logos(s.id)]);
  const open = proposals.find((p) => p.status === 'open');
  return {
    company: s.companyName,
    tier: tierInfo(s.tier).name,
    billing: s.cycle === 'once' ? `one meetup (${s.eventTitle ?? 'not chosen'}${s.eventDate ? `, ${longDate(s.eventDate)}` : ''})` : cycleInfo(s.cycle).label.toLowerCase(),
    fee: feeLabel(s.tier, s.cycle),
    payment: { card: 'card', invoice: 'invoice', manual: 'paid directly (outside Stripe)' }[s.paymentMode],
    status: s.status === 'ended' && s.endedReason ? `ended (${ENDED_REASON_LABEL[s.endedReason]})` : label(s.status),
    since: s.startedAt ? longDate(s.startedAt) : null,
    paidThrough: s.paidUntil ? longDate(lastDay(s.paidUntil)) : null,
    lastDay: s.endsAt ? longDate(lastDay(s.endsAt)) : null,
    openProposal: open ? (open.kind === 'end' ? 'end the sponsorship' : `${tierInfo(open.tier!).name}, ${feeLabel(open.tier!, open.cycle!)}`) : null,
    logo: logos[0] ? logos[0].review : 'none uploaded',
  };
};

export function sponsorshipTools(store: SponsorStore): ToolSet {
  return {
    sponsorshipOverview: tool({
      description: 'How many sponsors there are, by status and by tier (running ones), and how many proposals wait for an answer.',
      inputSchema: z.object({}),
      execute: async () => {
        const all = await store.search({ limit: 5000 });
        const running = all.filter((s) => isRunning(s.status));
        const proposals = await Promise.all(running.map((s) => store.proposals(s.id)));
        return {
          running: running.length,
          byStatus: Object.fromEntries(STATUSES.map((st) => [st, all.filter((s) => s.status === st).length])),
          runningByTier: Object.fromEntries(
            ['champion', 'builder', 'friend', 'supporter'].map((t) => [tierInfo(t as Sponsor['tier']).name, running.filter((s) => s.tier === t).length]),
          ),
          openProposals: proposals.flat().filter((p) => p.status === 'open').length,
          note: 'Running = active, past due and ending (benefits continue until the paid period ends).',
        };
      },
    }),
    findSponsors: tool({
      description: `Finds sponsors by company name (query) and/or status. Newest first, at most ${MAX_RESULTS}.`,
      inputSchema: z.object({
        query: z.string().min(2).optional().describe('Part of a company name'),
        status: z.enum(STATUSES).optional().describe('Only sponsors in this status'),
      }),
      execute: async ({ query, status }) => {
        const found = await store.search({ q: query, status, limit: MAX_RESULTS + 1 });
        const shown = found.slice(0, MAX_RESULTS);
        return { count: shown.length, more: found.length > MAX_RESULTS, sponsors: await Promise.all(shown.map((s) => forModel(s, store))) };
      },
    }),
  };
}
