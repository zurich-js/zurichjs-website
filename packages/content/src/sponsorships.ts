/**
 * Paid sponsorships override the partner list (owner, 19th November 2026).
 *
 * The partner list (Sanity, or the code-side record in partners.ts) owns each partner's logo, hover
 * colour, link and words. The sponsorships database (docs/domains/sponsorship/overview.md) owns who
 * is a current sponsor and at which tier:
 *
 *   a running sponsorship linked to a partner   -> that partner is a current sponsor at the database's tier
 *   a linked sponsorship that has ended         -> that partner is a past sponsor, without a tier
 *   a running sponsorship without a partner     -> listed by company name, without a logo
 *   no sponsorship linked to a partner          -> the partner list stands as it is
 *
 * A sponsor is linked by its `partnerId` (the admin area's "Partner id"), which equals the partner's
 * `id`. Names are never used to link. This file is pure: the database is read by the caller
 * (apps/web/src/server/sponsor-public.ts) and handed in, so the content package stays dependency-free.
 */
import type { Partner, SponsorTier } from '@zurichjs/events';
import { isDelisted } from './partners.ts';

/** What the public site needs from a row of the `sponsors` table. */
export interface SponsorshipRow {
  id: string;
  companyName: string;
  website: string | null;
  tier: string;
  status: string;
  partnerId: string | null;
}

/** Reads the sponsorships for a build; null when no database is configured. */
export type SponsorshipSource = (env: Record<string, string | undefined>) => Promise<SponsorshipRow[] | null>;

/** Highest first. */
const TIERS: SponsorTier[] = ['champion', 'builder', 'friend', 'supporter'];
/** `isRunning` in @zurichjs/sponsorship: the sponsor gets the tier's benefits. */
const RUNNING = ['active', 'past_due', 'ending'];

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const tierOf = (r: SponsorshipRow) => (TIERS as string[]).indexOf(r.tier);
const highest = (rows: SponsorshipRow[]) => [...rows].sort((a, b) => tierOf(a) - tierOf(b))[0]!;
const webUrl = (s: string | null) => {
  try {
    const u = new URL(s ?? '');
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : undefined;
  } catch {
    return undefined;
  }
};

/**
 * The partner list with the sponsorships applied. `notes` says what a person should look at
 * (a sponsor shown without a logo, a sponsor left out); the build logs them.
 */
export function applySponsorships(partners: Partner[], rows: SponsorshipRow[]): { partners: Partner[]; notes: string[] } {
  const notes: string[] = [];
  const valid = rows.filter((r) => tierOf(r) >= 0);
  const key = (r: SponsorshipRow) => r.partnerId?.trim() || null;
  const linked = (id: string) => valid.filter((r) => key(r) === id);
  const ids = new Set(partners.map((p) => p.id));

  const out = partners.map((p): Partner => {
    const mine = linked(p.id);
    // Withdrawn from promotion by the owner: a sponsorship never brings them back.
    if (mine.length === 0 || isDelisted(p)) return p;
    const running = mine.filter((r) => RUNNING.includes(r.status));
    if (running.length > 0) {
      return { ...p, kinds: p.kinds.includes('sponsor') ? p.kinds : ['sponsor', ...p.kinds], tier: highest(running).tier as SponsorTier, current: true };
    }
    if (!mine.some((r) => r.status === 'ended')) return p;
    // Ended: no tier any more. A partner who is also a host or another kind keeps its own current flag.
    const { tier: _tier, ...rest } = p;
    return p.kinds.every((k) => k === 'sponsor') ? { ...rest, current: false } : rest;
  });

  // Running sponsorships without a partner record: the company name, no logo.
  const names = new Set(partners.flatMap((p) => [norm(p.id), norm(p.name)]));
  const unlinked = new Map<string, SponsorshipRow[]>();
  for (const r of valid) {
    const k = key(r);
    if (!RUNNING.includes(r.status) || (k && ids.has(k))) continue;
    const id = k ?? `sponsor-${r.id}`;
    unlinked.set(id, [...(unlinked.get(id) ?? []), r]);
  }
  for (const [id, group] of unlinked) {
    const r = highest(group);
    if (isDelisted({ id, name: r.companyName })) {
      notes.push(`"${r.companyName}" has a running sponsorship but is withdrawn from promotion: not shown.`);
    } else if (names.has(norm(r.companyName))) {
      // The same company as a partner record, but not linked: never a second, logo-less entry.
      notes.push(
        `"${r.companyName}" has a running sponsorship that is not linked to its partner record: set its Partner id in /admin/sponsors. The partner list is shown unchanged.`,
      );
    } else {
      out.push({ id, name: r.companyName, url: webUrl(r.website), kinds: ['sponsor'], tier: r.tier as SponsorTier, current: true });
      notes.push(`"${r.companyName}" has a running sponsorship and no partner record: shown by name, without a logo.`);
    }
  }
  return { partners: out, notes };
}
