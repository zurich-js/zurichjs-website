/**
 * Slack Events API endpoint for the content agent (Slack app: slack/manifest.yml).
 * Verifies Slack's signature, keeps to the organisers' channel, acts only on @mentions (also in
 * threads), answers within Slack's 3 seconds,
 * and hands the work to slack-agent-background. Env: SLACK_SIGNING_SECRET, SLACK_AGENT_CHANNEL_ID.
 */
import { signInternal, verifySlackRequest } from '@zurichjs/agent';

interface SlackEvent {
  type: string;
  subtype?: string;
  bot_id?: string;
  channel?: string;
  user?: string;
  text?: string;
  ts: string;
  thread_ts?: string;
}

export default async (req: Request) => {
  const secret = process.env.SLACK_SIGNING_SECRET;
  const raw = await req.text();
  if (!(await verifySlackRequest(req.headers, raw, secret))) {
    console.log("[slack-events] rejected: invalid signature (is SLACK_SIGNING_SECRET this app's?)");
    return new Response('Invalid signature', { status: 401 });
  }
  const body = JSON.parse(raw) as { type: string; challenge?: string; event?: SlackEvent; event_id?: string };
  if (body.type === 'url_verification') return Response.json({ challenge: body.challenge });
  // Slack retries when we are slow; the first delivery is already being handled.
  if (req.headers.get('x-slack-retry-num')) return new Response(null, { status: 200 });

  // Only an explicit @mention starts the bot, in the channel and in threads alike. Thread replies
  // without a mention are people talking to each other: the bot reads them as context when it is
  // next mentioned, but never acts on them (owner, 10th November 2026).
  const ev = body.event;
  const mention = body.type === 'event_callback' && ev?.type === 'app_mention' && ev.channel === process.env.SLACK_AGENT_CHANNEL_ID && !ev.bot_id && !ev.subtype;
  if (!mention) {
    const why = !ev
      ? 'no event'
      : ev.type !== 'app_mention'
        ? 'not a mention'
        : ev.channel !== process.env.SLACK_AGENT_CHANNEL_ID
          ? `channel ${ev.channel} is not SLACK_AGENT_CHANNEL_ID`
          : 'a bot message or edit';
    console.log(`[slack-events] ${ev?.type ?? body.type} ignored: ${why}`);
    return new Response(null, { status: 200 });
  }

  const job = JSON.stringify({ channel: ev.channel, ts: ev.ts, threadTs: ev.thread_ts ?? ev.ts, user: ev.user, text: ev.text ?? '' });
  const url = new URL('/.netlify/functions/slack-agent-background', process.env.URL ?? req.url);
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-agent-signature': await signInternal(secret!, job) }, body: job });
  console.log(`[slack-events] mention handed to the agent (${url.pathname} → ${res.status})`);
  if (!res.ok) console.error(`[slack-events] background function answered ${res.status}`);
  return new Response(null, { status: 200 });
};
