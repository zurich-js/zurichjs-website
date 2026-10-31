import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/cx';

type Tone = 'grey' | 'yellow' | 'black' | 'ink' | 'soft' | 'white' | 'danger';
const tones: Record<Tone, string> = {
  grey: 'bg-grey text-black',
  yellow: 'bg-yellow text-black',
  black: 'bg-black text-white on-black',
  ink: 'bg-ink text-white on-black',
  soft: 'bg-grey-soft text-black',
  white: 'bg-white text-black',
  danger: 'bg-danger-soft text-black',
};

interface Props extends HTMLAttributes<HTMLElement> {
  tone?: Tone;
  as?: 'div' | 'section' | 'aside' | 'figure' | 'li';
  children: ReactNode;
}

/** A soft filled, rounded surface. Used only where grouping helps. */
export function Surface({ tone = 'grey', as: Tag = 'div', className, children, ...rest }: Props) {
  return (
    <Tag className={cx('rounded-card', tones[tone], className)} {...rest}>
      {children}
    </Tag>
  );
}
