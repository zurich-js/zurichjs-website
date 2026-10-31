import Link from 'next/link';
import { Monogram } from '@/components/ui/Monogram';
import { Photo } from '@/components/ui/Photo';
import type { Speaker } from '@/data/types';

interface Props {
  speaker: Speaker;
  /** Second line: tagline (home) or "role · n talks" (directory). */
  meta: string;
  tone?: 'grey' | 'yellow';
}

export function SpeakerCard({ speaker, meta, tone = 'grey' }: Props) {
  return (
    <Link href={`/speakers/${speaker.id}`} className="no-underline text-black flex flex-col gap-3">
      {speaker.photo ? (
        <Photo photo={speaker.photo} className="aspect-square w-full" sizes="(min-width: 800px) 25vw, 50vw" />
      ) : (
        <Monogram initials={speaker.initials} size="tile" tone={tone} />
      )}
      <span className="flex flex-col gap-0.5">
        <span className="text-[19px] font-bold">{speaker.name}</span>
        <span className="text-[16px] text-ink-2">{meta}</span>
      </span>
    </Link>
  );
}
