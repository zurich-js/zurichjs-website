/**
 * The "your talk is scheduled" email as sent: one per speaker through Resend, an idempotency key
 * per proposal, event and speaker (a second press is a no-op at Resend), replies to the
 * organisers, the private profile link from profile-token.ts, and only what Sanity has.
 */
import type { ScheduledTalk } from '@zurichjs/agent';
import { describe, expect, it } from 'vitest';
import { profileSpeaker } from '../src/server/profile-token.ts';
import { sendTalkScheduledEmails, talkScheduledKey, talkScheduledProps } from '../src/server/talk-scheduled.ts';

const env = { RESEND_API_KEY: 're_test', JWT_SECRET: 'jwt-secret-for-tests', FORMS_TO: 'board@zurichjs.com' };
const talk: ScheduledTalk = {
  submissionId: 'p1',
  eventId: 'evt-nov',
  talkId: 'talk-1',
  talkTitle: 'Signals in practice',
  eventTitle: 'Forms, types and design systems',
  eventSlug: 'zurichjs-meetup-november-2026',
  speakers: [
    { id: 'spk-ada', slug: 'ada-lovelace', name: 'Ada Lovelace', email: 'ada@example.com' },
    { id: 'spk-grace', slug: 'grace-hopper', name: 'Grace Hopper', email: 'grace@example.com' },
  ],
  date: 'Wed 18th Nov 2026',
  time: 'Starts 18:30 CET',
  venue: 'Venue AG, Hardstrasse 201, 8005 Zürich',
  reviewNotes: 'Private notes',
};

function resend() {
  const calls: { headers: Record<string, string>; body: Record<string, unknown> }[] = [];
  const fetch = (async (_url: string, init: RequestInit) => {
    calls.push({ headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) });
    return new Response('{"id":"e1"}');
  }) as typeof globalThis.fetch;
  return { calls, fetch };
}

describe('talk-scheduled email', () => {
  it('sends one email per speaker, with an idempotency key per proposal, event and speaker, replies to the organisers', async () => {
    const r = resend();
    const out = await sendTalkScheduledEmails(talk, talk.speakers, { env, origin: 'https://zurichjs.com', fetch: r.fetch });
    expect(out.map((o) => [o.speaker.id, o.sent])).toEqual([
      ['spk-ada', true],
      ['spk-grace', true],
    ]);
    expect(r.calls.map((c) => c.headers['idempotency-key'])).toEqual(['talk-scheduled:p1:evt-nov:spk-ada', 'talk-scheduled:p1:evt-nov:spk-grace']);
    expect(r.calls[0]!.body).toMatchObject({ to: ['ada@example.com'], reply_to: 'board@zurichjs.com', subject: 'Your talk is on Forms, types and design systems' });
    expect(talkScheduledKey(talk, talk.speakers[0]!)).toBe(talkScheduledKey({ submissionId: 'p1', eventId: 'evt-nov' }, { id: 'spk-ada' }));
    // A second press sends the same key, so Resend sends nothing new.
    await sendTalkScheduledEmails(talk, talk.speakers.slice(0, 1), { env, origin: 'https://zurichjs.com', fetch: r.fetch });
    expect(r.calls[2]!.headers['idempotency-key']).toBe(r.calls[0]!.headers['idempotency-key']);
  });

  it('replies to hello@zurichjs.com when FORMS_TO is not set', async () => {
    const r = resend();
    await sendTalkScheduledEmails(talk, talk.speakers.slice(0, 1), { env: { RESEND_API_KEY: 're_test' }, origin: 'https://zurichjs.com', fetch: r.fetch });
    expect(r.calls[0]!.body.reply_to).toBe('hello@zurichjs.com');
  });

  it('uses only the Sanity facts, the event page and a working private profile link', () => {
    const props = talkScheduledProps(talk, talk.speakers[0]!, { env, origin: 'https://zurichjs.com/' });
    expect(props).toMatchObject({
      speakerName: 'Ada Lovelace',
      talkTitle: 'Signals in practice',
      eventTitle: 'Forms, types and design systems',
      date: 'Wed 18th Nov 2026',
      time: 'Starts 18:30 CET',
      venue: 'Venue AG, Hardstrasse 201, 8005 Zürich',
      eventUrl: 'https://zurichjs.com/events/zurichjs-meetup-november-2026',
    });
    const token = new URL(props.profileUrl!).searchParams.get('token');
    expect(props.profileUrl).toMatch(/^https:\/\/zurichjs\.com\/speakers\/profile\?token=/);
    expect(profileSpeaker(token, env)).toBe('ada-lovelace');
    expect(JSON.stringify(props)).not.toContain('Private notes');
  });

  it('leaves out what is missing: no profile link without JWT_SECRET, the details said to follow', async () => {
    const props = talkScheduledProps({ ...talk, date: null, time: null, venue: null, eventSlug: null }, talk.speakers[0]!, { env: {}, origin: 'https://zurichjs.com' });
    expect(props).toMatchObject({ date: null, time: null, venue: null, profileUrl: null, eventUrl: 'https://zurichjs.com/events' });
    const r = resend();
    await sendTalkScheduledEmails({ ...talk, date: null, time: null, venue: null }, talk.speakers.slice(0, 1), { env, origin: 'https://zurichjs.com', fetch: r.fetch });
    expect(String(r.calls[0]!.body.text)).toContain("We'll confirm the details soon.");
  });

  it('does not send, and says so, without RESEND_API_KEY', async () => {
    const r = resend();
    const lines: string[] = [];
    const out = await sendTalkScheduledEmails(talk, talk.speakers.slice(0, 1), { env: {}, origin: 'https://zurichjs.com', fetch: r.fetch, log: (m) => lines.push(m) });
    expect(out[0]!.sent).toBe(false);
    expect(r.calls).toEqual([]);
    expect(lines.join()).not.toContain('ada@example.com');
  });
});
