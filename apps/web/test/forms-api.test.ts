import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ALL, POST } from '../src/pages/api/forms/[kind].ts';

type Ctx = Parameters<typeof POST>[0];
const SECRETS = ['SANITY_WRITE_TOKEN', 'RESEND_API_KEY', 'SLACK_WEBHOOK_URL'];

const call = async (handler: typeof POST, kind: string, init: RequestInit = {}) => {
  const request = new Request(`https://zurichjs.com/api/forms/${kind}`, init);
  const res = await handler({ params: { kind }, request } as unknown as Ctx);
  return { res, body: (await res.json()) as Record<string, unknown> };
};
const post = (kind: string, data: unknown) =>
  call(POST, kind, { method: 'POST', headers: { 'content-type': 'application/json' }, body: typeof data === 'string' ? data : JSON.stringify(data) });

describe('/api/forms/[kind]', () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of SECRETS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    for (const k of SECRETS) if (saved[k] !== undefined) process.env[k] = saved[k];
    vi.restoreAllMocks();
  });

  it('answers 405 with an Allow header for GET', async () => {
    const { res, body } = await call(ALL, 'contact', { method: 'GET' });
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('POST');
    expect(body.ok).toBe(false);
  });

  it('answers 404 for an unknown kind', async () => {
    const { res, body } = await post('checkout', { eventId: 'x' });
    expect(res.status).toBe(404);
    expect(body).toEqual({ ok: false, error: 'Unknown form' });
  });

  it('answers 400 for invalid JSON', async () => {
    const { res, body } = await post('contact', '{not json');
    expect(res.status).toBe(400);
    expect(body.ok).toBe(false);
  });

  it('answers 400 with field errors when required fields are missing', async () => {
    const { res, body } = await post('contact', { name: 'Anna', email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(typeof body.error).toBe('string');
    expect(Object.keys(body.fields as object).sort()).toEqual(['email', 'message', 'topic']);
  });

  it('rejects a filled honeypot', async () => {
    const { res, body } = await post('contact', { name: 'Bot', email: 'bot@example.com', topic: 'General question', message: 'Hi', website_url: 'http://spam.example' });
    expect(res.status).toBe(400);
    expect(body.fields).toHaveProperty('website_url');
  });

  it('accepts a valid contact message with no secrets set', async () => {
    const { res, body } = await post('contact', { name: 'Anna Beispiel', email: 'anna@example.com', topic: 'General question', message: 'Hello there', website_url: '' });
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(String(body.id)).toMatch(/^contact_/);
  });

  it('answers 502 when a configured channel fails', async () => {
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.invalid/x';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('nope', { status: 500 }));
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { res, body } = await post('contact', { name: 'Anna', email: 'anna@example.com', topic: 'Speaking', message: 'Hi' });
    expect(res.status).toBe(502);
    expect(body.ok).toBe(false);
    expect(err).toHaveBeenCalled();
    delete process.env.SLACK_WEBHOOK_URL;
  });
});
