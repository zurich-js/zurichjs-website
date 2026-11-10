/**
 * One agent turn, run as a Netlify Background Function (up to 15 minutes; Slack already got its
 * 200 from slack-events). Reads the thread, runs the model with the draft-only tools, and posts
 * the reply with Publish / Discard buttons. See packages/agent and docs/v2/AUTOMATION.md.
 * Env: SLACK_SIGNING_SECRET, SLACK_AGENT_BOT_TOKEN, SANITY_AGENT_TOKEN, LLM_PROVIDER, LLM_MODEL,
 * LLM_API_KEY (LLM_BASE_URL), SANITY_STUDIO_URL, DRAFT_PREVIEW_URL (optional).
 * With the membership database (DATABASE_URL or MEMBERSHIP_DB_URL), it also answers questions
 * about members (read-only; src/server/membership-agent.ts) and adds cards with buttons.
 */
import { changeBlocks, helpText, isHelpRequest, modelFromEnv, runTurn, sanityStore, slackApi, threadToMessages, verifyInternal } from '@zurichjs/agent';
import { MEMBERSHIP_INSTRUCTIONS, MemberCards, memberCardBlocks, membershipTools } from '../../src/server/membership-agent.ts';
import { memberStore } from '../../src/server/membership-db.ts';

interface Job {
  channel: string;
  ts: string;
  threadTs: string;
  user: string;
  text: string;
}

const log = (m: string) => console.log(`[slack-agent] ${m}`);

export default async (req: Request) => {
  const raw = await req.text();
  if (!(await verifyInternal(process.env.SLACK_SIGNING_SECRET, raw, req.headers.get('x-agent-signature')))) {
    log('rejected: bad internal signature (SLACK_SIGNING_SECRET differs between the two functions?)');
    return new Response('Forbidden', { status: 403 });
  }
  const job = JSON.parse(raw) as Job;
  const env = process.env;
  const started = Date.now();
  log(`mention in ${job.channel} (thread ${job.threadTs}) from ${job.user}`);
  // Everything is inside the try: a failure anywhere is logged and, when Slack is reachable, said in the thread.
  let slack: ReturnType<typeof slackApi> | undefined;
  try {
    slack = slackApi(env);
    const bot = await slack.botUserId();
    const thread = await slack.replies(job.channel, job.threadTs);
    log(`thread has ${thread.length} message(s)`);

    const members = membersOrNull(env);
    if (isHelpRequest(job.text)) {
      // A fixed answer, no model call: always right, instant, and free.
      await slack.post(job.channel, job.threadTs, helpText(!!members));
      log('answered help');
      return new Response(null, { status: 204 });
    }

    await slack.react(job.channel, job.ts, 'eyes');
    const cards = new MemberCards();
    log(`running the model (${env.LLM_PROVIDER ?? 'openai'} ${env.LLM_MODEL ?? '(no LLM_MODEL)'}), membership tools ${members ? 'on' : 'off'}`);
    const { text, changes } = await runTurn({
      model: modelFromEnv(env),
      store: sanityStore(env),
      messages: threadToMessages(thread, bot, job.ts),
      extra: members ? { tools: membershipTools(members, cards), instructions: MEMBERSHIP_INSTRUCTIONS } : undefined,
    });
    const studioUrl = env.SANITY_STUDIO_URL ?? 'https://zurichjs.sanity.studio';
    const memberBlocks = memberCardBlocks(cards.list());
    const blocks = changes.length
      ? [...changeBlocks(text, changes, { studioUrl, previewUrl: env.DRAFT_PREVIEW_URL }), ...memberBlocks]
      : memberBlocks.length
        ? [{ type: 'section', text: { type: 'mrkdwn', text } }, ...memberBlocks]
        : undefined;
    await slack.post(job.channel, job.threadTs, text, blocks);
    log(`replied in ${((Date.now() - started) / 1000).toFixed(1)}s: ${changes.length} draft change(s), ${cards.list().length} member card(s)`);
  } catch (err) {
    console.error('[slack-agent] turn failed', err);
    await slack
      ?.post(job.channel, job.threadTs, `Sorry, something went wrong (${(err as Error).message}). Nothing was published; check the Studio for any half-finished draft.`)
      .catch((e: Error) => log(`could not post the error to Slack either: ${e.message}`));
  }
  return new Response(null, { status: 204 });
};

/** The member store, or null when the membership database is not configured (the content agent still works). */
function membersOrNull(env: NodeJS.ProcessEnv) {
  try {
    return memberStore(env);
  } catch {
    return null;
  }
}
