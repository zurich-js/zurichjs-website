import type { ComponentChildren } from 'preact';
import { cx, headingClass, type HeadingSize } from '../recipes.ts';

/** Island twin of Heading.astro. The level (`as`) and the look (`size`) are chosen separately. */
export function Heading({
  as: Tag = 'h2',
  size = 'section',
  id,
  class: extra,
  children,
}: {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p';
  size?: HeadingSize;
  id?: string;
  /** Layout only (margins, placement). */
  class?: string;
  children: ComponentChildren;
}) {
  return (
    <Tag id={id} class={cx('m-0 font-bold text-balance', headingClass[size], extra)}>
      {children}
    </Tag>
  );
}
