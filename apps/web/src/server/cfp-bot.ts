/**
 * The CFP bot's dependencies from the environment (docs/v2/CFP-BOT.md). Used by the
 * slack-cfp-* functions only. It takes nothing from the organiser bot: no SANITY_AGENT_TOKEN, no
 * organiser Slack token, no membership agent. Its credentials:
 *
 *   SLACK_CFP_BOT_TOKEN, SLACK_CFP_SIGNING_SECRET, SLACK_CFP_CHANNEL_ID   the "ZurichJS CFP" app
 *   LLM_PROVIDER, LLM_API_KEY (LLM_BASE_URL), CFP_LLM_MODEL               the cheapest model
 *   DATABASE_URL (MEMBERSHIP_DB_URL locally)                              drafts and limits (cfp_* tables)
 *   SANITY_WRITE_TOKEN / SANITY_TOKEN, SLACK_BOT_TOKEN + SLACK_DEFAULT_CHANNEL
 *       the website form's own: Submit goes through forwardForm('cfp', …), like /cfp
 */
import pg from 'pg';
import { cfpModelFromEnv, cfpSlackApi, postgresCfpStore, type CfpDeps, type Queryable, type SubmitCfpProposal } from '@zurichjs/agent/cfp';
import { forwardForm } from '@zurichjs/integrations';
import type { FormData } from '@zurichjs/forms';
import { membershipUrl } from './db-url.ts';
import type { Env } from './http.ts';

let pool: Queryable | undefined;

/** Same database as the membership store (Neon; the Docker Postgres locally), its own pool. */
export function cfpDb(env: Env): Queryable {
  const url = membershipUrl(env);
  if (!url) throw new Error('DATABASE_URL is not set: the CFP bot keeps its drafts in Postgres');
  pool ??= new pg.Pool({ connectionString: url, max: 2, idleTimeoutMillis: 10_000 }) as unknown as Queryable;
  return pool;
}

/** Submit: the same speaker + pending talkSubmission + organiser note as the website form, "via Slack". */
export const forwardCfp =
  (env: Env, deps: Partial<Parameters<typeof forwardForm>[2]> = {}): SubmitCfpProposal =>
  async ({ data, photo, slackUserId }) => {
    const r = await forwardForm('cfp', data as FormData<'cfp'>, { env, ...deps, ...(photo ? { photo } : {}), via: { slackUserId } });
    if (!r.ok) throw new Error(r.error ?? 'The proposal was not accepted');
    return { id: r.id ?? '' };
  };

export function cfpDeps(env: Env): CfpDeps {
  return {
    store: postgresCfpStore(cfpDb(env)),
    slack: cfpSlackApi(env),
    model: () => cfpModelFromEnv(env),
    submit: forwardCfp(env),
    env,
    log: (m) => console.log(`[slack-cfp] ${m}`),
  };
}
