/**
 * Slack Events API endpoint for the CFP bot, the second Slack app "ZurichJS CFP"
 * (slack/manifest.cfp.yml; docs/v2/CFP-BOT.md). Verifies Slack's signature with the CFP app's own
 * secret, keeps to #cfp, ignores bots, edits and people from other workspaces, answers within
 * Slack's 3 seconds and hands the work to slack-cfp-background.
 * Env: SLACK_CFP_SIGNING_SECRET, SLACK_CFP_CHANNEL_ID.
 */
import { signInternal, verifySlackRequest } from '@zurichjs/agent/cfp';

interface SlackEvent {
  type: string;
  subtype?: string;
  bot_id?: string;
  channel?: string;
  user?: string;
  /** The poster's workspace (differs for people in a shared Slack Connect channel). */
  user_team?: string;
  team?: string;
  text?: string;
  ts: string;
  thread_ts?: string;
}

interface Body {
  type: string;
  challenge?: string;
  team_id?: string;
  event?: SlackEvent;
  authorizations?: { user_id?: string }[];
}

const log = (m: string) => console.log(`[slack-cfp-events] ${m}`);

/** Why this event is not for the CFP bot, or null when it is. */
export function ignoreReason(body: Body, channel: string | undefined): string | null {
  const ev = body.event;
  if (body.type !== 'event_callback' || !ev) return 'no event';
  if (ev.type !== 'app_mention' && ev.type !== 'message') return `event ${ev.type}`;
  if (!channel || ev.channel !== channel) return 'not the CFP channel';
  if (ev.bot_id || ev.subtype || !ev.user) return 'a bot message, an edit or a system message';
  const team = body.team_id;
  if (!team || (ev.user_team && ev.user_team !== team) || (ev.team && ev.team !== team)) return 'another workspace';
  if (ev.type === 'message') {
    // A plain message counts only as a reply in a thread; a mention arrives again as app_mention.
    if (!ev.thread_ts || ev.thread_ts === ev.ts) return 'not in a thread';
    const bot = body.authorizations?.[0]?.user_id;
    if (bot && ev.text?.includes(`<@${bot}>`)) return 'handled as the mention';
  }
  return null;
}

export default async (req: Request) => {
  const secret = process.env.SLACK_CFP_SIGNING_SECRET;
  const raw = await req.text();
  if (!(await verifySlackRequest(req.headers, raw, secret))) {
    log("rejected: invalid signature (is SLACK_CFP_SIGNING_SECRET the CFP app's?)");
    return new Response('Invalid signature', { status: 401 });
  }
  const body = JSON.parse(raw) as Body;
  if (body.type === 'url_verification') return Response.json({ challenge: body.challenge });
  // Slack retries when we are slow; the first delivery is already being handled.
  if (req.headers.get('x-slack-retry-num')) return new Response(null, { status: 200 });

  const why = ignoreReason(body, process.env.SLACK_CFP_CHANNEL_ID);
  if (why) {
    log(`${body.event?.type ?? body.type} ignored: ${why}`);
    return new Response(null, { status: 200 });
  }
  const ev = body.event!;
  const job = JSON.stringify({
    team: body.team_id,
    channel: ev.channel,
    ts: ev.ts,
    threadTs: ev.thread_ts ?? ev.ts,
    user: ev.user,
    text: (ev.text ?? '').slice(0, 4000),
    mention: ev.type === 'app_mention',
  });
  const url = new URL('/.netlify/functions/slack-cfp-background', process.env.URL ?? req.url);
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-agent-signature': await signInternal(secret!, job) }, body: job });
  log(`${ev.type} handed to the CFP bot (${url.pathname} → ${res.status})`);
  return new Response(null, { status: 200 });
};
