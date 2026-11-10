import { sendMemberEmail } from '@zurichjs/integrations';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startMockResend, type MockResend } from './mock-resend.mjs';

describe('mock Resend (local mail viewer)', () => {
  let mock: MockResend;
  beforeAll(async () => {
    mock = await startMockResend(0);
  });
  afterAll(() => mock.close());

  it('receives the site’s emails through RESEND_API_BASE, once per idempotency key, with attachments', async () => {
    const env = { RESEND_API_KEY: 're_local', RESEND_API_BASE: mock.url };
    const email = { to: 'ada@example.com', subject: 'Welcome', html: '<p>Hi</p>', text: 'Hi', attachments: [{ filename: 'c.pdf', content: new Uint8Array([37, 80, 68, 70]) }] };
    await sendMemberEmail(env, email, { idempotencyKey: 'k1' });
    await sendMemberEmail(env, email, { idempotencyKey: 'k1' });
    expect(mock.emails).toHaveLength(1);
    expect(mock.emails[0]).toMatchObject({ to: ['ada@example.com'], subject: 'Welcome', attachments: [{ filename: 'c.pdf' }] });
    const list = await (await fetch(`${mock.url}/`)).text();
    expect(list).toContain('Welcome');
    const pdf = await fetch(`${mock.url}/view/${mock.emails[0]!.id}/attachments/0`);
    expect(pdf.headers.get('content-type')).toBe('application/pdf');
    expect(Buffer.from(await pdf.arrayBuffer()).toString()).toBe('%PDF');
  });

  it('is ignored in production: the key only ever goes to Resend', async () => {
    const { resendEmailsUrl } = await import('@zurichjs/integrations');
    expect(resendEmailsUrl({ RESEND_API_BASE: mock.url, CONTEXT: 'production' })).toBe('https://api.resend.com/emails');
    expect(resendEmailsUrl({ RESEND_API_BASE: 'http://mail:4535' })).toBe('http://mail:4535/emails');
    expect(resendEmailsUrl({ RESEND_API_BASE: 'http://evil/path' })).toBe('https://api.resend.com/emails');
  });
});
