import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fontsCss, themeCss } from '../scripts/build-theme.mjs';
import { breakpoints, colors, font, radii } from '../src/tokens';

const read = (f: string) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');

describe('generated CSS', () => {
  it('theme.css matches tokens.ts (run `pnpm --filter @zurichjs/design theme`)', () => {
    expect(read('theme.css')).toBe(themeCss());
  });
  it('fonts.css matches tokens.ts', () => {
    expect(read('fonts.css')).toBe(fontsCss());
  });
});

describe('tokens', () => {
  const css = themeCss() as string;
  it('exposes every colour, radius and breakpoint to Tailwind', () => {
    for (const [k, v] of Object.entries(colors)) expect(css).toContain(`--color-${k}: ${v};`);
    for (const [k, v] of Object.entries(radii)) expect(css).toContain(`--radius-${k}: ${v};`);
    for (const [k, v] of Object.entries(breakpoints)) expect(css).toContain(`--breakpoint-${k}: ${v};`);
  });
  it('keeps #F1E271 as the only accent', () => {
    const yellows = Object.values(colors).filter((c) => /^#(f1e271|edc936)$/i.test(c));
    expect(colors.yellow.toLowerCase()).toBe('#f1e271');
    expect(yellows).toHaveLength(2); // the accent and its hover shade
  });
  it('uses Figtree with the Astro Fonts API variable', () => {
    expect(font.family).toBe('Figtree');
    expect(css).toContain(`var(${font.cssVariable}`);
  });
  it('rounds cards at 24px and pills fully', () => {
    expect(radii.card).toBe('24px');
    expect(radii.pill).toBe('999px');
  });
});

describe('heading recipes follow the tokens', () => {
  it('SectionHeading sizes use the h2, h2Medium and h3 tokens', async () => {
    const { headingSizes } = await import('../src/recipes');
    const { headings } = await import('../src/tokens');
    const strip = (s: string) => s.replace(/\s/g, '');
    expect(headingSizes.lg).toContain(`text-[${strip(headings.h2)}]`);
    expect(headingSizes.md).toContain(`text-[${strip(headings.h2Medium)}]`);
    expect(headingSizes.sm).toContain(`text-[${strip(headings.h3)}]`);
  });
});
