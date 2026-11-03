import { describe, expect, it, vi } from 'vitest';
import { blueskyUrl, forwardForm, postSlack, sanityWriteClient, volunteerMessage, type TalkProposalSink } from '../src/index.ts';

describe('volunteer applications', () => {
  const now = () => new Date('2026-11-02T10:00:00Z');
  const application = {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    linkedinProfile: 'https://www.linkedin.com/in/ada',
    githubProfile: 'ada-l',
    availability: 'events' as const,
    availabilityOther: '',
    interests: ['Partnership and speaker outreach' as const, 'Platform development' as const],
    message: 'I want to help the community grow.',
  };
  const every = [
    'Ada Lovelace',
    'Email: ada@example.com',
    'LinkedIn: https://www.linkedin.com/in/ada',
    'GitHub: ada-l',
    'Availability: Only during events',
    'Interests: Partnership and speaker outreach, Platform development',
    'I want to help the community grow.',
  ];

  it('send every field to the organisers by email and Slack (stubbed fetch)', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => Response.json({ ok: true }));
    const env = { RESEND_API_KEY: 're_test', SLACK_BOT_TOKEN: 'xoxb-1', SLACK_DEFAULT_CHANNEL: 'C1' };
    const r = await forwardForm('volunteer', application, { env, now, sanity: null });
    expect(r).toEqual({ ok: true, id: expect.stringMatching(/^volunteer_/) });
    const bodies = Object.fromEntries(fetchMock.mock.calls.map(([url, init]) => [String(url), JSON.parse(String(init!.body)) as Record<string, unknown>]));
    const email = bodies['https://api.resend.com/emails']!;
    const slack = bodies['https://slack.com/api/chat.postMessage']!;
    expect(email).toMatchObject({ subject: 'New volunteer application from Ada Lovelace', reply_to: 'ada@example.com' });
    for (const part of every) {
      expect(String(email.text), part).toContain(part);
      expect(String(slack.text), part).toContain(part);
    }
    fetchMock.mockRestore();
  });
  it('include the "Other" availability text and say when GitHub was left out', () => {
    const { text } = volunteerMessage({ ...application, githubProfile: '', availability: 'other', availabilityOther: 'Two Saturdays a month' });
    expect(text).toContain('Availability: Other: Two Saturdays a month');
    expect(text).toContain('GitHub: not given');
  });
  it('log stub lines without secrets and store nothing in Sanity', async () => {
    const log = vi.fn();
    const r = await forwardForm('volunteer', application, { env: {}, log, now, sanity: null });
    expect(r.ok).toBe(true);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('RESEND_API_KEY missing'));
  });
});

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

describe('talk proposals in Sanity (stubbed client, nothing is written)', () => {
  const full = {
    name: 'Ada Lovelace',
    email: 'Ada@Example.com',
    jobTitle: 'Engineer',
    bio: 'Writes programs.',
    linkedin: 'linkedin.com/in/ada',
    github: '@ada',
    twitter: 'https://twitter.com/ada',
    title: 'Typed forms',
    abstract: 'What you learn',
    format: 'Lightning',
    level: 'beginner',
    topics: ['TypeScript', 'Testing'],
    firstTalk: true,
  };
  const fake = (existing: string | null) => {
    const create = vi.fn(async (doc: Record<string, unknown>) => ({ _id: doc._type === 'speaker' ? 'sp-new' : 'sub-1', ...doc }));
    const fetch = vi.fn(async () => existing);
    const patch = vi.fn();
    return { client: { create, fetch, patch } as never, create, fetch, patch };
  };

  it('creates a hidden speaker with the profile and a pending submission with length, level and topics', async () => {
    const s = fake(null);
    const r = await forwardForm('cfp', full, { env: {}, sanity: s.client, now, log: () => {} });
    expect(r).toEqual({ ok: true, id: 'sub-1' });
    const [speaker, submission] = s.create.mock.calls.map((c) => c[0]);
    expect(speaker).toMatchObject({
      _type: 'speaker',
      name: 'Ada Lovelace',
      email: 'Ada@Example.com',
      title: 'Engineer',
      bio: 'Writes programs.',
      linkedin: 'https://linkedin.com/in/ada',
      github: 'https://github.com/ada',
      twitter: 'https://twitter.com/ada',
      isVisible: false,
    });
    expect(submission).toMatchObject({
      _type: 'talkSubmission',
      title: 'Typed forms',
      description: 'What you learn',
      durationMinutes: 5,
      level: 'beginner',
      tags: ['TypeScript', 'Testing'],
      speakers: [{ _type: 'reference', _ref: 'sp-new' }],
      status: 'pending',
      firstTalk: true,
      reviewNotes: 'First talk: offer help preparing.',
    });
  });
  it('never changes an existing speaker: what they sent goes into the review notes', async () => {
    const s = fake('sp-ada');
    await forwardForm('cfp', { ...full, firstTalk: false, returning: true }, { env: {}, sanity: s.client, now, log: () => {} });
    expect(s.create).toHaveBeenCalledTimes(1);
    expect(s.patch).not.toHaveBeenCalled();
    const submission = s.create.mock.calls[0]![0];
    expect(submission.speakers).toEqual([expect.objectContaining({ _ref: 'sp-ada' })]);
    expect(submission.reviewNotes).toContain('The speaker page was NOT changed');
    expect(submission.reviewNotes).toContain('job title: Engineer');
  });
  it('saves Bluesky, company and website on a new speaker under the Sanity field names', async () => {
    const s = fake(null);
    await forwardForm('cfp', { ...full, bluesky: '@ada.bsky.social', company: 'Analytical Engines', website: 'ada.dev' }, { env: {}, sanity: s.client, now, log: () => {} });
    expect(s.create.mock.calls[0]![0]).toMatchObject({ bluesky: 'https://bsky.app/profile/ada.bsky.social', company: 'Analytical Engines', website: 'https://ada.dev/' });
  });
  it('a photo sent with the proposal becomes a new speaker’s image, and waits in the notes for an existing one', async () => {
    const photo = { bytes: new Uint8Array([1, 2, 3]), name: 'ada.jpg', type: 'image/jpeg' };
    const withAssets = (existing: string | null) => {
      const s = fake(existing);
      const upload = vi.fn(async () => ({ _id: 'image-abc', url: 'https://cdn.sanity.io/images/x/y/abc.jpg' }));
      return { ...s, upload, client: { ...(s.client as object), assets: { upload } } as never };
    };
    const fresh = withAssets(null);
    await forwardForm('cfp', full, { env: {}, sanity: fresh.client, now, log: () => {}, photo });
    expect(fresh.upload).toHaveBeenCalledWith('image', expect.anything(), { filename: 'ada.jpg', contentType: 'image/jpeg' });
    expect(fresh.create.mock.calls[0]![0].image).toEqual({ _type: 'image', asset: { _type: 'reference', _ref: 'image-abc' } });
    const known = withAssets('sp-ada');
    await forwardForm('cfp', { ...full, returning: true }, { env: {}, sanity: known.client, now, log: () => {}, photo });
    expect(known.patch).not.toHaveBeenCalled();
    expect(known.create.mock.calls[0]![0].reviewNotes).toContain('New photo sent with this proposal (not on the speaker page yet): https://cdn.sanity.io/images/x/y/abc.jpg');
  });
  it('turns Bluesky handles and links into profile links', () => {
    expect(blueskyUrl('@ada.bsky.social')).toBe('https://bsky.app/profile/ada.bsky.social');
    expect(blueskyUrl('ada.dev')).toBe('https://bsky.app/profile/ada.dev');
    expect(blueskyUrl('https://bsky.app/profile/ada.bsky.social')).toBe('https://bsky.app/profile/ada.bsky.social');
    expect(blueskyUrl('not a handle')).toBeUndefined();
  });
  it('flags a returning speaker whose email matches no speaker', async () => {
    const s = fake(null);
    await forwardForm('cfp', { ...full, firstTalk: false, returning: true }, { env: {}, sanity: s.client, now, log: () => {} });
    expect(s.create.mock.calls[1]![0].reviewNotes).toContain('no speaker has this email');
  });
  it('tells Slack the length, level and topics (Slack stubbed)', async () => {
    const log = vi.fn();
    await forwardForm('cfp', full, { env: {}, sanity: null, now, log });
    expect(log).toHaveBeenCalledWith(expect.stringContaining('5 min, beginner, TypeScript, Testing'));
  });
});

describe('profile links', () => {
  it('turns handles and bare links into https URLs, and drops what is not a link', async () => {
    const { profileUrl } = await import('../src/index.ts');
    expect(profileUrl('@ada', 'https://x.com/')).toBe('https://x.com/ada');
    expect(profileUrl('github.com/ada', 'https://github.com/')).toBe('https://github.com/ada');
    expect(profileUrl('http://example.com/ada', 'https://github.com/')).toBe('https://example.com/ada');
    expect(profileUrl('javascript:alert(1)', 'https://github.com/')).toBeUndefined();
    expect(profileUrl('two words', 'https://github.com/')).toBeUndefined();
    expect(profileUrl('  ', 'https://github.com/')).toBeUndefined();
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

describe('talk ratings (one per person, talk and speaker)', () => {
  const lookup = { event: 'ev1', talk: 't1', inEvent: true, speaker: 'sp-ada', speakers: ['sp-ada', 'sp-grace'] };
  const fakeSanity = (dup: string | null, found: object = lookup) => {
    const create = vi.fn(async (doc: Record<string, unknown>) => ({ _id: 'fb1', ...doc }));
    const fetch = vi.fn(async (q: string) => (q.includes('"inEvent"') ? found : dup));
    return { client: { create, fetch } as never, create, fetch };
  };
  const rating = { eventId: 'ev1', target: 't1:ada', talkId: 't1', speakerId: 'ada', stars: 5, note: 'Great' };
  const client = { ip: '203.0.113.9', headers: { 'user-agent': 'UA' } };

  it('stores event, talk and speaker references with hashed client info', async () => {
    const s = fakeSanity(null);
    const r = await forwardForm('rating', rating, { env: {}, sanity: s.client, now, client });
    expect(r).toEqual({ ok: true, id: 'fb1' });
    const doc = s.create.mock.calls[0]![0];
    expect(doc).toMatchObject({ _type: 'feedback', event: { _ref: 'ev1' }, talk: { _ref: 't1' }, speaker: { _ref: 'sp-ada' }, rating: 5, comment: 'Great' });
    expect(doc.ipHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(doc)).not.toContain('203.0.113.9');
  });
  it('refuses a second rating of the same speaker’s talk with 409', async () => {
    const s = fakeSanity('fb0');
    await expect(forwardForm('rating', rating, { env: {}, sanity: s.client, now, client })).rejects.toMatchObject({ status: 409 });
    expect(s.create).not.toHaveBeenCalled();
  });
  it('checks duplicates per speaker, so both speakers of a shared talk can be rated', async () => {
    const s = fakeSanity(null);
    await forwardForm('rating', { ...rating, speakerId: 'grace' }, { env: {}, sanity: s.client, now, client });
    const dupQuery = s.fetch.mock.calls.find((c) => String(c[0]).includes('_type == "feedback"'))!;
    expect(String(dupQuery[0])).toContain('speaker._ref == $speaker');
  });
  it('rejects a talk that is not part of the event (400)', async () => {
    const s = fakeSanity(null, { ...lookup, inEvent: false });
    await expect(forwardForm('rating', rating, { env: {}, sanity: s.client, now, client })).rejects.toMatchObject({ status: 400 });
  });
  it('resolves a single-speaker talk without a speaker, but never guesses between two speakers', async () => {
    const solo = fakeSanity(null, { ...lookup, speaker: undefined, speakers: ['sp-ada'] });
    await forwardForm('rating', { ...rating, speakerId: undefined }, { env: {}, sanity: solo.client, now, client });
    expect(solo.create.mock.calls[0]![0]).toMatchObject({ speaker: { _ref: 'sp-ada' } });
    const pair = fakeSanity(null, { ...lookup, speaker: undefined });
    await expect(forwardForm('rating', { ...rating, speakerId: undefined }, { env: {}, sanity: pair.client, now, client })).rejects.toMatchObject({ status: 400 });
    expect(pair.create).not.toHaveBeenCalled();
  });
  it('rejects a speaker who is not on the talk, and a rating without a talk (400)', async () => {
    const s = fakeSanity(null, { ...lookup, speaker: 'sp-linus' });
    await expect(forwardForm('rating', rating, { env: {}, sanity: s.client, now, client })).rejects.toMatchObject({ status: 400 });
    await expect(forwardForm('rating', { eventId: 'ev1', target: 'evening', stars: 4 }, { env: {}, sanity: s.client, now, client })).rejects.toMatchObject({ status: 400 });
    expect(s.create).not.toHaveBeenCalled();
  });
  it('keeps the talk id from the target when talkId is missing (legacy payloads)', async () => {
    const s = fakeSanity(null);
    await forwardForm('rating', { eventId: 'ev1', target: 't1:ada', speakerId: 'ada', stars: 3 }, { env: {}, sanity: s.client, now, client });
    expect(s.create.mock.calls[0]![0]).toMatchObject({ event: { _ref: 'ev1' }, talk: { _ref: 't1' }, rating: 3, comment: '' });
  });
  it('logs and accepts without a Sanity token (nothing is written)', async () => {
    const log = vi.fn();
    const r = await forwardForm('rating', rating, { env: {}, sanity: null, now, log });
    expect(r.ok).toBe(true);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('not stored'));
  });
});

describe('evening feedback', () => {
  it('keeps the quote name only when quoting is allowed', async () => {
    const create = vi.fn(async (doc: Record<string, unknown>) => ({ _id: 'cf1', ...doc }));
    const sanity = { create } as never;
    await forwardForm('feedback', { eventId: 'ev1', overall: 4, quote: true, quoteName: '  Ada  ' }, { env: {}, sanity, now });
    await forwardForm('feedback', { eventId: 'ev1', overall: 4, quote: false, quoteName: 'Ada' }, { env: {}, sanity, now });
    expect(create.mock.calls[0]![0]).toMatchObject({ quoteConsent: true, quoteName: 'Ada' });
    expect(create.mock.calls[1]![0].quoteName).toBeUndefined();
  });
});

describe('partner inquiries (stubbed delivery)', () => {
  it('every field reaches the organisers by email and Slack, labelled', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ ok: true }));
    const data = {
      org: 'Acme AG',
      name: 'Ada',
      email: 'ada@acme.example',
      phone: '+41 44 000 00 00',
      way: 'partner',
      interest: 'Sponsorship: Community Builder',
      tier: 'Community Builder',
      msg: 'Monthly, from January',
      extra: 'kept',
      website_url: '',
    };
    const r = await forwardForm('partners', data, { env: { RESEND_API_KEY: 're_test', SLACK_WEBHOOK_URL: 'https://hooks.slack.invalid/x' }, log: () => {}, now, sanity: null });
    expect(r).toEqual({ ok: true, id: expect.stringMatching(/^partners_/) });
    const bodies = fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init!.body)) as { text: string; subject?: string; reply_to?: string });
    const email = bodies.find((b) => b.subject)!;
    const slack = bodies.find((b) => !b.subject)!;
    expect(email.subject).toBe('Partner inquiry (Sponsorship: Community Builder) from Acme AG');
    expect(email.reply_to).toBe('ada@acme.example');
    for (const text of [email.text, slack.text]) {
      for (const line of [
        'Interested in: Sponsorship: Community Builder',
        'Organisation: Acme AG',
        'Name: Ada',
        'Email: ada@acme.example',
        'Phone: +41 44 000 00 00',
        'Package: Community Builder',
        'Message: Monthly, from January',
        'Way (form value): partner',
        'extra: kept',
      ])
        expect(text).toContain(line);
      expect(text).not.toContain('website_url');
    }
    fetchMock.mockRestore();
  });

  it('a host inquiry carries the room size, and stubs when no secret is set', async () => {
    const log = vi.fn();
    await forwardForm('partners', { org: 'Acme', name: 'Ada', email: 'a@b.ch', way: 'host', interest: 'Host a meetup', capacity: '80' }, { env: {}, log, now, sanity: null });
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Partner inquiry (Host a meetup) from Acme'));
  });
});
