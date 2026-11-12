/**
 * The CFP bot's Netlify functions end to end: signed Slack events → the background turn → the
 * private confirmation → the Submit button → the same speaker + pending talkSubmission as the
 * website form (through the real forwardForm and sanityTalkProposals, on a fake Sanity client),
 * and the organisers' note "via Slack". Fake Slack and a scripted model; no network.
 */
import { createHmac } from 'node:crypto';
import { forwardForm, sanityTalkProposals } from '@zurichjs/integrations';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CFP_ACTIONS, type CfpDeps } from '@zurichjs/agent/cfp';
import events, { ignoreReason } from '../netlify/functions/slack-cfp-events.mts';
import { runCfpJob } from '../netlify/functions/slack-cfp-background.mts';
import { handleInteraction } from '../netlify/functions/slack-cfp-interactivity.mts';
import { forwardCfp } from '../src/server/cfp-bot.ts';
import { ADA, call, fakeSlack, memoryCfpStore, say, scripted, step } from '../../../packages/agent/test/cfp-fakes.ts';

const SECRET = 'cfp-signing-secret';
const CHANNEL = 'CCFP';
const TEAM = 'T1';
const ADA_ID = 'UADA';

const sign = (body: string, secret = SECRET) => {
  const ts = String(Math.floor(Date.now() / 1000));
  return { 'x-slack-request-timestamp': ts, 'x-slack-signature': `v0=${createHmac('sha256', secret).update(`v0:${ts}:${body}`).digest('hex')}` };
};
const eventRequest = (payload: unknown, secret = SECRET) => {
  const body = JSON.stringify(payload);
  return new Request('https://zurichjs.com/.netlify/functions/slack-cfp-events', { method: 'POST', headers: { 'content-type': 'application/json', ...sign(body, secret) }, body });
};
const interaction = (payload: unknown) => {
  const body = `payload=${encodeURIComponent(JSON.stringify(payload))}`;
  return new Request('https://zurichjs.com/.netlify/functions/slack-cfp-interactivity', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', ...sign(body) },
    body,
  });
};
const mention = (over: Record<string, unknown> = {}) => ({
  type: 'event_callback',
  team_id: TEAM,
  authorizations: [{ user_id: 'UBOT' }],
  event: { type: 'app_mention', channel: CHANNEL, user: ADA_ID, text: '<@UBOT> I’d like to give a talk about testing without mocks', ts: '100.1', ...over },
});

let fetches: { url: string; body: string; headers: Record<string, string> }[];
beforeEach(() => {
  fetches = [];
  vi.stubEnv('SLACK_CFP_SIGNING_SECRET', SECRET);
  vi.stubEnv('SLACK_CFP_CHANNEL_ID', CHANNEL);
  vi.stubEnv('URL', 'https://zurichjs.com');
  vi.stubGlobal('fetch', async (url: string | URL, init: RequestInit = {}) => {
    fetches.push({ url: String(url), body: String(init.body ?? ''), headers: Object.fromEntries(new Headers(init.headers).entries()) });
    if (String(url).includes('slack-edge.com')) return new Response(new Uint8Array([137, 80, 78, 71]), { headers: { 'content-type': 'image/png' } });
    return new Response('{"ok":true}', { status: 202 });
  });
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('slack-cfp-events', () => {
  it('refuses a bad signature (the organiser app’s secret does not work here)', async () => {
    expect((await events(eventRequest(mention(), 'organiser-app-secret'))).status).toBe(401);
    expect(fetches).toEqual([]);
  });

  it('answers Slack’s URL check', async () => {
    const res = await events(eventRequest({ type: 'url_verification', challenge: 'abc' }));
    expect(await res.json()).toEqual({ challenge: 'abc' });
  });

  it('hands a mention to the background function, signed, within the request', async () => {
    expect((await events(eventRequest(mention()))).status).toBe(200);
    expect(fetches).toHaveLength(1);
    expect(fetches[0]!.url).toBe('https://zurichjs.com/.netlify/functions/slack-cfp-background');
    expect(JSON.parse(fetches[0]!.body)).toEqual({ team: TEAM, channel: CHANNEL, ts: '100.1', threadTs: '100.1', user: ADA_ID, text: expect.any(String), mention: true });
    expect(fetches[0]!.headers['x-agent-signature']).toMatch(/^[0-9a-f]{64}$/);
  });

  it('ignores bots, edits, other channels, other workspaces and stray messages', () => {
    const base = mention().event;
    const r = (event: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
      ignoreReason({ type: 'event_callback', team_id: TEAM, authorizations: [{ user_id: 'UBOT' }], event: { ...base, ...event } as never, ...extra }, CHANNEL);
    expect(r({})).toBeNull();
    expect(r({ bot_id: 'B1' })).toMatch(/bot/);
    expect(r({ subtype: 'message_changed' })).toMatch(/edit/);
    expect(r({ channel: 'CORGANISERS' })).toMatch(/channel/);
    expect(r({ user_team: 'T-OTHER' })).toMatch(/another workspace/);
    expect(r({ type: 'message', thread_ts: undefined })).toMatch(/not in a thread/);
    expect(r({ type: 'message', thread_ts: '100.1', ts: '100.2', text: 'Full talk' })).toBeNull();
    expect(r({ type: 'message', thread_ts: '100.1', ts: '100.2', text: '<@UBOT> full talk' })).toMatch(/mention/);
    expect(r({ type: 'reaction_added' })).toMatch(/event/);
    expect(ignoreReason(mention() as never, undefined)).toMatch(/channel/);
  });
});

describe('the whole flow through the functions', () => {
  it('mention → questions → draft → private confirmation → Submit → pending talkSubmission "via Slack"', async () => {
    vi.stubEnv('SLACK_WEBHOOK_URL', 'https://hooks.slack.com/services/organisers');
    const memory = memoryCfpStore();
    const thread = [{ ts: '100.1', user: ADA_ID, text: '<@UBOT> I’d like to give a talk about testing without mocks' }];
    const s = fakeSlack(thread);
    const docs: Record<string, unknown>[] = [];
    const sanity = {
      fetch: async () => null,
      create: async (doc: Record<string, unknown>) => (docs.push(doc), { _id: `${String(doc._type)}-${docs.length}` }),
      assets: { upload: async () => ({ _id: 'image-1', url: 'https://cdn.sanity.io/images/x.png' }) },
    } as unknown as Parameters<typeof sanityTalkProposals>[0];
    let model = scripted([]);
    const make = (env: NodeJS.ProcessEnv): CfpDeps => ({
      store: memory.store,
      slack: s.slack,
      model: () => model,
      submit: forwardCfp(env, { proposals: sanityTalkProposals(sanity) }),
      env,
    });

    // The mention, through the events function, into the background function.
    await events(eventRequest(mention()));
    const handoff = fetches.at(-1)!;
    model = scripted([
      step(
        [call('1', 'updateMyDraft', { title: 'Testing without mocks', abstract: 'How to test against real dependencies, and when mocks still help.', topics: ['Testing'] })],
        'tool-calls',
      ),
      say('Lightning talk (10 minutes) or full talk (20 minutes)? Beginner, intermediate or advanced?'),
    ]);
    expect((await runCfpJob(handoff.body, handoff.headers['x-agent-signature']!, process.env, make)).status).toBe(204);
    expect((await runCfpJob(handoff.body, 'forged', process.env, make)).status).toBe(403);

    // The answer in the thread.
    thread.push({ ts: '100.2', user: 'UBOT', text: 'Lightning or full?' }, { ts: '100.3', user: ADA_ID, text: 'Full talk, intermediate' });
    await events(eventRequest({ ...mention(), event: { type: 'message', channel: CHANNEL, user: ADA_ID, text: 'Full talk, intermediate', ts: '100.3', thread_ts: '100.1' } }));
    model = scripted([
      step([call('2', 'updateMyDraft', { format: 'Standard', level: 'intermediate' })], 'tool-calls'),
      step([call('3', 'submitMyDraft', {})], 'tool-calls'),
      say('Check the message only you can see.'),
    ]);
    const reply = fetches.at(-1)!;
    expect(JSON.parse(reply.body)).toMatchObject({ mention: false, threadTs: '100.1' });
    await runCfpJob(reply.body, reply.headers['x-agent-signature']!, process.env, make);
    expect(s.calls.some((c) => c.method === 'ephemeral' && c.user === ADA_ID)).toBe(true);

    // The buttons.
    const id = [...memory.drafts.keys()][0]!;
    const press = (action_id: string, extra: Record<string, unknown> = {}) =>
      handleInteraction(
        interaction({
          type: 'block_actions',
          team: { id: TEAM },
          user: { id: ADA_ID },
          container: { channel_id: CHANNEL, is_ephemeral: true },
          channel: { id: CHANNEL },
          response_url: 'https://hooks.slack.com/actions/T1/1/x',
          trigger_id: 'trig',
          actions: [{ action_id, value: id, ...extra }],
        }),
        {},
        process.env,
        make,
      );
    await press(CFP_ACTIONS.photo, { selected_option: { value: 'yes' } });
    expect((await press(CFP_ACTIONS.submit)).status).toBe(200);

    const speaker = docs.find((d) => d._type === 'speaker')!;
    const submission = docs.find((d) => d._type === 'talkSubmission')!;
    expect(speaker).toMatchObject({ name: 'Ada Lovelace', email: ADA.email, title: 'Frontend developer', isVisible: false, image: { asset: { _ref: 'image-1' } } });
    expect(submission).toMatchObject({ title: 'Testing without mocks', durationMinutes: 20, level: 'intermediate', tags: ['Testing'], status: 'pending' });
    expect(String(submission.reviewNotes)).toBe(`Submitted via Slack by <@${ADA_ID}>`);
    // The Slack id is nowhere else.
    expect(JSON.stringify(speaker)).not.toContain(ADA_ID);
    expect(JSON.stringify({ ...submission, reviewNotes: undefined })).not.toContain(ADA_ID);

    const note = fetches.find((f) => f.url === 'https://hooks.slack.com/services/organisers');
    expect(JSON.parse(note!.body).text).toMatch(/^New talk proposal via Slack: “Testing without mocks” by Ada Lovelace \(20 min, intermediate, Testing\), with a photo$/);
    expect(JSON.parse(note!.body).text).not.toContain(ADA_ID);

    expect(s.calls.filter((c) => c.method === 'post').at(-1)?.text).toBe('Proposal received. The organisers will be in touch.');
    expect(s.publicText()).not.toContain(ADA.email!);
    expect(memory.drafts.size).toBe(0);
  });

  it('the private email field: invalid input is refused in the modal, valid input is saved', async () => {
    const memory = memoryCfpStore();
    const s = fakeSlack([], { [ADA_ID]: { ...ADA, email: null } });
    const d = await memory.store.create({ team: TEAM, user: ADA_ID, channel: CHANNEL, threadTs: '1.1' });
    const make = (): CfpDeps => ({ store: memory.store, slack: s.slack, model: () => scripted([]), submit: async () => ({ id: 'x' }) });
    const view = (email: string, user = ADA_ID) =>
      interaction({
        type: 'view_submission',
        team: { id: TEAM },
        user: { id: user },
        view: { callback_id: 'cfp_email', private_metadata: JSON.stringify({ draftId: d.id }), state: { values: { email: { value: { value: email } } } } },
      });
    const bad = await handleInteraction(view('nope'), {}, process.env, make);
    expect(await bad.json()).toEqual({ response_action: 'errors', errors: { email: expect.stringMatching(/email address/) } });
    await handleInteraction(view('mallory@example.com', 'UMALLORY'), {}, process.env, make);
    expect(memory.drafts.get(d.id)?.email).toBeNull();
    expect((await handleInteraction(view('ada@example.org'), {}, process.env, make)).status).toBe(200);
    expect(memory.drafts.get(d.id)?.email).toBe('ada@example.org');
  });

  it('ignores buttons from other channels', async () => {
    const res = await handleInteraction(
      interaction({ type: 'block_actions', team: { id: TEAM }, user: { id: ADA_ID }, channel: { id: 'CORGANISERS' }, actions: [{ action_id: CFP_ACTIONS.submit, value: 'x' }] }),
      {},
      process.env,
      () => {
        throw new Error('must not build deps');
      },
    );
    expect(res.status).toBe(200);
  });
});

describe('the public website form cannot claim to be Slack', () => {
  it('a slackUserId in the form data is ignored; only our code sets it', async () => {
    const sent: { slackUserId?: string }[] = [];
    const form = { name: 'Eve', email: 'eve@example.com', title: 'T', abstract: 'A', format: 'Standard', level: 'beginner', topics: ['Testing'], slackUserId: 'UFAKE' };
    await forwardForm('cfp', form as never, { env: {}, proposals: { submit: async (p) => (sent.push(p), { id: 'x' }) }, log: () => {} });
    expect(sent[0]!.slackUserId).toBeUndefined();
    await forwardForm('cfp', form as never, { env: {}, proposals: { submit: async (p) => (sent.push(p), { id: 'x' }) }, via: { slackUserId: 'UREAL1' }, log: () => {} });
    expect(sent[1]!.slackUserId).toBe('UREAL1');
  });
});
