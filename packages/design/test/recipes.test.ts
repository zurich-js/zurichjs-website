import { describe, expect, it } from 'vitest';
import { buttonClass, cardClass, chipClass, cx, isExternal, monogramClass, noticeClass, opensNewTab, tagClass, type ButtonVariant } from '../src/recipes.ts';

const VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'cta', 'plain'];

describe('recipes', () => {
  it('cx drops falsy parts', () => {
    expect(cx('a', false, null, undefined, 'b')).toBe('a b');
  });
  it('detects external links; mail links do not open a new tab', () => {
    expect(isExternal('https://meetup.com')).toBe(true);
    expect(isExternal('mailto:hello@zurichjs.com')).toBe(true);
    expect(isExternal('/events')).toBe(false);
    expect(opensNewTab('mailto:hello@zurichjs.com')).toBe(false);
    expect(opensNewTab('https://meetup.com')).toBe(true);
  });
  it('monograms are never yellow (yellow is for buttons and one CTA section)', () => {
    expect(monogramClass('white', 'avatar')).toMatch(/bg-white/);
    expect(monogramClass()).not.toMatch(/yellow/);
  });
});

describe('buttons', () => {
  it('every variant is a 48px pill with no underline and no size of its own', () => {
    for (const variant of VARIANTS) {
      const c = buttonClass({ variant }).split(' ');
      expect(c).toContain('rounded-pill');
      expect(c).toContain('min-h-control');
      expect(c).toContain('no-underline');
      expect(c.filter((x) => /^(min-)?h-\[|^text-\[|^px-\[/.test(x))).toEqual([]);
    }
  });
  it('the primary is black and flips to white; the cta is the only yellow', () => {
    expect(buttonClass({ variant: 'primary' })).toContain('hover:bg-white');
    for (const variant of VARIANTS) expect(buttonClass({ variant }).includes('bg-yellow')).toBe(variant === 'cta');
  });
  it('an icon-only button is round: no side padding', () => {
    expect(buttonClass({ iconOnly: true }).split(' ')).toContain('p-0');
  });
});

describe('tags, chips, cards and notices', () => {
  it('tags have 6px corners, not pills', () => {
    expect(tagClass()).toContain('rounded-tag');
    expect(tagClass()).not.toContain('rounded-pill');
  });
  it('filter chips are 44px pills', () => {
    expect(chipClass()).toContain('min-h-chip');
    expect(chipClass()).toContain('rounded-pill');
  });
  it('cards use the 24px card radius and token padding', () => {
    expect(cardClass()).toContain('rounded-card');
    expect(cardClass('filled', 'lg')).toContain('p-card-lg');
  });
  it('green only for success, red only for errors', () => {
    expect(noticeClass('success')).toContain('bg-success-soft');
    expect(noticeClass('danger')).toContain('bg-danger-soft');
    expect(noticeClass('note')).not.toMatch(/success|danger/);
  });
});
