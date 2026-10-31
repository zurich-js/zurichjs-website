import Link from 'next/link';
import { Layout } from '@/components/layout/Layout';
import { PageOpening } from '@/components/layout/PageOpening';
import { Photo } from '@/components/ui/Photo';
import { eventHref, pastEvents } from '@/lib/events';
import { dateLong } from '@/lib/format';
import { useNow } from '@/lib/hooks';

/** Photo archive: every past event with photos, newest first. */
export default function MediaPage() {
  const now = useNow();
  const withPhotos = pastEvents(now).filter((e) => e.photos.length);
  return (
    <Layout title="Photos" description="Photos from past ZurichJS meetups and workshops." opening={<PageOpening title="Photos" sub="From past meetups and workshops. Ask us if you want a picture of you removed." compact />}>
      <main className="px-gut pt-[clamp(40px,5vw,72px)] pb-[clamp(64px,8vw,112px)] flex flex-col gap-[clamp(40px,5vw,64px)]">
        {withPhotos.map((ev) => (
          <section key={ev.id} className="flex flex-col gap-4">
            <div className="flex justify-between items-baseline flex-wrap gap-2.5">
              <h2 className="m-0 text-[clamp(24px,2.4vw,32px)] leading-[1.2] font-bold">{ev.title}</h2>
              <Link href={eventHref(ev)} className="font-bold text-[17px] underline underline-offset-[3px]">
                {ev.startsAt ? dateLong(ev.startsAt) : 'Event page'}
              </Link>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] gap-3">
              {ev.photos.map((p, i) => (
                <Photo key={i} photo={p} className="aspect-[4/3] w-full !rounded-2xl" sizes="(min-width: 800px) 25vw, 100vw" />
              ))}
            </div>
          </section>
        ))}
      </main>
    </Layout>
  );
}
