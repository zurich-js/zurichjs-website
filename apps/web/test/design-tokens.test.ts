import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import allowlist from './design-allowlist.json';

/**
 * Pages and components pick tokens and component props, never pixels (owner, 12th November 2026):
 * no arbitrary text sizes, line heights, heights, widths, paddings, margins, gaps or radii such as
 * `text-[17px]`, `min-h-[44px]` or `p-[clamp(...)]`. A genuine one-off goes in design-allowlist.json
 * with a reason, like the SEO allowlist.
 */
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const DIRS = ['apps/web/src', 'packages/design/src'];
const BLOCKED =
  /(?<![\w-])(?:[a-z0-9@-]+:)*-?(?:text|leading|gap(?:-[xy])?|p[xytblrse]?|m[xytblrse]?|rounded(?:-[a-z]+)?|min-h|max-h|h|min-w|max-w|w|size|space-[xy])-\[[^\]\s]+\]/g;

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(astro|tsx)$/.test(f) ? [p] : [];
  });

const found = DIRS.flatMap((d) => files(join(ROOT, d))).flatMap((f) => {
  const rel = relative(ROOT, f);
  return [...readFileSync(f, 'utf8').matchAll(BLOCKED)].map((m) => `${rel}: ${m[0]}`);
});
const allowed = new Map((allowlist as { use: string; reason: string }[]).map((a) => [a.use, a.reason]));

describe('design tokens', () => {
  it('no arbitrary sizes, spacing or radii outside the allowlist', () => {
    expect(found.filter((u) => !allowed.has(u))).toEqual([]);
  });
  it('every allowlist entry is still used and has a reason', () => {
    for (const [use, reason] of allowed) {
      expect(found, `stale allowlist entry: ${use}`).toContain(use);
      expect(reason.length, use).toBeGreaterThan(10);
    }
  });
});
