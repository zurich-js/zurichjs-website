import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as queries from '../src/queries.ts';

/**
 * src/sanity.types.ts is generated from apps/studio (`pnpm --filter @zurichjs/studio typegen`;
 * the CI "studio" job regenerates it and fails on any difference). This guards the cheap part: every query
 * has a generated result type, and each generated type was made from the current text.
 */
const types = readFileSync(new URL('../src/sanity.types.ts', import.meta.url), 'utf8');
const squash = (s: string) => s.replace(/\s+/g, '');

describe('generated Sanity types', () => {
  const names = Object.keys(queries).filter((k) => k.endsWith('_QUERY'));
  it('exist for every query', () => {
    expect(names.length).toBeGreaterThan(0);
    for (const n of names) expect(types, `${n}: run pnpm --filter @zurichjs/studio typegen`).toContain(`export type ${n}Result =`);
  });
  it('were generated from the current query text', () => {
    for (const n of names) {
      const generated = types.match(new RegExp(`// Variable: ${n}\\n// Query: (.*)`))?.[1];
      expect(squash(generated ?? ''), `${n} changed since typegen ran`).toBe(squash((queries as Record<string, string>)[n]!));
    }
  });
});
