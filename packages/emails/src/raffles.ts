/**
 * Raffle emails to entrants (docs/domains/sponsorship/raffles.md). Entrants have no account: each
 * email carries their own entry link. Same copy rules as the other emails: plain, specific, no em
 * dashes. Nothing here is marketing; entry never depends on a marketing choice.
 */
import type { EmailContent } from './layout.ts';

export interface RaffleEntryProps {
  /** The name or nickname they entered with. */
  name: string;
  prize: string;
  /** "ZurichJS Meetup December, 9th December 2026" */
  meetup: string;
  /** "Acme AG": the company that funded the prize. */
  sponsorName: string;
  claimCode: string;
  /** Their own link: confirm the email, see the entry. */
  manageUrl: string;
  rulesUrl: string;
}

export type RaffleWinnerProps = Omit<RaffleEntryProps, 'manageUrl'>;

function raffleEntry(p: RaffleEntryProps): EmailContent {
  return {
    subject: `You are in the raffle for ${p.prize ?? 'the prize'}`,
    preheader: `Your claim code is ${p.claimCode ?? ''}.`,
    heading: 'You are in the raffle',
    blocks: [
      {
        kind: 'p',
        text: `Hi ${p.name ?? 'there'}, your entry for ${p.prize ?? 'the prize'} at ${p.meetup ?? 'the meetup'} counts. The prize is supported by ${p.sponsorName ?? 'a sponsor'}.`,
      },
      { kind: 'summary', rows: [['Your claim code', p.claimCode ?? '']] },
      { kind: 'p', text: 'We announce the winning claim code, never a name. If your code is drawn, we also email you.' },
      { kind: 'button', label: 'Confirm your email', url: p.manageUrl },
      { kind: 'small', text: 'Confirming tells us this address is yours. Your entry counts either way. Keep this email: its link is how you see your entry later.' },
      { kind: 'url', text: 'Raffle rules', url: p.rulesUrl },
    ],
  };
}

function raffleWinner(p: RaffleWinnerProps): EmailContent {
  return {
    subject: `Your claim code ${p.claimCode ?? ''} was drawn`,
    preheader: `You won ${p.prize ?? 'the prize'}.`,
    heading: 'Your code was drawn',
    blocks: [
      { kind: 'p', text: `Hi ${p.name ?? 'there'}, claim code ${p.claimCode ?? ''} was drawn in the raffle for ${p.prize ?? 'the prize'} at ${p.meetup ?? 'the meetup'}.` },
      { kind: 'p', text: 'Reply to this email to arrange how you get the prize. The raffle rules say how long you have to reply.' },
      { kind: 'url', text: 'Raffle rules', url: p.rulesUrl },
    ],
  };
}

export const RAFFLE_TEMPLATES = {
  'raffle-entry': raffleEntry,
  'raffle-winner': raffleWinner,
} satisfies Record<string, (p: never) => EmailContent>;
