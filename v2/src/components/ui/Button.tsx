import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/cx';

export type ButtonVariant =
  | 'yellow' // primary on black or white
  | 'outline-white' // secondary on black
  | 'black' // primary on white
  | 'outline-black' // secondary on white
  | 'white' // white fill, black hairline (on grey or yellow surfaces)
  | 'grey' // soft grey fill
  | 'danger'
  | 'link'; // underlined text, no box

type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 font-bold rounded-pill cursor-pointer no-underline select-none transition-colors disabled:cursor-not-allowed box-border text-center';

const variants: Record<ButtonVariant, string> = {
  yellow: 'bg-yellow text-black border border-yellow hover:bg-yellow-hover hover:border-yellow-hover disabled:bg-grey disabled:border-grey disabled:text-grey-text',
  'outline-white': 'bg-transparent text-white border-2 border-white hover:bg-white hover:text-black',
  black: 'bg-black text-white border border-black hover:bg-ink-2 hover:border-ink-2 disabled:bg-grey disabled:border-grey disabled:text-grey-text',
  'outline-black': 'bg-transparent text-black border-2 border-black hover:bg-black hover:text-white',
  white: 'bg-white text-black border border-black hover:bg-grey',
  grey: 'bg-grey text-black border border-grey hover:bg-[#E2E2E6] hover:border-[#E2E2E6]',
  danger: 'bg-danger text-white border border-danger hover:bg-[#8F1D17]',
  link: 'bg-transparent border-0 p-0 underline underline-offset-4 rounded-none hover:text-blue',
};

const sizes: Record<Size, string> = {
  sm: 'min-h-[44px] px-5 text-[16px]',
  md: 'min-h-[48px] px-6 text-[18px]',
  lg: 'min-h-[52px] px-[26px] text-[18px]',
};

interface CommonProps {
  variant?: ButtonVariant;
  size?: Size;
  className?: string;
  children: ReactNode;
  /** Stretch to full width on phones (the design's `ctaFlex`). */
  grow?: boolean;
}

type ButtonAsButton = CommonProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type ButtonAsLink = CommonProps & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; external?: boolean };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button(props: ButtonProps) {
  const { variant = 'yellow', size = 'md', className, children, grow } = props;
  const cls = cx(base, variants[variant], variant !== 'link' && sizes[size], grow && 'flex-[1_1_100%] md:flex-[0_0_auto]', className);
  if (props.href !== undefined) {
    const { href, external, variant: _v, size: _s, className: _c, grow: _g, children: _ch, ...rest } = props;
    const isExternal = external ?? /^(https?:|mailto:)/.test(href);
    if (isExternal) {
      return (
        <a href={href} className={cls} target={href.startsWith('mailto:') ? undefined : '_blank'} rel="noopener" {...rest}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={cls} {...rest}>
        {children}
      </Link>
    );
  }
  const { variant: _v, size: _s, className: _c, grow: _g, children: _ch, type, ...rest } = props;
  return (
    <button type={type ?? 'button'} className={cls} {...rest}>
      {children}
    </button>
  );
}
