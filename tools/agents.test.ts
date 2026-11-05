import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Keeps the agent docs true: paths they name exist, frontmatter is valid, no secrets, pinned tools. */
const root = new URL('..', import.meta.url).pathname;
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const dir = (p: string) => readdirSync(join(root, p));

const skills = dir('agents/skills').map((s) => `agents/skills/${s}/SKILL.md`);
const roles = dir('agents/roles').map((r) => `agents/roles/${r}`);
const DOCS = ['AGENTS.md', 'docs/v2/AUTOMATION.md', ...skills, ...roles, ...dir('.claude/agents').map((a) => `.claude/agents/${a}`)];

/** Paths named in docs that live outside this repository or in other tools' config. */
const NOT_HERE = /^(zurich-js\/|\.cursor\/|\.vscode\/|v2\/pr-media)/;
const isRepoPath = (s: string) => /^[\w.-]+(\/[\w.@-]+)+\/?$|^[\w-]+\.(md|ts|mts|mjs|json|yml|toml)$/.test(s) && !NOT_HERE.test(s) && !s.startsWith('/');

describe('agent docs', () => {
  it('every playbook and role has name and description frontmatter', () => {
    for (const f of [...skills, ...roles]) {
      const fm = read(f).match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? '';
      expect(fm, f).toMatch(/^name: [a-z-]+$/m);
      expect(fm, f).toMatch(/^description: .{40,}$/m);
    }
  });

  it('every repository path they mention exists', () => {
    const missing: string[] = [];
    for (const doc of DOCS) {
      for (const [, token] of read(doc).matchAll(/`([^`\s]+)`/g)) {
        const path = token!.replace(/[.,:;]$/, '');
        if (isRepoPath(path) && !existsSync(join(root, path))) missing.push(`${doc}: ${path}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('CLAUDE.md only imports AGENTS.md, and .claude/skills points at agents/skills', () => {
    expect(read('CLAUDE.md').trim()).toBe('@AGENTS.md');
    expect(dir('.claude/skills').sort()).toEqual(dir('agents/skills').sort());
  });
});

describe('.mcp.json', () => {
  const mcp = JSON.parse(read('.mcp.json')) as { mcpServers: Record<string, { args?: string[]; headers?: Record<string, string>; env?: Record<string, string> }> };
  it('pins every npx package to an exact version', () => {
    for (const [name, s] of Object.entries(mcp.mcpServers)) {
      const pkg = s.args?.find((a) => a.startsWith('@') || /^[a-z]/.test(a));
      if (s.args?.includes('-y')) expect(pkg, name).toMatch(/@\d+\.\d+\.\d+$/);
    }
  });
  it('takes every credential from the environment', () => {
    for (const [name, s] of Object.entries(mcp.mcpServers)) {
      for (const v of [...Object.values(s.headers ?? {}), ...Object.values(s.env ?? {})]) expect(v, name).toMatch(/\$\{[A-Z_]+\}/);
    }
  });
});

describe('Slack app manifest', () => {
  it('points at functions that exist', () => {
    const urls = [...read('slack/manifest.yml').matchAll(/request_url: (\S+)/g)].map((m) => m[1]!);
    expect(urls).toHaveLength(2);
    for (const u of urls) {
      const name = u.match(/\/\.netlify\/functions\/([\w-]+)$/)?.[1];
      expect(name && existsSync(join(root, `apps/web/netlify/functions/${name}.mts`)), u).toBe(true);
    }
  });
});
