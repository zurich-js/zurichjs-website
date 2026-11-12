import type { ComponentChildren } from 'preact';
import { tagClass, type TagSize, type TagTone } from '../recipes.ts';

/** Island twin of Tag.astro: a static label. 6px corners, never a pill. */
export function Tag({
  size = 'sm',
  tone = 'grey',
  as: El = 'span',
  class: extra,
  children,
}: {
  size?: TagSize;
  tone?: TagTone;
  as?: 'span' | 'li';
  class?: string;
  children: ComponentChildren;
}) {
  return <El class={tagClass(size, tone, extra)}>{children}</El>;
}
