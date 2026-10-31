import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ALL, GET } from '../src/pages/api/speaker-feedback/[token]';
import { signHs256, verifyHs256 } from '../src/server/jwt';
import { INVALID_LINK, loadSpeakerFeedback, summarise } from '../src/server/speaker-feedback';

const SECRET = 'test-secret';
const NOW = Date.parse('2026-11-01T12:00:00Z');
const inDays = (d: number) => Math.floor(NOW / 1000) + d * 86400;
const token = (claims: Record<string, unknown> = {}) => signHs256({ speakerId: 'anna-muster', type: 'speaker-feedback', iat: inDays(-1), exp: inDays(29), ...claims }, SECRET);

describe('verifyHs256', () => {
  it('accepts a token signed like jsonwebtoken does', () => {
    expect(verifyHs256(token(), SECRET, NOW)).toMatchObject({ speakerId: 'anna-muster', type: 'speaker-feedback' });
  });

  it('rejects a wrong secret, an expired token, a tampered payload and alg none', () => {
    expect(verifyHs256(token(), 'other', NOW)).toBeNull();
    expect(verifyHs256(token({ exp: inDays(-1) }), SECRET, NOW)).toBeNull();
    const [h, , s] = token().split('.');
    const forged = Buffer.from(JSON.stringify({ speakerId: 'someone-else' })).toString('base64url');
    expect(verifyHs256(`${h}.${forged}.${s}`, SECRET, NOW)).toBeNull();
    const none = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
    expect(verifyHs256(`${none}.${forged}.`, SECRET, NOW)).toBeNull();
    expect(verifyHs256('not-a-jwt', SECRET, NOW)).toBeNull();
  });
});

describe('loadSpeakerFeedback', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  it('fails politely and logs when JWT_SECRET is missing', async () => {
    const lines: string[] = [];
    const r = await loadSpeakerFeedback(token(), { env: {}, log: (m) => lines.push(m), now: () => NOW });
    expect(r).toEqual({ ok: false, status: 401, error: INVALID_LINK });
    expect(lines.join()).toMatch(/JWT_SECRET missing/);
  });

  it('rejects tokens of another type or without a speaker', async () => {
    const env = { JWT_SECRET: SECRET, SANITY_READ_TOKEN: 'r' };
    expect((await loadSpeakerFeedback(token({ type: 'other' }), { env, now: () => NOW })).ok).toBe(false);
    expect((await loadSpeakerFeedback(token({ speakerId: '' }), { env, now: () => NOW })).ok).toBe(false);
    expect((await loadSpeakerFeedback('', { env, now: () => NOW })).ok).toBe(false);
  });

  it('reads Sanity with the read token and the speaker id from the token', async () => {
    const f = vi.fn(async () =>
      Response.json({
        result: {
          speaker: { name: 'Anna Muster' },
          feedback: [
            {
              _id: '1',
              rating: 5,
              comment: 'Great demo',
              submittedAt: '2026-10-02',
              event: { _id: 'e1', title: 'October', datetime: '2026-10-01T18:00:00Z', slug: 'oct' },
              talk: { _id: 't1', title: 'Signals' },
            },
            { _id: '2', rating: 4, comment: '  ', event: { _id: 'e1', title: 'October', slug: 'oct' }, talk: { _id: 't1', title: 'Signals' } },
          ],
        },
      }),
    );
    const r = await loadSpeakerFeedback(token(), { env: { JWT_SECRET: SECRET, SANITY_READ_TOKEN: 'read-token' }, fetch: f as unknown as typeof fetch, now: () => NOW });
    expect(r.ok).toBe(true);
    const [url, init] = f.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.searchParams.get('$speakerId')).toBe('"anna-muster"');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer read-token');
    if (r.ok) {
      expect(r.data.speaker.name).toBe('Anna Muster');
      expect(r.data.talks).toHaveLength(1);
      expect(r.data.talks[0]).toMatchObject({ title: 'Signals', count: 2, average: 4.5, distribution: [0, 0, 0, 1, 1], comments: [{ text: 'Great demo', rating: 5 }] });
    }
  });

  it('treats an unknown speaker as an invalid link and a Sanity error as unavailable', async () => {
    const env = { JWT_SECRET: SECRET, SANITY_READ_TOKEN: 'r' };
    const empty = vi.fn(async () => Response.json({ result: { speaker: null, feedback: [] } }));
    expect(await loadSpeakerFeedback(token(), { env, fetch: empty as unknown as typeof fetch, now: () => NOW })).toMatchObject({ ok: false, status: 401 });
    const down = vi.fn(async () => new Response('', { status: 500 }));
    expect(await loadSpeakerFeedback(token(), { env, fetch: down as unknown as typeof fetch, now: () => NOW })).toMatchObject({ ok: false, status: 502 });
  });
});

describe('summarise', () => {
  it('groups by talk, ignores bad ratings and sorts newest event first', () => {
    const s = summarise({ name: 'A' }, [
      { _id: '1', rating: 3, event: { _id: 'e1', datetime: '2025-01-01' }, talk: { _id: 'old', title: 'Old talk' } },
      { _id: '2', rating: 9, event: { _id: 'e2', datetime: '2026-01-01' }, talk: { _id: 'new', title: 'New talk' } },
      { _id: '3', rating: null, comment: 'Loved it', event: { _id: 'e2', title: 'Jan', datetime: '2026-01-01' } },
    ]);
    expect(s.total).toBe(3);
    expect(s.average).toBe(3);
    expect(s.talks.map((t) => t.title)).toEqual(['New talk', 'Your talk at Jan', 'Old talk']);
    expect(s.talks[0]!.average).toBeNull();
  });
});

describe('GET /api/speaker-feedback/[token]', () => {
  afterEach(() => vi.restoreAllMocks());
  it('answers 401 with the polite message and noindex headers without secrets', async () => {
    const saved = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const res = await GET({ params: { token: token() } } as never);
    if (saved !== undefined) process.env.JWT_SECRET = saved;
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false, error: INVALID_LINK });
    expect(res.headers.get('x-robots-tag')).toContain('noindex');
  });

  it('answers 405 for other methods', async () => {
    expect((await ALL({} as never)).status).toBe(405);
  });
});
