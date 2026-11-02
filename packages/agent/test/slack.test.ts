import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { allowlist, changeBlocks, signInternal, threadToMessages, verifyInternal, verifySlackRequest } from '../src/index.ts';

const sign = (secret: string, ts: number, body: string) => `v0=${createHmac('sha256', secret).update(`v0:${ts}:${body}`).digest('hex')}`;

describe('Slack request signatures', () => {
  const body = 'token=x&payload=%7B%7D';
  const now = 1_793_500_000_000;
  const ts = Math.floor(now / 1000);
  const h = (sig: string, t = ts) => new Headers({ 'x-slack-signature': sig, 'x-slack-request-timestamp': String(t) });
  it('accepts Slack’s v0 signature and rejects tampering, old timestamps and a missing secret', async () => {
    expect(await verifySlackRequest(h(sign('s', ts, body)), body, 's', now)).toBe(true);
    expect(await verifySlackRequest(h(sign('s', ts, body)), body + 'x', 's', now)).toBe(false);
    expect(await verifySlackRequest(h(sign('s', ts - 600, body), ts - 600), body, 's', now)).toBe(false);
    expect(await verifySlackRequest(h(sign('s', ts, body)), body, undefined, now)).toBe(false);
  });
  it('signs the hand-off to the background function', async () => {
    const sig = await signInternal('s', '{"a":1}');
    expect(await verifyInternal('s', '{"a":1}', sig)).toBe(true);
    expect(await verifyInternal('s', '{"a":2}', sig)).toBe(false);
    expect(await verifyInternal(undefined, '{"a":1}', sig)).toBe(false);
  });
});

describe('thread → model messages', () => {
  it('maps the bot to assistant and people to user, without the mention', () => {
    const msgs = threadToMessages(
      [
        { ts: '1', user: 'U1', text: '<@UBOT> change the venue of the next meetup to Smallpdf' },
        { ts: '2', user: 'UBOT', text: 'Which address?' },
        { ts: '3', user: 'U1', text: 'Steinstrasse 21' },
        { ts: '4', user: 'U2', text: '' },
      ],
      'UBOT',
    );
    expect(msgs).toEqual([
      { role: 'user', content: '<@U1>: change the venue of the next meetup to Smallpdf' },
      { role: 'assistant', content: 'Which address?' },
      { role: 'user', content: '<@U1>: Steinstrasse 21' },
    ]);
  });
});

describe('Block Kit summary', () => {
  it('shows before → after, links, and Publish / Discard buttons per draft', () => {
    const blocks = changeBlocks(
      'Changed the venue.',
      [
        {
          id: 'evt-nov',
          type: 'events',
          slug: 'nov',
          title: 'November',
          created: false,
          fields: [
            { field: 'venue', before: { name: 'Venue AG' }, after: { name: 'Smallpdf AG', street: 'Steinstrasse 21', zip: '8003', city: 'Zürich' } },
            { field: 'location', before: 'Venue AG', after: 'Smallpdf AG' },
          ],
        },
      ],
      { studioUrl: 'https://zurichjs.sanity.studio', previewUrl: 'https://preview.example' },
    ) as { type: string; text?: { text: string }; elements?: { action_id?: string; value?: string; text?: unknown }[] }[];
    const section = blocks.find((b) => b.text?.text.startsWith('*Draft changes'))!;
    expect(section.text!.text).toContain('*Venue:* Venue AG → Smallpdf AG, Steinstrasse 21, 8003 Zürich');
    expect(section.text!.text).not.toContain('legacy');
    const actions = blocks.find((b) => b.type === 'actions')!;
    expect(actions.elements!.map((e) => e.action_id)).toEqual(['publish', 'discard']);
    expect(JSON.parse(actions.elements![0]!.value!)).toEqual({ id: 'evt-nov', type: 'events' });
    expect(JSON.stringify(blocks)).toContain('https://preview.example/events/nov');
  });
  it('parses the publisher allowlist', () => {
    expect([...allowlist('U1, U2  U3')]).toEqual(['U1', 'U2', 'U3']);
    expect(allowlist(undefined).size).toBe(0);
  });
});
