import { describe, expect, it, vi } from 'vitest';
import { mailpitSendUrl, sendEmail, sendMemberEmail } from '../src/index.ts';

/** Records each request and answers 200, like Resend and Mailpit do. */
function recorder() {
  const calls: { url: string; headers: Record<string, string>; body: Record<string, unknown> }[] = [];
  const fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), headers: init?.headers as Record<string, string>, body: JSON.parse(String(init?.body)) });
    return new Response(JSON.stringify({ id: 'x', ID: 'x' }), { status: 200 });
  });
  return { calls, fetch: fetch as unknown as typeof globalThis.fetch };
}

const email = {
  to: 'ada@example.com',
  subject: 'Your certificate',
  html: '<p>Hi</p>',
  text: 'Hi',
  attachments: [{ filename: 'c.pdf', content: new Uint8Array([37, 80, 68, 70]) }],
};

describe('email delivery', () => {
  it('uses Mailpit only when MAILPIT_URL is a plain address and the site is not production', () => {
    expect(mailpitSendUrl({ MAILPIT_URL: 'http://mail:8025' })).toBe('http://mail:8025/api/v1/send');
    expect(mailpitSendUrl({ MAILPIT_URL: 'http://localhost:8025/' })).toBe('http://localhost:8025/api/v1/send');
    expect(mailpitSendUrl({ MAILPIT_URL: 'http://mail:8025', CONTEXT: 'production' })).toBeUndefined();
    expect(mailpitSendUrl({ MAILPIT_URL: 'http://evil/path' })).toBeUndefined();
    expect(mailpitSendUrl({})).toBeUndefined();
  });

  it("sends a member email in Mailpit's send format, without a Resend key", async () => {
    const r = recorder();
    const out = await sendMemberEmail({ MAILPIT_URL: 'http://mail:8025' }, email, { fetch: r.fetch, idempotencyKey: 'k1' });
    expect(out).toEqual({ sent: true });
    expect(r.calls).toHaveLength(1);
    expect(r.calls[0]!.url).toBe('http://mail:8025/api/v1/send');
    expect(r.calls[0]!.headers.authorization).toBeUndefined();
    expect(r.calls[0]!.body).toEqual({
      From: { Name: 'ZurichJS', Email: 'hello@zurichjs.com' },
      To: [{ Name: '', Email: 'ada@example.com' }],
      Subject: 'Your certificate',
      Text: 'Hi',
      HTML: '<p>Hi</p>',
      Attachments: [{ Filename: 'c.pdf', Content: 'JVBERg==' }],
      Headers: { 'X-Idempotency-Key': 'k1' },
    });
  });

  it('sends a form email to Mailpit with the reply-to address', async () => {
    const r = recorder();
    vi.stubGlobal('fetch', r.fetch);
    try {
      await sendEmail({ MAILPIT_URL: 'http://mail:8025', FORMS_TO: 'board@zurichjs.com' }, 'Contact', 'Hello', 'Grace <grace@example.com>');
    } finally {
      vi.unstubAllGlobals();
    }
    expect(r.calls[0]!.body).toMatchObject({ To: [{ Email: 'board@zurichjs.com' }], ReplyTo: [{ Name: 'Grace', Email: 'grace@example.com' }], Subject: 'Contact', Text: 'Hello' });
  });

  it('sends to Resend in production even when MAILPIT_URL is set', async () => {
    const r = recorder();
    await sendMemberEmail({ MAILPIT_URL: 'http://mail:8025', CONTEXT: 'production', RESEND_API_KEY: 're_test' }, email, { fetch: r.fetch, idempotencyKey: 'k1' });
    expect(r.calls[0]!.url).toBe('https://api.resend.com/emails');
    expect(r.calls[0]!.headers).toMatchObject({ authorization: 'Bearer re_test', 'idempotency-key': 'k1' });
    expect(r.calls[0]!.body).toMatchObject({ from: 'ZurichJS <hello@zurichjs.com>', to: ['ada@example.com'], attachments: [{ filename: 'c.pdf', content: 'JVBERg==' }] });
  });

  it('logs a stub line and sends nothing without Resend or Mailpit', async () => {
    const r = recorder();
    const log = vi.fn();
    expect(await sendMemberEmail({}, email, { fetch: r.fetch, log })).toEqual({ sent: false });
    expect(r.calls).toHaveLength(0);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('***@example.com'));
  });
});
