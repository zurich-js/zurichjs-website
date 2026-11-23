/**
 * What the public site reads from the database at build time (docs/domains/partners/overview.md and
 * docs/domains/sponsorship/overview.md, "On the public site"): the partner records with the
 * addresses of their logo files, the logo files themselves (pages/partner-logos/[file].ts), and
 * who sponsors, at which tier, linked to which partner record. @zurichjs/content puts them
 * together (packages/content/src/index.ts, sponsorships.ts).
 *
 * One short-lived connection per build, not the functions' pool, so the build process can exit.
 * Without a database URL it answers null and the partner list stands. Errors are the caller's to
 * catch (`withPartners` and `withSponsorships` do, and the build carries on).
 */
import pg from 'pg';
import type { SponsorshipRow } from '@zurichjs/content';
import type { Partner } from '@zurichjs/events';
import { partnerLogoFile, postgresPartners, type PartnerLogoFile, type PartnerWithLogos, type Queryable } from '@zurichjs/sponsorship';
import { membershipUrl } from './db-url.ts';
import type { Env } from './http.ts';

/**
 * Running sponsorships, and ended ones that name a partner record (they mark it as past), with the
 * meetups a one-time sponsorship covers now. A meetup taken off it keeps its row with `removed_at`
 * set (covered meetups, #98) and is not one of them; the column is read through `to_jsonb` so the
 * query works on a database with or without it.
 */
export const PUBLIC_SPONSORSHIPS_SQL = `select s.id, s.company_name, s.website, s.tier, s.status, s.partner_id, s.cycle,
    array(select m.event_id from sponsor_meetups m where m.sponsor_id = s.id and to_jsonb(m) ->> 'removed_at' is null order by m.date, m.event_id) as event_ids
  from sponsors s
  where s.status in ('active', 'past_due', 'ending') or (s.status = 'ended' and s.partner_id is not null)`;

interface Row {
  id: string;
  company_name: string;
  website: string | null;
  tier: string;
  status: string;
  partner_id: string | null;
  cycle: string;
  event_ids: string[] | null;
}

export const sponsorshipRow = (r: Row): SponsorshipRow => ({
  id: r.id,
  companyName: r.company_name,
  website: r.website,
  tier: r.tier,
  status: r.status,
  partnerId: r.partner_id,
  cycle: r.cycle,
  eventIds: r.event_ids ?? [],
});

/** One short-lived connection: opened, used, closed. Null without a database URL. */
async function once<T>(env: Env, fn: (db: Queryable) => Promise<T>): Promise<T | null> {
  const url = membershipUrl(env);
  if (!url) return null;
  const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 8_000, query_timeout: 8_000 });
  // A connection that drops while idle must not crash the build.
  client.on('error', () => undefined);
  await client.connect();
  try {
    return await fn(client as unknown as Queryable);
  } finally {
    await client.end().catch(() => undefined);
  }
}

export const publicSponsorships = (env: Env): Promise<SponsorshipRow[] | null> => once(env, async (db) => (await db.query<Row>(PUBLIC_SPONSORSHIPS_SQL)).rows.map(sponsorshipRow));

/** Where a build finds the logo files: static files it writes itself, or (the dev server) the endpoint that reads the database. */
export const LOGO_BASE = { build: '/partner-logos', dev: '/api/partner-logo' } as const;

/** A partner record as the site's pages know a partner. */
export function sitePartner(p: PartnerWithLogos, logoBase: string): Partner {
  const { colour, mono } = p.logos;
  return {
    id: p.id,
    name: p.name,
    url: p.url ?? undefined,
    logo: colour ? `${logoBase}/${partnerLogoFile(colour)}` : undefined,
    logoBlack: mono ? `${logoBase}/${partnerLogoFile(mono)}` : undefined,
    logoBackground: p.logoBackground ?? undefined,
    logoRatio: colour?.ratio ?? undefined,
    logoOpaque: colour?.opaque || undefined,
    logoKnockout: p.logoKnockout || undefined,
    kinds: p.kinds,
    tier: p.tier ?? undefined,
    current: p.current,
    delisted: p.delisted || undefined,
    description: p.description ?? undefined,
    blurb: p.blurb ?? undefined,
    allowReferrer: p.allowReferrer,
  };
}

/** The partner records; empty before the table is seeded, null without a database. */
export const publicPartners =
  (logoBase: string) =>
  (env: Env): Promise<Partner[] | null> =>
    once(env, async (db) => (await postgresPartners(db).list()).map((p) => sitePartner(p, logoBase)));

/** Every logo file, for the build to write out. Empty without a database. */
export const publicPartnerLogos = async (env: Env): Promise<PartnerLogoFile[]> => (await once(env, (db) => postgresPartners(db).logoFiles())) ?? [];
