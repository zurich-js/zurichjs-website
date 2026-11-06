/**
 * A throwaway local Postgres for testing supabase/migrations: initdb in a temp
 * directory, a Unix socket only (no TCP port), stopped and deleted afterwards.
 * Returns null when no Postgres binaries are installed, so the tests skip.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function pgBin(): string | null {
  for (const base of ['/usr/lib/postgresql']) {
    if (!existsSync(base)) continue;
    const versions = readdirSync(base).sort((a, b) => Number(b) - Number(a));
    for (const v of versions) if (existsSync(join(base, v, 'bin', 'initdb'))) return join(base, v, 'bin');
  }
  const which = spawnSync('which', ['initdb'], { encoding: 'utf8' });
  return which.status === 0 ? join(which.stdout.trim(), '..') : null;
}

export interface Pg {
  /** Runs SQL as the superuser, or as `role` with `uid` as auth.uid(). Returns the unaligned output. */
  sql(query: string, opts?: { role?: 'anon' | 'authenticated' | 'service_role'; uid?: string }): string;
  /** Like sql(), but expects an error and returns its message. */
  fails(query: string, opts?: { role?: 'anon' | 'authenticated' | 'service_role'; uid?: string }): string;
  stop(): void;
}

export function startPg(): Pg | null {
  const bin = pgBin();
  if (!bin) return null;
  const dir = mkdtempSync(join(tmpdir(), 'zjs-pg-'));
  chmodSync(dir, 0o777);
  // initdb refuses to run as root; run the server as the postgres user then.
  const asRoot = process.getuid?.() === 0;
  const run = (cmd: string, args: string[], input?: string) => {
    const [c, a] = asRoot ? ['runuser', ['-u', 'postgres', '--', join(bin, cmd), ...args]] : [join(bin, cmd), args];
    return spawnSync(c, a as string[], { encoding: 'utf8', input });
  };
  const data = join(dir, 'data');
  const init = run('initdb', ['-D', data, '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--no-sync']);
  if (init.status !== 0) throw new Error(`initdb failed: ${init.stderr}`);
  const start = run('pg_ctl', ['-D', data, '-l', join(dir, 'log'), '-w', '-o', `-c listen_addresses='' -c unix_socket_directories=${dir} -c fsync=off`, 'start']);
  if (start.status !== 0) throw new Error(`pg_ctl start failed: ${start.stderr}`);

  const psql = (query: string, opts: { role?: string; uid?: string } = {}) => {
    const prefix = [opts.uid ? `set "request.jwt.claim.sub" = '${opts.uid}';` : '', opts.role ? `set role ${opts.role};` : ''].join('\n');
    return run('psql', ['-h', dir, '-U', 'postgres', '-d', 'postgres', '-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1'], `${prefix}\n${query}`);
  };

  return {
    sql(query, opts) {
      const r = psql(query, opts);
      if (r.status !== 0) throw new Error(r.stderr.trim());
      return r.stdout.trim();
    },
    fails(query, opts) {
      const r = psql(query, opts);
      if (r.status === 0) throw new Error(`Expected an error, got: ${r.stdout}`);
      return r.stderr.trim();
    },
    stop() {
      run('pg_ctl', ['-D', data, '-m', 'immediate', 'stop']);
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        execFileSync('rm', ['-rf', dir]);
      }
    },
  };
}
