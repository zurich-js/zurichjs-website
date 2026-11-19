import type { ComponentChildren, Ref } from 'preact';
import { cx, headingClass, type HeadingSize } from '../recipes.ts';

/** Island twin of Heading.astro. The level (`as`) and the look (`size`) are chosen separately. */
export function Heading({
  as: Tag = 'h2',
  size = 'section',
  id,
  focus,
  class: extra,
  children,
}: {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p';
  size?: HeadingSize;
  id?: string;
  /** A view's heading that takes focus after the view changed (never in the tab order): a ref, or true when it is found by its id. */
  focus?: Ref<HTMLHeadingElement> | true;
  /** Layout only (margins, placement). */
  class?: string;
  children: ComponentChildren;
}) {
  return (
    <Tag
      id={id}
      ref={focus === true ? undefined : focus}
      tabIndex={focus ? -1 : undefined}
      class={cx('m-0 font-bold text-balance', headingClass[size], focus && 'outline-hidden', extra)}
    >
      {children}
    </Tag>
  );
}
