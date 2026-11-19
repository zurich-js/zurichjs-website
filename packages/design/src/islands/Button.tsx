import type { ComponentChildren, JSX } from 'preact';
import { buttonClass, opensNewTab, type ButtonVariant } from '../recipes.ts';

interface Props {
  variant?: ButtonVariant;
  /** On a black surface: the same roles, mirrored. */
  inverse?: boolean;
  /** Full width on phones (below 480px), its own width from there. */
  grow?: boolean;
  /** An SVG path on a 24 by 24 viewBox. */
  icon?: string;
  iconAt?: 'start' | 'end';
  /** The accessible name when there is no text. */
  label?: string;
  class?: string;
  children?: ComponentChildren;
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
  'aria-busy'?: boolean;
}

const Icon = ({ d }: { d: string }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" class="size-5 flex-none" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d={d} />
  </svg>
);

/** Island twin of Button.astro; both use buttonClass, so the look is defined once. */
export function Button({
  variant = 'primary',
  inverse,
  grow,
  icon,
  iconAt = 'start',
  label,
  class: extra,
  children,
  href,
  external,
  type = 'button',
  disabled,
  onClick,
  ...aria
}: Props) {
  const iconOnly = children === undefined || children === null || children === false;
  const cls = buttonClass({ variant, inverse, iconOnly, grow }, extra);
  const body = (
    <>
      {icon && iconAt === 'start' && <Icon d={icon} />}
      {children}
      {icon && iconAt === 'end' && <Icon d={icon} />}
    </>
  );
  const name = iconOnly ? { 'aria-label': label } : {};
  if (href !== undefined) {
    const ext = external ?? opensNewTab(href);
    return (
      <a href={href} class={cls} onClick={onClick} {...(ext ? { target: '_blank', rel: 'noopener' } : {})} {...name} {...aria}>
        {body}
      </a>
    );
  }
  return (
    <button type={type} class={cls} disabled={disabled} onClick={onClick} {...name} {...aria}>
      {body}
    </button>
  );
}
