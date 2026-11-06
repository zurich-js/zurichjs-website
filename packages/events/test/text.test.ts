import { describe, expect, it } from 'vitest';
import { inlines, plainText, textBlocks } from '../src/text.ts';

describe('textBlocks (talk descriptions and bios)', () => {
  it('splits paragraphs on blank lines and keeps single line breaks', () => {
    expect(textBlocks('One.\r\n\r\nTwo\nlines.')).toEqual([
      { kind: 'p', lines: [[{ text: 'One.' }]] },
      { kind: 'p', lines: [[{ text: 'Two' }], [{ text: 'lines.' }]] },
    ]);
  });
  it('turns "- " items into one list, even with blank lines between them', () => {
    const b = textBlocks('Learn:\n\n- How agents audit\n\n- Keyboard traps\n\nJoin us!');
    expect(b.map((x) => x.kind)).toEqual(['p', 'ul', 'p']);
    expect(b[1]).toEqual({ kind: 'ul', items: [[{ text: 'How agents audit' }], [{ text: 'Keyboard traps' }]] });
  });
  it('separates a heading line from the list that follows it in the same block', () => {
    const b = textBlocks('Tech covered:\n- Turborepo\n- NodeJS');
    expect(b).toEqual([
      { kind: 'p', lines: [[{ text: 'Tech covered:' }]] },
      { kind: 'ul', items: [[{ text: 'Turborepo' }], [{ text: 'NodeJS' }]] },
    ]);
  });
  it('links bare http(s) URLs without trailing punctuation, and nothing else', () => {
    expect(inlines('See https://example.com/a. Or javascript:alert(1)')).toEqual([
      { text: 'See ' },
      { href: 'https://example.com/a', text: 'https://example.com/a' },
      { text: '. Or javascript:alert(1)' },
    ]);
  });
  it('keeps markup as text (rendered as text nodes, never HTML)', () => {
    expect(plainText('<script>alert(1)</script>')).toBe('<script>alert(1)</script>');
  });
  it('flattens to one line for meta descriptions', () => {
    expect(plainText('A.\n\n- b\n- c')).toBe('A. b c');
    expect(textBlocks(null)).toEqual([]);
  });
});

import { ordinal } from '../src/format.ts';
describe('ordinal', () => {
  it('uses st, nd, rd and th, with 11th to 13th', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 31].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '31st']);
  });
});
