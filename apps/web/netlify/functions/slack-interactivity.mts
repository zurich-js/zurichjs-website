/**
 * Publish / Discard buttons under the agent's replies. Deterministic code, not the model:
 * only SLACK_PUBLISHER_IDS can publish, the readiness check gates it, and Discard removes only
 * the draft. Env: SLACK_SIGNING_SECRET, SLACK_AGENT_BOT_TOKEN, SLACK_AGENT_CHANNEL_ID,
 * SLACK_PUBLISHER_IDS, SANITY_AGENT_TOKEN.
 *
 * Also Confirm and Undo resignation (src/server/membership-slack.ts), on resignation cards and on
 * the member cards under the agent's replies: a Slack app has one interactivity URL, so all land
 * here. Only SLACK_MEMBERSHIP_APPROVER_IDS can press them.
 */
import { allowlist, handleButton, sanityStore, slackApi, verifySlackRequest, type ButtonAction, type ButtonValue, type ButtonValues } from '@zurichjs/agent';
import { siteOrigin } from '../../src/server/auth.ts';
import { memberStore } from '../../src/server/membership-db.ts';
import { handleMembershipClick, isMembershipAction, membershipSlack, parseMemberButton } from '../../src/server/membership-slack.ts';

interface Payload {
  type: string;
  user: { id: string };
  channel?: { id: string };
  message?: { ts: string; thread_ts?: string };
  actions?: { action_id: string; value: string }[];
}

export default async (req: Request, context: { waitUntil?: (p: Promise<unknown>) => void }) => {
  const raw = await req.text();
  if (!(await verifySlackRequest(req.headers, raw, process.env.SLACK_SIGNING_SECRET))) return new Response('Invalid signature', { status: 401 });
  const payload = JSON.parse(new URLSearchParams(raw).get('payload') ?? '{}') as Payload;
  const action = payload.actions?.[0];
  if (payload.type === 'block_actions' && action && isMembershipAction(action.action_id) && payload.channel && payload.message) {
    const env = process.env;
    const { memberId, fromAgent } = parseMemberButton(action.value);
    const click = {
      action: action.action_id,
      memberId,
      fromAgent,
      user: payload.user.id,
      channel: payload.channel.id,
      ts: payload.message.ts,
      threadTs: payload.message.thread_ts ?? payload.message.ts,
    };
    const review = (async () => {
      try {
        const result = await handleMembershipClick(click, { env, store: memberStore(env), slack: membershipSlack(env), origin: siteOrigin(env) });
        console.log(`[membership] ${click.action} on ${click.memberId} by ${click.user}: ${result}`);
      } catch (err) {
        console.error('[membership] review click failed', err);
        await membershipSlack(env)
          .ephemeral(click.channel, click.user, `That did not work (${(err as Error).message}). Nothing changed; try again in a minute.`)
          .catch(() => undefined);
      }
    })();
    if (context?.waitUntil) context.waitUntil(review);
    else await review;
    return new Response(null, { status: 200 });
  }
  if (payload.type !== 'block_actions' || !action || payload.channel?.id !== process.env.SLACK_AGENT_CHANNEL_ID) return new Response(null, { status: 200 });
  if (action.action_id !== 'publish' && action.action_id !== 'discard') return new Response(null, { status: 200 });

  const work = (async () => {
    const env = process.env;
    const slack = slackApi(env);
    const threadTs = payload.message?.thread_ts ?? payload.message?.ts ?? '';
    try {
      const result = await handleButton(
        action.action_id as ButtonAction,
        JSON.parse(action.value) as ButtonValue | ButtonValues,
        payload.user.id,
        allowlist(env.SLACK_PUBLISHER_IDS),
        sanityStore(env),
      );
      await slack.post(payload.channel!.id, threadTs, result.message);
    } catch (err) {
      console.error('[slack-interactivity] failed', err);
      await slack.post(payload.channel!.id, threadTs, `Sorry, that did not work (${(err as Error).message}). Nothing changed on the live site.`);
    }
  })();
  // Slack wants an answer within 3 seconds; finish the work after responding.
  if (context?.waitUntil) context.waitUntil(work);
  else await work;
  return new Response(null, { status: 200 });
};
