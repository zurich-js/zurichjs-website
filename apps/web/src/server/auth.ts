/**
 * Sign-in for the member portal: Better Auth with an emailed link (no
 * passwords), on the membership database (tables in
 * netlify/database/migrations/20261110120000_auth.sql). The link email is the
 * ZurichJS `login-link` template, sent through Resend.
 *
 * Sessions are httpOnly, secure cookies (7 days, renewed daily). Rate limits are
 * stored in the database (the in-memory default does not work across
 * serverless instances), keyed on Netlify's client IP header.
 *
 * Environment:
 *   BETTER_AUTH_SECRET  32+ random characters; signs cookies and tokens (secret)
 *   BETTER_AUTH_URL     optional; defaults to Netlify's URL (production) or the deploy URL (previews)
 *   NETLIFY_DB_URL      set by Netlify
 */
import { renderEmail } from '@zurichjs/emails';
import { sendMemberEmail } from '@zurichjs/integrations';
import { betterAuth } from 'better-auth';
import { magicLink } from 'better-auth/plugins';
import type { Env } from './http.ts';
import { MembershipUnavailable, membershipDb } from './membership-db.ts';

/** How long a sign-in link works (seconds). Stated in the email. */
export const LINK_SECONDS = 15 * 60;

/** This deploy's origin: BETTER_AUTH_URL, else Netlify's deploy URL (previews) or site URL. */
export const siteOrigin = (env: Env) => env.BETTER_AUTH_URL || (env.CONTEXT === 'production' ? env.URL : env.DEPLOY_PRIME_URL || env.URL) || 'http://localhost:4321';

function createAuth(env: Env) {
  if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32) throw new MembershipUnavailable('BETTER_AUTH_SECRET (32+ characters) is not set');
  const origin = siteOrigin(env);
  return betterAuth({
    appName: 'ZurichJS',
    baseURL: origin,
    basePath: '/api/auth',
    secret: env.BETTER_AUTH_SECRET,
    database: membershipDb(env) as never,
    trustedOrigins: [origin, ...(env.URL && env.URL !== origin ? [env.URL] : [])],
    emailAndPassword: { enabled: false },
    session: { expiresIn: 7 * 86_400, updateAge: 86_400 },
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 60,
      // At most 3 sign-in emails per address and IP in 10 minutes.
      customRules: { '/sign-in/magic-link': { window: 600, max: 3 } },
    },
    advanced: {
      useSecureCookies: origin.startsWith('https://'),
      ipAddress: { ipAddressHeaders: ['x-nf-client-connection-ip'] },
    },
    plugins: [
      magicLink({
        expiresIn: LINK_SECONDS,
        storeToken: 'hashed',
        sendMagicLink: async ({ email, url }) => {
          // Local development without Resend: print the link so you can sign in. Never in production.
          if (!env.RESEND_API_KEY && env.CONTEXT !== 'production' && !env.NETLIFY) console.log(`[auth] sign-in link for ${email}: ${url}`);
          const message = renderEmail('login-link', { url, validMinutes: LINK_SECONDS / 60, firstTime: false });
          await sendMemberEmail(env, { to: email, ...message }, { timeoutMs: 8_000 });
        },
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
let instance: Auth | undefined;

/** The Better Auth instance for this function (created on first use). Throws MembershipUnavailable without its configuration. */
export function auth(env: Env = process.env): Auth {
  instance ??= createAuth(env);
  return instance;
}

export interface AuthUser {
  id: string;
  email: string;
}

/** The signed-in user from the session cookie, or null. Only users who opened their sign-in link (verified email) count. */
export async function sessionUser(request: Request, env: Env = process.env): Promise<AuthUser | null> {
  const session = await auth(env).api.getSession({ headers: request.headers });
  if (!session?.user?.email || !session.user.emailVerified) return null;
  return { id: session.user.id, email: session.user.email.toLowerCase() };
}
