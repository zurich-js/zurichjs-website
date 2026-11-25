/**
 * Fills the `partners` table of a LOCAL database from the list in packages/content/src/partners.ts
 * and the logo files in apps/web/public/images/partners (docs/domains/partners/overview.md).
 *
 *   pnpm partners:seed                 # the local Docker Postgres (localhost:54322)
 *   MEMBERSHIP_DB_URL=… pnpm partners:seed
 *
 * It only adds: a partner whose id is already in the table is left exactly as it is, with its
 * logos, so it is safe to run again. It refuses any database that is not on this machine: a
 * deployed database is seeded by the owner, not from a laptop (docs/conventions/working-rules.md).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { PARTNERS } from '@zurichjs/content';
import { postgresPartners, type NewPartner } from '@zurichjs/sponsorship';

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1', '[::1]', 'db'];
const url = process.env.MEMBERSHIP_DB_URL || 'postgres://postgres:postgres@localhost:54322/zurichjs';
const host = new URL(url).hostname;
if (!LOCAL_HOSTS.includes(host)) {
  console.error(`[seed-partners] refused: ${host} is not a local database. This script only writes to a database on this machine.`);
  process.exit(1);
}

const TYPES: Record<string, string> = { svg: 'image/svg+xml', png: 'image/png', webp: 'image/webp' };
const publicDir = join(import.meta.dirname, '../public');

const pool = new pg.Pool({ connectionString: url, max: 1 });
try {
  const store = postgresPartners(pool);
  const have = new Set((await store.list()).map((p) => p.id));
  let added = 0;
  for (const p of PARTNERS) {
    if (have.has(p.id)) continue;
    const record: NewPartner = {
      id: p.id,
      name: p.name,
      url: p.url ?? null,
      kinds: p.kinds,
      tier: p.tier ?? null,
      current: p.current,
      delisted: p.delisted === true,
      description: p.description ?? null,
      blurb: p.blurb ?? null,
      allowReferrer: p.allowReferrer === true,
      logoBackground: p.logoBackground?.toLowerCase() ?? null,
      logoKnockout: p.logoKnockout === true,
    };
    await store.create(record);
    for (const [variant, path] of [
      ['colour', p.logo],
      ['mono', p.logoBlack],
    ] as const) {
      if (!path?.startsWith('/')) continue;
      const filename = path.split('/').pop()!;
      const contentType = TYPES[filename.split('.').pop() ?? ''];
      if (!contentType) throw new Error(`${p.id}: ${filename} is not an SVG, PNG or WebP`);
      const data = new Uint8Array(readFileSync(join(publicDir, path)));
      await store.setLogo(p.id, variant, {
        contentType,
        filename,
        data,
        ratio: variant === 'colour' ? (p.logoRatio ?? null) : null,
        opaque: variant === 'colour' && p.logoOpaque === true,
      });
    }
    added++;
  }
  console.log(`[seed-partners] ${added} added, ${PARTNERS.length - added} already there (${host})`);
} finally {
  await pool.end();
}
