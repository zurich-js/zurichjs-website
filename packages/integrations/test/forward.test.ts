import { describe, expect, it, vi } from 'vitest';
import { forwardForm, postSlack, sanityWriteClient, type TalkProposalSink } from '../src';

const now = () => new Date('2026-11-01T10:00:00Z');

describe('forwardForm without secrets', () => {
  it('succeeds with logged stubs so the site works before integrations are configured', async () => {
    const log = vi.fn();
    const r = await forwardForm('contact', { name: 'Ada', email: 'ada@example.com', topic: 'Other', message: 'Hi' }, { env: {}, log, now, sanity: null });
    expect(r).toEqual({ ok: true, id: expect.stringMatching(/^contact_/) });
    expect(log).toHaveBeenCalledWith(expect.stringContaining('RESEND_API_KEY missing'));
    expect(log).toHaveBeenCalledWith(expect.stringContaining('SLACK_WEBHOOK_URL (or SLACK_BOT_TOKEN + SLACK_DEFAULT_CHANNEL) missing'));
  });
});

describe('talk proposals', () => {
  it('go through the TalkProposalSink seam', async () => {
    const submit = vi.fn(async () => ({ id: 'sub_1' }));
    const sink: TalkProposalSink = { submit };
    const r = await forwardForm(
      'cfp',
      { name: 'Ada', email: 'ada@example.com', title: 'Typed forms', format: 'Lightning talk', abstract: 'A' },
      { env: {}, proposals: sink, log: () => {}, now, sanity: null },
    );
    expect(r).toEqual({ ok: true, id: 'sub_1' });
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ title: 'Typed forms', format: 'Lightning talk', abstract: 'A' }));
  });
});

describe('Slack (webhook or the production bot token)', () => {
  it('posts through the bot API with SLACK_BOT_TOKEN and SLACK_DEFAULT_CHANNEL', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ ok: true }));
    await postSlack({ SLACK_BOT_TOKEN: 'xoxb-1', SLACK_DEFAULT_CHANNEL: 'C1' }, 'New talk proposal');
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe('https://slack.com/api/chat.postMessage');
    expect((init!.headers as Record<string, string>).authorization).toBe('Bearer xoxb-1');
    expect(JSON.parse(String(init!.body))).toMatchObject({ channel: 'C1', text: 'New talk proposal' });
    fetchMock.mockRestore();
  });
  it('treats { ok: false } from the bot API as a failure', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ ok: false, error: 'channel_not_found' }));
    await expect(postSlack({ SLACK_BOT_TOKEN: 'xoxb-1', SLACK_DEFAULT_CHANNEL: 'C1' }, 'x')).rejects.toThrow('channel_not_found');
    fetchMock.mockRestore();
  });
  it('prefers the webhook and only logs when neither is configured', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok'));
    await postSlack({ SLACK_WEBHOOK_URL: 'https://hooks.slack.invalid/x', SLACK_BOT_TOKEN: 'xoxb-1', SLACK_DEFAULT_CHANNEL: 'C1' }, 'x');
    expect(String(fetchMock.mock.calls[0]![0])).toBe('https://hooks.slack.invalid/x');
    fetchMock.mockRestore();
    const log = vi.fn();
    await postSlack({}, 'x', log);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('missing'));
  });
});

describe('Sanity write token', () => {
  it('accepts the production SANITY_TOKEN when SANITY_WRITE_TOKEN is not set', () => {
    expect(sanityWriteClient({})).toBeNull();
    expect(sanityWriteClient({ SANITY_TOKEN: 'sk' })).not.toBeNull();
  });
});
