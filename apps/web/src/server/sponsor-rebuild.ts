/**
 * A rebuild when a sponsorship changes what the public site shows (docs/systems/operations/rebuilds.md).
 *
 * The site is static and reads the sponsorships at build time (sponsor-public.ts), so a sponsorship
 * that starts, ends, changes tier or is linked to another partner record queues a build the same
 * way a Sanity publish does (as does moving the meetups a running one-time sponsorship covers): a
 * pending entry in the `rebuild` Blobs store, built by
 * `scheduled-rebuild` once things have been quiet for two minutes. Wrapping the store catches every
 * writer (the sponsor, the board, Stripe's webhook, the daily check) in one place.
 *
 * Queueing never throws and never blocks a change: without Netlify Blobs (local, tests) it logs a line.
 */
import { isRunning, type Sponsor, type SponsorPatch, type SponsorStore, type Status } from '@zurichjs/sponsorship';
import { rebuildStore } from './rebuild-store.ts';

/** The fields of a sponsor the public site shows or links by. */
const PUBLIC_FIELDS: (keyof SponsorPatch)[] = ['tier', 'partnerId', 'companyName', 'website'];

/** Running or not is what the site shows; pending to ended (it never started) changes nothing. */
export const statusChangeIsPublic = (from: Status, to: Status) => isRunning(from) !== isRunning(to);

/** A pending sponsorship is not on the site, so its details can change freely. */
export const patchIsPublic = (patch: SponsorPatch, after: Pick<Sponsor, 'status'>) => after.status !== 'pending' && PUBLIC_FIELDS.some((k) => k in patch);

/** A concurrent move gets a fresh version and survives acknowledgement of the earlier build. */
export async function queueCoverage(store: SponsorStore, queue: (reason: string) => Promise<void>, versions: string[]) {
  if (!versions.length) return;
  try {
    await queue('sponsored meetups moved');
    await store.acknowledgeMeetupRebuilds(versions);
  } catch (error) {
    console.warn('[sponsorship] meetup rebuild still pending', error);
  }
}

export function withRebuilds(store: SponsorStore, queue: (reason: string) => Promise<void>): SponsorStore {
  const safely = async (reason: string) => {
    try {
      await queue(reason);
    } catch (err) {
      console.warn(`[sponsorship] could not queue a rebuild (${reason}): ${(err as Error).message}`);
    }
  };
  return {
    ...store,
    async paidInvoice(id, payment, actor, opts) {
      const before = await store.get(id);
      const saved = await store.paidInvoice(id, payment, actor, opts);
      if (before && (before.tier !== saved.tier || statusChangeIsPublic(before.status, saved.status))) await safely('sponsorship payment applied');
      return saved;
    },
    async create(input, contact, actor, opts) {
      const created = await store.create(input, contact, actor, opts);
      // An imported sponsorship starts running.
      if (isRunning(created.sponsor.status)) {
        const version = opts?.meetups?.length ? (await store.get(created.sponsor.id))?.meetupRebuildId : null;
        if (version) await queueCoverage(store, queue, [version]);
        else await safely('sponsorship added as running');
      }
      return created;
    },
    async transition(id, input) {
      // Without an expected status the store takes the current one, so read it first.
      const from = input.from ?? (await store.get(id))?.status;
      const s = await store.transition(id, input);
      if (!from || statusChangeIsPublic(from, input.to)) await safely(`sponsorship ${from ?? 'unknown'} to ${input.to}`);
      return s;
    },
    async update(id, patch, actor) {
      const s = await store.update(id, patch, actor);
      if (patchIsPublic(patch, s)) await safely('sponsor details changed');
      return s;
    },
    async setMeetups(id, list, actor) {
      const saved = await store.setMeetups(id, list, actor);
      const version = (await store.get(id))?.meetupRebuildId;
      if (version) await queueCoverage(store, queue, [version]);
      return saved;
    },
  };
}

/** Records a pending build in the store `scheduled-rebuild` reads, as /api/rebuild does for a Sanity publish. */
export async function queueRebuild(_reason: string, now = new Date()): Promise<void> {
  await rebuildStore().publish(now);
}
