/**
 * The CFP bot's buttons and its private email field (the "ZurichJS CFP" app's interactivity URL).
 * Deterministic code, not the model: only the person who started a draft can change or send it,
 * and Submit sends it through forwardForm('cfp', …) like the website form.
 * Env: SLACK_CFP_SIGNING_SECRET, SLACK_CFP_CHANNEL_ID, and src/server/cfp-bot.ts.
 */
import { CFP_EMAIL_VIEW, cfpEmailError, handleCfpAction, saveCfpEmail, verifySlackRequest, type CfpDeps } from '@zurichjs/agent/cfp';
import { cfpDeps } from '../../src/server/cfp-bot.ts';

interface Payload {
  type: string;
  team?: { id: string };
  user: { id: string; team_id?: string };
  channel?: { id: string };
  container?: { channel_id?: string };
  response_url?: string;
  trigger_id?: string;
  actions?: { action_id: string; value?: string; selected_option?: { value: string } }[];
  view?: { callback_id?: string; private_metadata?: string; state?: { values?: Record<string, Record<string, { value?: string }>> } };
}

type Context = { waitUntil?: (p: Promise<unknown>) => void };
const log = (m: string) => console.log(`[slack-cfp-interactivity] ${m}`);

export async function handleInteraction(req: Request, context: Context, env: NodeJS.ProcessEnv, make: (env: NodeJS.ProcessEnv) => CfpDeps = cfpDeps): Promise<Response> {
  const raw = await req.text();
  if (!(await verifySlackRequest(req.headers, raw, env.SLACK_CFP_SIGNING_SECRET))) return new Response('Invalid signature', { status: 401 });
  const payload = JSON.parse(new URLSearchParams(raw).get('payload') ?? '{}') as Payload;
  const team = payload.team?.id ?? payload.user.team_id ?? '';
  const later = (work: () => Promise<string>, what: string) => {
    const p = work()
      .then((r) => log(`${what} by ${payload.user.id}: ${r}`))
      .catch((err: Error) => console.error(`[slack-cfp-interactivity] ${what} failed`, err));
    if (context?.waitUntil) context.waitUntil(p);
    return p;
  };

  if (payload.type === 'view_submission' && payload.view?.callback_id === CFP_EMAIL_VIEW) {
    const email = payload.view.state?.values?.email?.value?.value?.trim() ?? '';
    const error = cfpEmailError(email);
    if (error) return Response.json({ response_action: 'errors', errors: { email: error } });
    const p = later(() => saveCfpEmail({ team, user: payload.user.id, email, meta: payload.view?.private_metadata ?? '' }, make(env)), 'email');
    if (!context?.waitUntil) await p;
    return new Response(null, { status: 200 });
  }

  const action = payload.actions?.[0];
  const channel = payload.channel?.id ?? payload.container?.channel_id;
  if (payload.type !== 'block_actions' || !action?.action_id.startsWith('cfp_') || !channel || channel !== env.SLACK_CFP_CHANNEL_ID) return new Response(null, { status: 200 });
  const p = later(
    () =>
      handleCfpAction(
        {
          team,
          user: payload.user.id,
          channel,
          action: action.action_id,
          value: action.value ?? '',
          selected: action.selected_option?.value,
          responseUrl: payload.response_url,
          triggerId: payload.trigger_id,
        },
        make(env),
      ),
    action.action_id,
  );
  // Slack wants an answer within 3 seconds; finish the work after responding.
  if (!context?.waitUntil) await p;
  return new Response(null, { status: 200 });
}

export default (req: Request, context: Context) => handleInteraction(req, context, process.env);
