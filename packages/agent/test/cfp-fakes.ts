/**
 * Test doubles for the CFP bot: an in-memory draft store with the same owner rules as the SQL in
 * src/cfp/store.ts (tested against Postgres in apps/web/test/cfp-db.test.ts), a fake Slack that
 * records every call, and a scripted model.
 */
import { MockLanguageModelV4 } from 'ai/test';
import {
  OpenDraftExists,
  type CfpDeps,
  type CfpDraft,
  type CfpOwner,
  type CfpSlack,
  type CfpSlackMessage,
  type CfpStore,
  type SlackProfile,
  type UsageKind,
} from '../src/cfp/index.ts';

export function memoryCfpStore(now: () => Date = () => new Date()) {
  const drafts = new Map<string, CfpDraft>();
  const usage: { kind: UsageKind; team: string; user: string | null; amount: number; at: Date }[] = [];
  let n = 0;
  const mine = (d: CfpDraft | undefined, o: CfpOwner) => !!d && d.team === o.team && d.user === o.user;
  const store: CfpStore = {
    byThread: async (t) => [...drafts.values()].find((d) => d.team === t.team && d.channel === t.channel && d.threadTs === t.threadTs) ?? null,
    byId: async (id) => drafts.get(id) ?? null,
    openFor: async (o) => [...drafts.values()].find((d) => mine(d, o)) ?? null,
    async create(t) {
      const open = await store.openFor(t);
      if (open && open.threadTs !== t.threadTs) throw new OpenDraftExists(open);
      if (open) return open;
      if (await store.byThread(t)) throw new Error('This thread already holds someone else’s draft');
      const id = `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`;
      const d: CfpDraft = { ...t, id, fields: {}, email: null, photo: null, status: 'draft', createdAt: now(), updatedAt: now() };
      drafts.set(id, d);
      return structuredClone(d);
    },
    async update(id, o, p) {
      const d = drafts.get(id);
      if (!d || !mine(d, o) || d.status !== 'draft') return null;
      if (p.fields) d.fields = structuredClone(p.fields);
      if ('email' in p) d.email = p.email ?? null;
      if ('photo' in p) d.photo = p.photo ?? null;
      d.updatedAt = now();
      return structuredClone(d);
    },
    async claim(id, o) {
      const d = drafts.get(id);
      if (!d || !mine(d, o) || d.status !== 'draft') return null;
      d.status = 'submitting';
      return structuredClone(d);
    },
    async release(id, o) {
      const d = drafts.get(id);
      if (d && mine(d, o)) d.status = 'draft';
    },
    async remove(id, o) {
      return mine(drafts.get(id), o) ? drafts.delete(id) : false;
    },
    async purge(days) {
      let gone = 0;
      for (const [id, d] of drafts) if (d.updatedAt.getTime() < now().getTime() - days * 86_400_000) gone += Number(drafts.delete(id));
      return gone;
    },
    async record(kind, team, user, amount = 1) {
      usage.push({ kind, team, user, amount, at: now() });
    },
    async usage(kind, since, o) {
      return usage.filter((u) => u.kind === kind && u.at >= since && (!o || (u.team === o.team && u.user === o.user))).reduce((s, u) => s + u.amount, 0);
    },
  };
  return { store, drafts, usage };
}

export interface SlackCall {
  method: string;
  channel?: string;
  user?: string;
  threadTs?: string;
  text?: string;
  blocks?: unknown[];
  body?: unknown;
}

export const ADA: SlackProfile = {
  name: 'Ada Lovelace',
  email: 'grace.ada@example.com',
  jobTitle: 'Frontend developer',
  photoUrls: ['https://avatars.slack-edge.com/2026/ada_original.png'],
  isBot: false,
};

export function fakeSlack(thread: CfpSlackMessage[] = [], profiles: Record<string, SlackProfile> = {}) {
  const calls: SlackCall[] = [];
  const slack: CfpSlack = {
    botUserId: async () => 'UBOT',
    replies: async () => thread,
    post: async (channel, threadTs, text, blocks) => void calls.push({ method: 'post', channel, threadTs, text, blocks }),
    ephemeral: async (channel, user, threadTs, text, blocks) => void calls.push({ method: 'ephemeral', channel, user, threadTs, text, blocks }),
    respond: async (url, body) => void calls.push({ method: 'respond', body, text: String((body as { text?: string }).text ?? '') }),
    profile: async (user) => profiles[user] ?? ADA,
    openView: async (_trigger, view) => void calls.push({ method: 'openView', body: view }),
  };
  /** Everything anyone in the channel can see (not ephemeral, not the private response URL or modal). */
  const publicText = () =>
    calls
      .filter((c) => c.method === 'post')
      .map((c) => `${c.text}\n${JSON.stringify(c.blocks ?? [])}`)
      .join('\n');
  return { slack, calls, thread, publicText };
}

const usage = { inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 5, text: 5, reasoning: undefined } };
export const step = (content: unknown[], finish: 'tool-calls' | 'stop') => ({ content, finishReason: { unified: finish, raw: finish }, usage, warnings: [] });
export const call = (id: string, toolName: string, input: unknown) => ({ type: 'tool-call', toolCallId: id, toolName, input: JSON.stringify(input) });
export const say = (text: string) => step([{ type: 'text', text }], 'stop');

export const scripted = (steps: unknown[]) => new MockLanguageModelV4({ doGenerate: steps as never });

export const COMPLETE = {
  title: 'Testing without mocks',
  abstract: 'How to test JavaScript apps against real dependencies instead of mocks, and when mocks still help.',
  format: 'Standard',
  level: 'intermediate',
  topics: ['Testing', 'JavaScript'],
} as const;

export function deps(over: Partial<CfpDeps> & Pick<CfpDeps, 'store' | 'slack'>): CfpDeps {
  return {
    model: () => scripted([say('Hi')]),
    submit: async () => ({ id: 'sub-1' }),
    fetch: async () => new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/png' } }),
    ...over,
  };
}
