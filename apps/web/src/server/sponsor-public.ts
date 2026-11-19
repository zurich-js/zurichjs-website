/**
 * What the public site reads from the sponsorships database at build time: who sponsors, at which
 * tier, and which partner record they are (docs/domains/sponsorship/overview.md, "On the public
 * site"). @zurichjs/content applies it to the partner list (packages/content/src/sponsorships.ts).
 *
 * One short-lived connection per build, not the functions' pool, so the build process can exit.
 * Without a database URL it answers null and the partner list stands. Errors are the caller's to
 * catch (`withSponsorships` does, and the build carries on).
 */
import pg from 'pg';
import type { SponsorshipRow } from '@zurichjs/content';
import { membershipUrl } from './db-url.ts';
import type { Env } from './http.ts';

/** Running sponsorships, and ended ones that name a partner record (they mark it as past). */
export const PUBLIC_SPONSORSHIPS_SQL = `select id, company_name, website, tier, status, partner_id from sponsors
  where status in ('active', 'past_due', 'ending') or (status = 'ended' and partner_id is not null)`;

interface Row {
  id: string;
  company_name: string;
  website: string | null;
  tier: string;
  status: string;
  partner_id: string | null;
}

export const sponsorshipRow = (r: Row): SponsorshipRow => ({ id: r.id, companyName: r.company_name, website: r.website, tier: r.tier, status: r.status, partnerId: r.partner_id });

export async function publicSponsorships(env: Env): Promise<SponsorshipRow[] | null> {
  const url = membershipUrl(env);
  if (!url) return null;
  const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 8_000, query_timeout: 8_000 });
  // A connection that drops while idle must not crash the build.
  client.on('error', () => undefined);
  await client.connect();
  try {
    return (await client.query<Row>(PUBLIC_SPONSORSHIPS_SQL)).rows.map(sponsorshipRow);
  } finally {
    await client.end().catch(() => undefined);
  }
}
