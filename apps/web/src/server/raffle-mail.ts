import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { renderEmail } from '@zurichjs/emails';
import { sendMemberEmail } from '@zurichjs/integrations';
import type { RaffleStore } from '@zurichjs/raffle';
import type { SponsorStore } from '@zurichjs/sponsorship';
import type { Env } from './http.ts';
import { MembershipUnavailable } from './membership-db.ts';
import { manageUrl, tokenHash } from './raffle.ts';
import { longDate } from './dates.ts';

function bearer(env: Env, nonce: string) {
  if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32) throw new MembershipUnavailable('Raffle email signing is not configured.');
  return createHmac('sha256', env.BETTER_AUTH_SECRET)
    .update('raffle-management:' + nonce)
    .digest('base64url');
}
export function managementGrant(env: Env) {
  const nonce = randomBytes(32).toString('hex');
  return { nonce, hash: tokenHash(bearer(env, nonce)) };
}

export async function deliverRaffleMail(env: Env, raffles: RaffleStore, sponsors: SponsorStore, origin: string, opts: { fetch?: typeof fetch; entryId?: string } = {}) {
  const lease = randomUUID();
  for (const m of await raffles.claimMail(lease, opts.entryId)) {
    let delivered = false;
    try {
      const e = await raffles.entryById(m.entryId);
      if (!e || !e.email) {
        delivered = true;
        continue;
      }
      const r = await raffles.get(e.raffleId);
      if (!r) continue;
      const sponsor = await sponsors.get(r.sponsorId);
      const props = {
        name: e.name,
        prize: r.prize,
        meetup: `${r.eventTitle}, ${longDate(r.eventDate)}`,
        sponsorName: sponsor?.companyName ?? 'a sponsor',
        claimCode: e.claimCode,
        rulesUrl: r.rulesUrl ?? origin,
      };
      const message = m.kind === 'winner' ? renderEmail('raffle-winner', props) : renderEmail('raffle-entry', { ...props, manageUrl: manageUrl(origin, bearer(env, m.nonce!)) });
      delivered = (await sendMemberEmail(env, { to: e.email, ...message }, { fetch: opts.fetch, idempotencyKey: 'raffle:' + m.key, log: () => {} })).sent;
    } catch {
      /* The lease is released below. A later delivery uses the same provider key. */
    } finally {
      await raffles.finishMail(m.key, lease, delivered);
    }
  }
}
