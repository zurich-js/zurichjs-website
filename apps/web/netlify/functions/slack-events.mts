/**
 * Slack Events API endpoint for the content agent (Slack app: slack/manifest.yml).
 * Verifies Slack's signature, keeps to the organisers' channel, answers within Slack's 3 seconds,
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
  if (!(await verifySlackRequest(req.headers, raw, secret))) return new Response('Invalid signature', { status: 401 });
  const body = JSON.parse(raw) as { type: string; challenge?: string; event?: SlackEvent; event_id?: string };
  if (body.type === 'url_verification') return Response.json({ challenge: body.challenge });
  // Slack retries when we are slow; the first delivery is already being handled.
  if (req.headers.get('x-slack-retry-num')) return new Response(null, { status: 200 });

  const ev = body.event;
  const ok = body.type === 'event_callback' && ev && ev.channel === process.env.SLACK_AGENT_CHANNEL_ID && !ev.bot_id && !ev.subtype;
  const mention = ok && ev.type === 'app_mention';
  const threadReply = ok && ev.type === 'message' && !!ev.thread_ts && ev.thread_ts !== ev.ts;
  if (!mention && !threadReply) return new Response(null, { status: 200 });

  const job = JSON.stringify({ kind: mention ? 'mention' : 'reply', channel: ev.channel, ts: ev.ts, threadTs: ev.thread_ts ?? ev.ts, user: ev.user, text: ev.text ?? '' });
  const url = new URL('/.netlify/functions/slack-agent-background', process.env.URL ?? req.url);
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-agent-signature': await signInternal(secret!, job) }, body: job });
  if (!res.ok) console.error(`[slack-events] background function answered ${res.status}`);
  return new Response(null, { status: 200 });
};
