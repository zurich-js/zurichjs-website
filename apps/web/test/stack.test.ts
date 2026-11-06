import { readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const require = createRequire(new URL('../package.json', import.meta.url));
const major = (pkg: string) => Number((require(`${pkg}/package.json`) as { version: string }).version.split('.')[0]);

describe('stack', () => {
  it('runs on Astro 7', () => expect(major('astro')).toBe(7));
  it('styles with Tailwind 4', () => expect(major('tailwindcss')).toBe(4));
  it('pins a Node version Astro supports (.nvmrc, used by CI and netlify.toml)', () => {
    const v = (s: string) =>
      s
        .replace(/^[^\d]*/, '')
        .split('.')
        .map(Number);
    const atLeast = (have: number[], need: number[]) => have[0]! > need[0]! || (have[0] === need[0] && (have[1]! > need[1]! || (have[1] === need[1] && have[2]! >= need[2]!)));
    const astroMin = v((require('astro/package.json') as { engines: { node: string } }).engines.node);
    const nvmrc = v(readFileSync(fileURLToPath(new URL('../../../.nvmrc', import.meta.url)), 'utf8').trim());
    const netlify = v(readFileSync(fileURLToPath(new URL('../netlify.toml', import.meta.url)), 'utf8').match(/NODE_VERSION = "([^"]+)"/)![1]!);
    expect(atLeast(nvmrc, astroMin), `.nvmrc ${nvmrc.join('.')} < astro ${astroMin.join('.')}`).toBe(true);
    expect(netlify).toEqual(nvmrc);
  });
  it('has no Tailwind 3 or PostCSS config left', () => {
    const files = readdirSync(fileURLToPath(new URL('..', import.meta.url)));
    expect(files.filter((f) => /^(tailwind|postcss)\.config\./.test(f))).toEqual([]);
  });
});

/** Every component is defined once, in @zurichjs/design; the app keeps only app-specific islands. */
describe('design system ownership', () => {
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [f]));
  const design = new Set(walk(fileURLToPath(new URL('../../../packages/design/src', import.meta.url))).filter((f) => /\.(astro|tsx)$/.test(f)));
  const app = walk(fileURLToPath(new URL('../src', import.meta.url))).filter((f) => /\.(astro|tsx)$/.test(f));

  it('no component file exists in both the app and the design package', () => {
    expect(app.filter((f) => design.has(f) && !f.startsWith('index.') && f !== '[slug].astro')).toEqual([]);
  });

  it('the app has no local copies of the design CSS or tokens', () => {
    const css = readFileSync(fileURLToPath(new URL('../src/styles/global.css', import.meta.url)), 'utf8');
    expect(css).toContain("@import '@zurichjs/design/theme.css'");
    expect(css).not.toMatch(/@theme\b/);
  });
});
