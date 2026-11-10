/**
 * Imports existing members (joined on paper, paid by hand) through the site's
 * admin endpoint (/api/membership/admin/import): member data never goes into
 * git, and production data changes go through the application.
 *   MEMBERSHIP_ADMIN_PASSWORD=… pnpm membership:import members.csv                    # dry run: checks, writes nothing
 *   MEMBERSHIP_ADMIN_PASSWORD=… pnpm membership:import members.csv --apply            # writes
 *   … --site https://deploy-preview-78--zurichjs.netlify.app                       # a preview (its own database branch)
 * The CSV format is in packages/membership/src/import.ts. Nothing is written if
 * any row has a problem or an email is already a member.
 */
import { readFileSync } from 'node:fs';
import { parseImport } from '@zurichjs/membership';

const args = process.argv.slice(2);
const siteAt = args.indexOf('--site');
const site = (siteAt >= 0 ? (args[siteAt + 1] ?? '') : 'https://zurichjs.com').replace(/\/+$/, '');
const file = args.find((a, i) => !a.startsWith('--') && (siteAt < 0 || i !== siteAt + 1));
const apply = args.includes('--apply');
const token = process.env.MEMBERSHIP_ADMIN_PASSWORD;
if (!file || !token) {
  console.error('Usage: MEMBERSHIP_ADMIN_PASSWORD=… pnpm membership:import <members.csv> [--apply] [--site <url>]');
  process.exit(1);
}

const csv = readFileSync(file, 'utf8');
const local = parseImport(csv);
if (local.problems.length) {
  console.error('Nothing sent. Fix these first:');
  for (const p of local.problems) console.error(`  line ${p.line}: ${p.message}`);
  process.exit(1);
}

const res = await fetch(`${site}/api/membership/admin/import`, {
  method: 'POST',
  headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
  body: JSON.stringify({ csv, apply }),
});
const body = (await res.json().catch(() => ({}))) as {
  ok?: boolean;
  applied?: boolean;
  imported?: number;
  rows?: { line: number; email: string; name: string; level: string; cycle: string; paidUntil: string }[];
  problems?: { line: number; message: string }[];
  error?: string;
};
console.log(`Site: ${site}`);
if (!res.ok || !body.ok) {
  console.error(body.error ?? `HTTP ${res.status}`);
  for (const p of body.problems ?? []) console.error(`  line ${p.line}: ${p.message}`);
  process.exit(1);
}
for (const r of body.rows ?? []) console.log(`  line ${r.line}: ${r.name} <${r.email}>, ${r.level} ${r.cycle}, paid until ${r.paidUntil}`);
console.log(body.applied ? `\n${body.imported} imported.` : `\n${body.rows?.length ?? 0} ready. Dry run: nothing written. Add --apply to import.`);
