import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { font } from '../src/font.ts';
import { breakpoints, color, colors, gutter, radii, radius, space, spacing, text } from '../src/theme.ts';

const read = (f: string) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');
const css = read('theme.css');

describe('theme.ts reads theme.css', () => {
  it('finds every group', () => {
    for (const g of [colors, radii, spacing, breakpoints, text]) expect(Object.keys(g).length).toBeGreaterThan(1);
    expect(gutter).toEqual({ mobile: '20px', desktop: '48px', column: '1280px' });
  });
  it('returns exactly what theme.css says', () => {
    for (const [k, v] of Object.entries(colors)) expect(css).toContain(`--color-${k}: ${v};`);
    for (const [k, v] of Object.entries(radii)) expect(css).toContain(`--radius-${k}: ${v};`);
    for (const [k, v] of Object.entries(spacing)) expect(css).toContain(`--spacing-${k}: ${v};`);
  });
  it('throws on a token that does not exist, so a typo fails the build', () => {
    expect(() => color('purple')).toThrow(/Unknown colour token "purple"/);
    expect(() => radius('huge')).toThrow();
    expect(() => space('lots')).toThrow();
  });
});

describe('tokens', () => {
  it('keeps #F1E271 as the only accent', () => {
    const yellows = Object.values(colors).filter((c) => /^#(f1e271|e3cb16)$/i.test(c));
    expect(color('yellow').toLowerCase()).toBe('#f1e271');
    expect(yellows).toHaveLength(2); // the accent and its hover shade
  });
  it('uses Figtree with the Astro Fonts API variable, and fonts.css names the same family', () => {
    expect(font.family).toBe('Figtree');
    expect(css).toContain(`var(${font.cssVariable}`);
    expect(read('fonts.css')).toContain(`font-family: '${font.family}'`);
  });
  it('has the nine type roles with their line heights, and switches off the default scale', () => {
    expect(css).toContain('--text-*: initial;');
    expect(Object.keys(text)).toHaveLength(9);
    for (const v of Object.values(text)) expect(v.lineHeight).not.toBe('');
    expect(text.body?.size).toBe('18px');
    expect(text.compact?.size).toBe('16px');
  });
  it('gives every button, switch and field one 48px height, and chips 44px', () => {
    expect(space('control')).toBe('48px');
    expect(space('chip')).toBe('44px');
  });
  it('rounds tags at 6px, cards at 24px and pills fully', () => {
    expect(radius('tag')).toBe('6px');
    expect(radius('card')).toBe('24px');
    expect(radius('pill')).toBe('999px');
  });
});

describe('type recipes use the theme roles', () => {
  it('every heading and text size is a theme role, never a pixel value', async () => {
    const { headingClass, textClass } = await import('../src/recipes.ts');
    for (const cls of [...Object.values(headingClass), ...Object.values(textClass)]) {
      expect(cls).toMatch(/^text-[a-z-]+$/);
      expect(Object.keys(text)).toContain(cls.slice('text-'.length));
    }
  });
});
