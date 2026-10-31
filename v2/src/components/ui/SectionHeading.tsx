import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

interface Props {
  id?: string;
  children: ReactNode;
  action?: ReactNode;
  sub?: ReactNode;
  size?: 'lg' | 'md' | 'sm';
  className?: string;
}

const sizes = {
  lg: 'text-[clamp(30px,3.4vw,48px)] leading-[1.1]',
  md: 'text-[clamp(26px,2.8vw,36px)] leading-[1.15]',
  sm: 'text-[clamp(24px,2.4vw,32px)] leading-[1.2]',
};

/** Section heading, optionally with a right-aligned text action and a sub line. */
export function SectionHeading({ id, children, action, sub, size = 'lg', className }: Props) {
  return (
    <div className={cx('flex justify-between items-end gap-4 flex-wrap', className)}>
      <div className="flex flex-col gap-2.5 max-w-[720px]">
        <h2 id={id} className={cx('m-0 font-bold', sizes[size])}>
          {children}
        </h2>
        {sub && <p className="m-0 text-[18px] leading-[1.55] text-ink-2 text-pretty">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
