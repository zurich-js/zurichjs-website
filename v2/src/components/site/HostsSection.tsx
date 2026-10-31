import { LogoGrid } from '@/components/ui/LogoGrid';
import { SPONSORS } from '@/data/content';
import Link from 'next/link';

export function HostsSection({ heading = '30+ companies have hosted or supported us', link = true }: { heading?: string; link?: boolean }) {
  return (
    <section aria-labelledby="h-hosts" className="px-gut flex flex-col gap-[22px]">
      <h2 id="h-hosts" className="m-0 text-[clamp(24px,2.4vw,32px)] leading-[1.2] font-bold">
        {heading}
      </h2>
      <LogoGrid sponsors={SPONSORS} />
      {link && (
        <Link href="/partners" className="self-start font-bold text-[18px] underline underline-offset-4">
          Host a meetup or support the community
        </Link>
      )}
    </section>
  );
}
