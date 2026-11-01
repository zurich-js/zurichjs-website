import { describe, expect, it } from 'vitest';
import { buttonClass, cx, isExternal, monogramClass, surfaceClass } from '../src/recipes';

describe('recipes', () => {
  it('cx drops falsy parts', () => {
    expect(cx('a', false, null, undefined, 'b')).toBe('a b');
  });
  it('buttons are pills and default to the yellow primary', () => {
    const c = buttonClass();
    expect(c).toContain('rounded-pill');
    expect(c).toContain('bg-yellow');
  });
  it('surfaces use the 24px card radius', () => {
    expect(surfaceClass('grey')).toContain('rounded-card');
  });
  it('monograms take tone and size', () => {
    expect(monogramClass('yellow', 'avatar')).toMatch(/bg-yellow/);
  });
  it('detects external links', () => {
    expect(isExternal('https://meetup.com')).toBe(true);
    expect(isExternal('mailto:hello@zurichjs.com')).toBe(true);
    expect(isExternal('/events')).toBe(false);
  });
});

describe('button classes never conflict', () => {
  it('the link variant is underlined and nothing removes it', () => {
    const c = buttonClass('link').split(' ');
    expect(c).toContain('underline');
    expect(c).not.toContain('no-underline');
  });
  it('box variants are never underlined', () => {
    for (const v of ['yellow', 'black', 'outline-black', 'white', 'grey', 'danger', 'outline-white'] as const) {
      const c = buttonClass(v).split(' ');
      expect(c).toContain('no-underline');
      expect(c).not.toContain('underline');
    }
  });
});
