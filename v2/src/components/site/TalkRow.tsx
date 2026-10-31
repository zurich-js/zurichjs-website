import Link from 'next/link';
import { Monogram } from '@/components/ui/Monogram';
import type { Speaker } from '@/data/types';

export interface TalkRowData {
  title: string;
  speakers: Speaker[];
  date: string; // "Sep 2026"
  format: string; // "Talk" | "Lightning talk"
  href: string;
}

/** One past talk. Grey card on phones; white row with a hover highlight and an arrow on desktop. */
export function TalkRow({ t }: { t: TalkRowData }) {
  const lead = t.speakers[0];
  return (
    <Link
      href={t.href}
      className="no-underline text-black grid grid-cols-[40px_minmax(0,1fr)] md:grid-cols-[52px_minmax(0,1fr)_auto] gap-3.5 md:gap-[18px] items-start p-4 md:py-4 md:px-[18px] rounded-[20px] bg-grey-soft md:bg-white md:hover:bg-grey md:-mx-[18px] box-border w-full md:w-[calc(100%+36px)]"
    >
      <Monogram initials={lead?.initials ?? '?'} size="avatar" className="w-10 h-10 md:w-[52px] md:h-[52px] bg-white md:bg-grey" />
      <span className="flex flex-col gap-1.5 min-w-0">
        <span className="text-[18px] md:text-[20px] font-bold leading-[1.3] text-pretty [overflow-wrap:anywhere]">{t.title}</span>
        <span className="flex flex-wrap gap-x-2.5 gap-y-1 text-[16px] leading-[1.4] text-ink-2">
          <span className="font-bold text-black">{t.speakers.map((s) => s.name).join(', ')}</span>
          <span>
            {t.date} · {t.format}
          </span>
        </span>
      </span>
      <span aria-hidden="true" className="hidden md:flex w-10 h-10 rounded-pill bg-grey items-center justify-center font-bold self-center">
        →
      </span>
    </Link>
  );
}
