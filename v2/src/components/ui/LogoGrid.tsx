import Image from 'next/image';
import type { Sponsor } from '@/data/types';

export function LogoGrid({ sponsors }: { sponsors: Sponsor[] }) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 list-none m-0 p-0">
      {sponsors.map((s, i) => (
        <li key={`${s.id}-${i}`} className="h-20 rounded-2xl bg-grey flex items-center justify-center text-[14px] text-ink-2 px-4">
          {s.logo ? (
            <a href={s.url} target="_blank" rel="noopener" className="flex items-center justify-center w-full h-full">
              <Image src={s.logo} alt={s.name} width={120} height={48} className="max-h-12 w-auto object-contain" />
            </a>
          ) : (
            <span>{s.name}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
