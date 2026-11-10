/**
 * The membership admin area (/admin/memberships): one shared password for the
 * board, from ADMIN_PASSWORD (owner, 11th November 2026). The
 * protection is in the site, so production and every deploy preview (whose
 * database is a copy of production) enforce the same password.
 *
 *   - Sign in: the password, compared in constant time. Any length: the owner's choice
 *     (owner, 11th November 2026).
 *     At most 10 failed attempts per IP in 15 minutes, counted in the database
 *     so the limit holds across serverless instances.
 *   - Session: an httpOnly, Secure, SameSite=Strict cookie for the admin API
 *     only, valid 8 hours, signed with a key derived from the password, so
 *     changing the password signs everyone out.
 *   - Writes must come from the site itself (Origin check), against CSRF.
 *   - Scripts (pnpm membership:import) send the password as a Bearer token.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Queryable } from '@zurichjs/membership';
import type { Env } from './http.ts';

export const ADMIN_COOKIE = 'zjs_admin';
export const ADMIN_COOKIE_PATH = '/api/membership/admin';
export const SESSION_SECONDS = 8 * 3600;
export const MAX_FAILURES = 10;
export const FAILURE_WINDOW_MS = 15 * 60_000;
export const adminPassword = (env: Env): string | null => {
  const p = env.ADMIN_PASSWORD;
  return p ? p : null;
};

const sameText = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** The cookie signing key, derived from the password: a new password ends every session. */
const sessionKey = (password: string) => createHmac('sha256', password).update('zurichjs-membership-admin-session-v1').digest();

export function signSession(password: string, nowMs = Date.now()): string {
  const exp = Math.floor(nowMs / 1000) + SESSION_SECONDS;
  const mac = createHmac('sha256', sessionKey(password)).update(`admin|${exp}`).digest('base64url');
  return `v1.${exp}.${mac}`;
}

export function verifySession(value: string | undefined, password: string, nowMs = Date.now()): boolean {
  const m = /^v1\.(\d{1,12})\.([A-Za-z0-9_-]{43})$/.exec(value ?? '');
  if (!m) return false;
  const exp = Number(m[1]);
  if (exp * 1000 <= nowMs) return false;
  const expected = createHmac('sha256', sessionKey(password)).update(`admin|${exp}`).digest('base64url');
  return sameText(m[2]!, expected);
}

export function readCookie(request: Request, name: string): string | undefined {
  for (const part of (request.headers.get('cookie') ?? '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return undefined;
}

const secure = (request: Request) => new URL(request.url).protocol === 'https:';

export const sessionCookie = (request: Request, value: string) =>
  `${ADMIN_COOKIE}=${value}; Path=${ADMIN_COOKIE_PATH}; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${secure(request) ? '; Secure' : ''}`;

export const clearedCookie = (request: Request) => `${ADMIN_COOKIE}=; Path=${ADMIN_COOKIE_PATH}; HttpOnly; SameSite=Strict; Max-Age=0${secure(request) ? '; Secure' : ''}`;

/** Signed in through the cookie, or a script sending the password as a Bearer token. */
export function isAdmin(request: Request, env: Env, nowMs = Date.now()): boolean {
  const password = adminPassword(env);
  if (!password) return false;
  const bearer = /^Bearer (.+)$/.exec(request.headers.get('authorization') ?? '')?.[1];
  if (bearer) return sameText(bearer, password);
  return verifySession(readCookie(request, ADMIN_COOKIE), password, nowMs);
}

/** Writes from a browser must come from this site. Scripts (Bearer, no Origin) are allowed. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return !!request.headers.get('authorization');
  return origin === new URL(request.url).origin;
}

/** Netlify's client IP header (set by Netlify, not by the client), else a fallback for local runs. */
export const clientIp = (request: Request) => request.headers.get('x-nf-client-connection-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';

/** Failed admin sign-ins per IP. */
export interface LoginAttempts {
  failures(ip: string, sinceMs: number): Promise<number>;
  fail(ip: string): Promise<void>;
}

export function databaseAttempts(db: Queryable): LoginAttempts {
  return {
    async failures(ip, sinceMs) {
      const rows = await db.query<{ n: string }>('select count(*) as n from admin_login_attempts where ip = $1 and at > $2', [ip, new Date(sinceMs).toISOString()]);
      return Number(rows.rows[0]?.n ?? 0);
    },
    async fail(ip) {
      await db.query('insert into admin_login_attempts (ip) values ($1)', [ip]);
      await db.query("delete from admin_login_attempts where at < now() - interval '1 day'");
    },
  };
}

export function memoryAttempts(): LoginAttempts & { list: { ip: string; at: number }[] } {
  const list: { ip: string; at: number }[] = [];
  return {
    list,
    failures: async (ip, sinceMs) => list.filter((a) => a.ip === ip && a.at > sinceMs).length,
    fail: async (ip) => void list.push({ ip, at: Date.now() }),
  };
}
