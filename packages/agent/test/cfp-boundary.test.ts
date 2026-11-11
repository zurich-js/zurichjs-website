/**
 * The CFP bot in the public #cfp channel must never reach the organiser bot or the membership
 * agent (docs/v2/CFP-BOT.md). This test follows every import, transitively, from the CFP code and
 * the slack-cfp-* functions, and fails if any of them reaches the organiser bot's tools, store,
 * loop, prompt or Slack code, the package root, or the membership code. The oxlint rule in
 * .oxlintrc.json catches direct imports in the editor; this catches indirect ones.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CFP_TOOL_NAMES } from '../src/cfp/index.ts';
import { CfpTurnState, buildCfpTools } from '../src/cfp/tools.ts';
import { memoryCfpStore } from './cfp-fakes.ts';

const root = resolve(import.meta.dirname, '../../..');
const agentSrc = join(root, 'packages/agent/src');
const cfpDir = join(agentSrc, 'cfp');
const functions = join(root, 'apps/web/netlify/functions');

const ENTRIES = [
  ...readdirSync(cfpDir).map((f) => join(cfpDir, f)),
  ...readdirSync(functions)
    .filter((f) => f.startsWith('slack-cfp-'))
    .map((f) => join(functions, f)),
  join(root, 'apps/web/src/server/cfp-bot.ts'),
];

/** Files of the organiser bot and the membership code the CFP path must never load. */
const FORBIDDEN_FILES = [
  'packages/agent/src/index.ts',
  'packages/agent/src/tools.ts',
  'packages/agent/src/programme.ts',
  'packages/agent/src/run.ts',
  'packages/agent/src/store.ts',
  'packages/agent/src/publish.ts',
  'packages/agent/src/prompt.ts',
  'packages/agent/src/slack.ts',
  'packages/agent/src/playbooks.generated.ts',
  'apps/web/src/server/membership-agent.ts',
  'apps/web/src/server/membership-slack.ts',
  'apps/web/src/server/membership-db.ts',
];
const FORBIDDEN_PACKAGES = ['@zurichjs/agent', '@zurichjs/membership'];

const importsOf = (file: string) =>
  [...readFileSync(file, 'utf8').matchAll(/(?:^|\n)\s*(?:import|export)\b[^'"]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => (m[1] ?? m[2])!);

/** Every file reachable from the entries through relative imports and @zurichjs/agent/cfp; and the packages used. */
function closure() {
  const seen = new Set<string>();
  const packages = new Map<string, string>();
  const queue = [...ENTRIES];
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const spec of importsOf(file)) {
      if (spec === '@zurichjs/agent/cfp') queue.push(join(cfpDir, 'index.ts'));
      else if (spec.startsWith('.')) {
        const target = resolve(dirname(file), spec);
        if (existsSync(target) && /\.(m?ts|json)$/.test(target)) {
          if (!target.endsWith('.json')) queue.push(target);
        } else throw new Error(`Cannot resolve ${spec} from ${relative(root, file)}`);
      } else packages.set(spec, relative(root, file));
    }
  }
  return { files: [...seen].map((f) => relative(root, f)), packages };
}

describe('the CFP bot import boundary', () => {
  const { files, packages } = closure();

  it('reaches the CFP code, the signature helpers and the model picker', () => {
    expect(files).toContain('packages/agent/src/cfp/tools.ts');
    expect(files).toContain('packages/agent/src/signatures.ts');
    expect(files).toContain('packages/agent/src/model.ts');
  });

  it('never loads the organiser bot or the membership code', () => {
    for (const f of FORBIDDEN_FILES) expect(files, `${f} is reachable from the CFP bot`).not.toContain(f);
  });

  it('never imports the @zurichjs/agent root or the membership package', () => {
    for (const p of FORBIDDEN_PACKAGES) expect(packages.has(p), `${p} imported by ${packages.get(p)}`).toBe(false);
  });

  it('the organiser bot files it may use import nothing of the organiser bot', () => {
    expect(importsOf(join(agentSrc, 'signatures.ts'))).toEqual([]);
    expect(importsOf(join(agentSrc, 'model.ts')).every((s) => s.startsWith('@ai-sdk/') || s === 'ai')).toBe(true);
  });
});

describe('the CFP bot tools', () => {
  it('are exactly the four, pinned', () => {
    expect(CFP_TOOL_NAMES).toEqual(['getMyDraft', 'updateMyDraft', 'submitMyDraft', 'discardMyDraft']);
    const { store } = memoryCfpStore();
    const draft = {
      id: 'x',
      team: 'T1',
      user: 'U1',
      channel: 'C',
      threadTs: '1',
      fields: {},
      email: null,
      photo: null,
      status: 'draft' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(Object.keys(buildCfpTools(store, new CfpTurnState(draft))).sort()).toEqual([...CFP_TOOL_NAMES].sort());
  });

  it('take no user, thread, team or draft id from the model', () => {
    const { store } = memoryCfpStore();
    const draft = {
      id: 'x',
      team: 'T1',
      user: 'U1',
      channel: 'C',
      threadTs: '1',
      fields: {},
      email: null,
      photo: null,
      status: 'draft' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const tools = buildCfpTools(store, new CfpTurnState(draft)) as Record<string, { inputSchema: { _zod?: { def?: { shape?: Record<string, unknown> } } } }>;
    for (const [name, t] of Object.entries(tools)) {
      const keys = Object.keys(t.inputSchema._zod?.def?.shape ?? {});
      expect(
        keys.filter((k) => /user|team|thread|channel|id|email|slack/i.test(k)),
        name,
      ).toEqual([]);
    }
  });
});
