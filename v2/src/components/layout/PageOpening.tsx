import Link from 'next/link';
import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

interface Props {
  title: string;
  sub?: ReactNode;
  crumb?: { label: string; href: string; here: string };
  pills?: { text: string; yellow?: boolean }[];
  children?: ReactNode;
  /** Narrower bottom padding for pages that start with a list right away. */
  compact?: boolean;
}

/** The black opening of every inner page: breadcrumb, status pills, title, one sentence, actions. */
export function PageOpening({ title, sub, crumb, pills, children, compact }: Props) {
  return (
    <section className={cx('px-gut flex flex-col gap-[18px] pt-[clamp(16px,3vw,40px)]', compact ? 'pb-[clamp(28px,4vw,48px)]' : 'pb-[clamp(36px,5vw,64px)]')}>
      {crumb && (
        <nav aria-label="Breadcrumb" className="text-[16px] text-grey-mid flex gap-2 flex-wrap">
          <Link href={crumb.href} className="text-white underline underline-offset-[3px]">
            {crumb.label}
          </Link>
          <span aria-hidden="true">/</span>
          <span>{crumb.here}</span>
        </nav>
      )}
      {pills && pills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pills.map((p) => (
            <span key={p.text} className={cx('text-[15px] font-bold px-3.5 py-1.5 rounded-pill text-black', p.yellow ? 'bg-yellow' : 'bg-white')}>
              {p.text}
            </span>
          ))}
        </div>
      )}
      <h1 className="m-0 text-[clamp(36px,5.4vw,72px)] leading-[1.08] font-bold max-w-[1000px] text-balance">{title}</h1>
      {sub && <p className="m-0 text-[clamp(18px,1.6vw,21px)] leading-[1.5] max-w-[700px] text-pretty">{sub}</p>}
      {children}
    </section>
  );
}
