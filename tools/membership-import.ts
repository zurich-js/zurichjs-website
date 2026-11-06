/**
 * Imports existing members (signed on paper, paid by hand) into Supabase.
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… pnpm membership:import members.csv           # dry run: checks, writes nothing
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… pnpm membership:import members.csv --apply   # writes
 * The CSV format is in packages/membership/src/import.ts. Run it against the
 * staging project first. Nothing is written if any row has a problem, or if an
 * email is already a member. Each paper declaration PDF is stored in the
 * private `declarations` bucket with its SHA-256.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { insertDeclaration, parseImport, supabaseStore, uploadPrivate } from '@zurichjs/membership';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const apply = args.includes('--apply');
if (!file) {
  console.error('Usage: pnpm membership:import <members.csv> [--apply]');
  process.exit(1);
}

const { rows, problems } = parseImport(readFileSync(file, 'utf8'));
const base = dirname(resolve(file));
for (const r of rows)
  if (r.declarationPdf && !existsSync(resolve(base, r.declarationPdf))) problems.push({ line: r.line, message: `declaration_pdf ${r.declarationPdf} not found next to the CSV.` });

const env = process.env;
let store: ReturnType<typeof supabaseStore>;
try {
  store = supabaseStore(env);
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
for (const r of rows) if (await store.byEmail(r.member.email)) problems.push({ line: r.line, message: `${r.member.email} is already in the database.` });

console.log(`Project: ${new URL(env.SUPABASE_URL!).host}`);
console.log(`${rows.length} member${rows.length === 1 ? '' : 's'} read from ${file}.`);
if (problems.length) {
  console.error(`\nNothing imported. Fix these first:`);
  for (const p of problems.sort((a, b) => a.line - b.line)) console.error(`  line ${p.line}: ${p.message}`);
  process.exit(1);
}
for (const r of rows)
  console.log(
    `  line ${r.line}: ${r.member.name}${r.member.organisationName ? ` (${r.member.organisationName})` : ''}, ${r.member.level} ${r.member.cycle}, paid until ${r.member.paidUntil}${r.declarationPdf ? ', paper declaration' : ''}`,
  );
if (!apply) {
  console.log('\nDry run: nothing written. Add --apply to import.');
  process.exit(0);
}

const actor = { kind: 'script', id: 'membership-import' } as const;
let done = 0;
for (const r of rows) {
  try {
    let pdf: { sha256: string; path: string } | null = null;
    if (r.declarationPdf) {
      const bytes = new Uint8Array(readFileSync(resolve(base, r.declarationPdf)));
      const sha256 = createHash('sha256').update(bytes).digest('hex');
      // Content-addressed, so a re-run after a failure finds the same file.
      pdf = { sha256, path: `paper/${sha256}.pdf` };
      await uploadPrivate(env, 'declarations', pdf.path, bytes, 'application/pdf').catch((err: Error) => {
        if (!/HTTP (400|409)/.test(err.message)) throw err;
      });
    }
    const m = await store.create(r.member, actor);
    if (pdf)
      await insertDeclaration(env, {
        memberId: m.id,
        kind: 'paper_import',
        versionId: null,
        // The paper date is not in the CSV; joined_at is the closest record.
        signedAt: r.member.joinedAt ? `${r.member.joinedAt}T12:00:00Z` : new Date().toISOString(),
        typedName: null,
        ip: null,
        userAgent: null,
        sha256: pdf.sha256,
        storagePath: pdf.path,
      });
    done++;
    console.log(`  imported line ${r.line}: ${m.email}`);
  } catch (err) {
    console.error(
      `  line ${r.line} (${r.member.email}) failed: ${(err as Error).message}. Stopped; ${done} imported. Fix it and run again: imported emails are skipped as duplicates.`,
    );
    process.exit(1);
  }
}
console.log(`\n${done} imported.`);
