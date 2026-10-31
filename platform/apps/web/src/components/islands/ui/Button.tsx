import type { ComponentChildren, JSX } from 'preact';
import { buttonClass, isExternal, type ButtonSize, type ButtonVariant } from '~/lib/ui';

interface Props {
  variant?: ButtonVariant;
  size?: ButtonSize;
  grow?: boolean;
  class?: string;
  children: ComponentChildren;
  /** Renders a link when set. */
  href?: string;
  external?: boolean;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: (e: JSX.TargetedMouseEvent<HTMLElement>) => void;
  id?: string;
  'aria-describedby'?: string;
  'aria-controls'?: string;
  'aria-expanded'?: boolean;
}

/** Island twin of Button.astro; both use buttonClass so the look is defined once. */
export function Button({ variant = 'yellow', size = 'md', grow, class: extra, children, href, external, type = 'button', disabled, onClick, ...aria }: Props) {
  const cls = buttonClass(variant, size, grow, extra);
  if (href !== undefined) {
    const ext = external ?? isExternal(href);
    return (
      <a href={href} class={cls} onClick={onClick} {...(ext && !href.startsWith('mailto:') ? { target: '_blank', rel: 'noopener' } : {})} {...aria}>
        {children}
      </a>
    );
  }
  return (
    <button type={type} class={cls} disabled={disabled} onClick={onClick} {...aria}>
      {children}
    </button>
  );
}
