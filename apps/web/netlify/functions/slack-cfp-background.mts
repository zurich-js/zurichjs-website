/**
 * One CFP bot turn, as a Netlify Background Function (Slack already got its 200 from
 * slack-cfp-events). The logic is packages/agent/src/cfp/bot.ts; the dependencies come from
 * src/server/cfp-bot.ts. Env: see there.
 */
import { handleCfpMessage, verifyInternal, type CfpDeps, type CfpJob } from '@zurichjs/agent/cfp';
import { cfpDeps } from '../../src/server/cfp-bot.ts';

const log = (m: string) => console.log(`[slack-cfp] ${m}`);

/** Runs one job; `deps` is replaced in tests. */
export async function runCfpJob(raw: string, signature: string | null, env: NodeJS.ProcessEnv, make: (env: NodeJS.ProcessEnv) => CfpDeps = cfpDeps): Promise<Response> {
  if (!(await verifyInternal(env.SLACK_CFP_SIGNING_SECRET, raw, signature))) {
    log('rejected: bad internal signature');
    return new Response('Forbidden', { status: 403 });
  }
  const job = JSON.parse(raw) as CfpJob;
  let deps: CfpDeps | undefined;
  try {
    deps = make(env);
    log(`${job.mention ? 'mention' : 'reply'} in ${job.channel} (thread ${job.threadTs}): ${await handleCfpMessage(job, deps)}`);
  } catch (err) {
    console.error('[slack-cfp] turn failed', err);
    await deps?.slack
      .post(job.channel, job.threadTs, 'Sorry, something went wrong on my side. Your draft is kept; try again in a minute.')
      .catch((e: Error) => log(`could not post the error to Slack either: ${e.message}`));
  }
  return new Response(null, { status: 204 });
}

export default async (req: Request) => runCfpJob(await req.text(), req.headers.get('x-agent-signature'), process.env);
