/**
 * One agent turn, run as a Netlify Background Function (up to 15 minutes; Slack already got its
 * 200 from slack-events). Reads the thread, runs the model with the draft-only tools, and posts
 * the reply with Publish / Discard buttons. See packages/agent and docs/v2/AUTOMATION.md.
 * Env: SLACK_SIGNING_SECRET, SLACK_AGENT_BOT_TOKEN, SANITY_AGENT_TOKEN, LLM_PROVIDER, LLM_MODEL,
 * LLM_API_KEY (LLM_BASE_URL), SANITY_STUDIO_URL, DRAFT_PREVIEW_URL (optional).
 */
import { changeBlocks, modelFromEnv, runTurn, sanityStore, slackApi, threadToMessages, verifyInternal } from '@zurichjs/agent';

interface Job {
  kind: 'mention' | 'reply';
  channel: string;
  ts: string;
  threadTs: string;
  user: string;
  text: string;
}

export default async (req: Request) => {
  const raw = await req.text();
  if (!(await verifyInternal(process.env.SLACK_SIGNING_SECRET, raw, req.headers.get('x-agent-signature')))) return new Response('Forbidden', { status: 403 });
  const job = JSON.parse(raw) as Job;
  const env = process.env;
  const slack = slackApi(env);
  const bot = await slack.botUserId();
  const thread = await slack.replies(job.channel, job.threadTs);

  if (job.kind === 'reply') {
    // Thread replies count only in threads the bot is part of, and not when they mention it (app_mention covers those).
    const botInThread = thread.some((m) => m.user === bot || m.bot_id);
    if (!botInThread || job.text.includes(`<@${bot}>`)) return new Response(null, { status: 204 });
  }

  await slack.react(job.channel, job.ts, 'eyes');
  try {
    const { text, changes } = await runTurn({ model: modelFromEnv(env), store: sanityStore(env), messages: threadToMessages(thread, bot) });
    const studioUrl = env.SANITY_STUDIO_URL ?? 'https://zurichjs.sanity.studio';
    await slack.post(job.channel, job.threadTs, text, changes.length ? changeBlocks(text, changes, { studioUrl, previewUrl: env.DRAFT_PREVIEW_URL }) : undefined);
  } catch (err) {
    console.error('[slack-agent] turn failed', err);
    await slack.post(job.channel, job.threadTs, `Sorry, something went wrong (${(err as Error).message}). Nothing was published; check the Studio for any half-finished draft.`);
  }
  return new Response(null, { status: 204 });
};
