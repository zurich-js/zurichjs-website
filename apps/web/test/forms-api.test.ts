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

  it('takes a talk proposal with a photo as multipart, and refuses other file types and other forms', async () => {
    const proposal = {
      name: 'Ada',
      email: 'ada@example.com',
      title: 'Typed forms',
      abstract: 'What you learn',
      format: 'Standard',
      level: 'beginner',
      topics: ['TypeScript'],
      jobTitle: 'Engineer',
      bio: 'Writes programs.',
      linkedin: 'https://www.linkedin.com/in/ada',
      agree: true,
    };
    const multipart = (kind: string, file: File) => {
      const body = new FormData();
      body.set('data', JSON.stringify(proposal));
      body.set('photo', file);
      return call(POST, kind, { method: 'POST', body });
    };
    const ok = await multipart('cfp', new File([new Uint8Array([1, 2, 3])], 'ada.jpg', { type: 'image/jpeg' }));
    expect(ok.res.status).toBe(200);
    const gif = await multipart('cfp', new File([new Uint8Array([1])], 'ada.gif', { type: 'image/gif' }));
    expect(gif.res.status).toBe(400);
    expect(gif.body.fields).toEqual({ photo: 'Use a JPEG, PNG or WebP photo.' });
    const big = await multipart('cfp', new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.jpg', { type: 'image/jpeg' }));
    expect(big.res.status).toBe(400);
    const contact = await multipart('contact', new File([new Uint8Array([1])], 'a.jpg', { type: 'image/jpeg' }));
    expect(contact.res.status).toBe(400);
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

  it('accepts a full volunteer application and sends every field to Slack (stubbed)', async () => {
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.invalid/x';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('ok'));
    const { res, body } = await post('volunteer', {
      name: 'Anna Beispiel',
      email: 'anna@example.com',
      linkedinProfile: 'https://www.linkedin.com/in/anna',
      githubProfile: 'anna-b',
      availability: 'other',
      availabilityOther: 'Two evenings a month',
      interests: ['Event organisation', 'Graphic design'],
      message: 'I like the meetups.',
      website_url: '',
    });
    expect(res.status).toBe(200);
    expect(String(body.id)).toMatch(/^volunteer_/);
    const text = String(JSON.parse(String(fetchMock.mock.calls[0]![1]!.body)).text);
    for (const part of [
      'Anna Beispiel',
      'anna@example.com',
      'https://www.linkedin.com/in/anna',
      'anna-b',
      'Other: Two evenings a month',
      'Event organisation, Graphic design',
      'I like the meetups.',
    ])
      expect(text).toContain(part);
    delete process.env.SLACK_WEBHOOK_URL;
  });

  it('answers 400 for a volunteer application without LinkedIn, interests or motivation', async () => {
    const { res, body } = await post('volunteer', { name: 'Anna', email: 'anna@example.com', availability: 'monthly', interests: [] });
    expect(res.status).toBe(400);
    expect(Object.keys(body.fields as object).sort()).toEqual(['interests', 'linkedinProfile', 'message']);
  });
});
