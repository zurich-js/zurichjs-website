import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleSubscribe } from '../src/pages/api/subscribe';
import { ALL as vereinAll, handleInquiry, parseInquiry } from '../src/pages/api/verein-inquiry';

const req = (data: unknown) =>
  new Request('https://zurichjs.com/api/x', { method: 'POST', headers: { 'content-type': 'application/json' }, body: typeof data === 'string' ? data : JSON.stringify(data) });
const body = async (res: Response) => (await res.json()) as Record<string, unknown>;

describe('POST /api/verein-inquiry', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('answers 405 for other methods', async () => {
    const res = await vereinAll({} as never);
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('POST');
  });

  it.each([
    ['{bad', undefined],
    [{ email: 'a@b.ch' }, 'name'],
    [{ name: 'Anna', email: 'nope' }, 'email'],
    [{ name: '<b>Anna</b>', email: 'a@b.ch' }, 'name'],
    [{ name: 'Anna', email: 'a@b.ch', tier: 'Gold' }, 'tier'],
    [{ name: 'Anna', email: 'a@b.ch', billingCycle: 'weekly' }, 'billingCycle'],
    [{ name: 'Anna', email: 'a@b.ch', message: 'x'.repeat(2001) }, 'message'],
    [{ name: 'Bot', email: 'a@b.ch', website_url: 'http://spam' }, 'website_url'],
  ])('rejects %o', async (input, field) => {
    const res = await handleInquiry(req(input), { env: {}, log: () => {} });
    expect(res.status).toBe(400);
    const b = await body(res);
    expect(b.ok).toBe(false);
    expect(typeof b.error).toBe('string');
    if (field) expect(b.field).toBe(field);
  });

  it('normalises a valid request', () => {
    expect(parseInquiry({ name: ' Anna ', email: 'A@B.CH', tier: 'Supporter', billingCycle: 'yearly', message: '' })).toEqual({
      ok: true,
      data: { name: 'Anna', email: 'a@b.ch', tier: 'Supporter', billingCycle: 'yearly', message: undefined },
    });
  });

  it('succeeds with stub lines when no channel is configured', async () => {
    const lines: string[] = [];
    const res = await handleInquiry(req({ name: 'Anna', email: 'a@b.ch', tier: 'Basic Member', billingCycle: 'quarterly' }), { env: {}, log: (m) => lines.push(m) });
    expect(await body(res)).toEqual({ ok: true });
    expect(lines.some((l) => l.includes('RESEND_API_KEY missing'))).toBe(true);
    expect(lines.some((l) => l.includes('SLACK_WEBHOOK_URL (or SLACK_BOT_TOKEN + SLACK_DEFAULT_CHANNEL) missing'))).toBe(true);
  });

  it('answers 502 when a configured channel fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('no', { status: 500 })),
    );
    const res = await handleInquiry(req({ name: 'Anna', email: 'a@b.ch' }), { env: { SLACK_WEBHOOK_URL: 'https://hooks.slack.com/x' }, log: () => {} });
    expect(res.status).toBe(502);
  });
});

describe('POST /api/subscribe', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());
  const ENV = { EMAIL_OCTOPUS_API_KEY: 'k', EMAIL_OCTOPUS_LIST_ID: 'list-1' };

  it('validates the email and the honeypot', async () => {
    expect((await handleSubscribe(req('{x'), { env: ENV })).status).toBe(400);
    expect((await handleSubscribe(req({ email: 'nope' }), { env: ENV })).status).toBe(400);
    expect((await handleSubscribe(req({ email: 'a@b.ch', website_url: 'x' }), { env: ENV })).status).toBe(400);
  });

  it('logs and saves nothing when EmailOctopus is not configured', async () => {
    const lines: string[] = [];
    const f = vi.fn();
    const res = await handleSubscribe(req({ email: 'anna@b.ch' }), { env: {}, fetch: f as unknown as typeof fetch, log: (m) => lines.push(m) });
    expect(await body(res)).toEqual({ ok: true, subscribed: false });
    expect(f).not.toHaveBeenCalled();
    expect(lines.join()).toMatch(/EMAIL_OCTOPUS_API_KEY or EMAIL_OCTOPUS_LIST_ID missing/);
    expect(lines.join()).not.toContain('anna@');
  });

  it('subscribes through the EmailOctopus 1.6 API', async () => {
    const f = vi.fn(async () => new Response('{}', { status: 200 }));
    const res = await handleSubscribe(req({ email: 'Anna@B.ch' }), { env: ENV, fetch: f as unknown as typeof fetch });
    expect(await body(res)).toEqual({ ok: true, subscribed: true });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://emailoctopus.com/api/1.6/lists/list-1/contacts');
    expect(JSON.parse(String(init.body))).toEqual({ api_key: 'k', email_address: 'anna@b.ch', status: 'SUBSCRIBED' });
  });

  it('treats an existing member as subscribed', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ error: { code: 'MEMBER_EXISTS_WITH_EMAIL_ADDRESS' } }), { status: 409 }));
    const res = await handleSubscribe(req({ email: 'a@b.ch' }), { env: ENV, fetch: f as unknown as typeof fetch });
    expect(await body(res)).toEqual({ ok: true, subscribed: true, already: true });
  });

  it('answers 502 when EmailOctopus fails', async () => {
    const f = vi.fn(async () => new Response('{}', { status: 500 }));
    expect((await handleSubscribe(req({ email: 'a@b.ch' }), { env: ENV, fetch: f as unknown as typeof fetch })).status).toBe(502);
  });
});
