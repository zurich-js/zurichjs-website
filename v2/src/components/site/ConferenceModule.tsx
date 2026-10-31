import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { CONFERENCE, CONFERENCE_STATE } from '@/data/content';
import { confLink, track } from '@/lib/analytics';

/** The one contextual conference module. Copy follows the conference lifecycle; no invented dates or prices. */
export function ConferenceModule() {
  const conf = CONFERENCE[CONFERENCE_STATE];
  return (
    <section
      aria-label="ZurichJS Conf"
      className="on-black mx-gut bg-ink text-white rounded-block p-[clamp(28px,4.4vw,64px)] grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-x-12 gap-y-7 items-end"
    >
      <div className="flex flex-col gap-[18px]">
        <Image src="/images/logo/wordmark-conf-white.svg" alt="ZurichJS Conf" width={300} height={40} className="h-[clamp(26px,2.6vw,34px)] w-auto max-w-full self-start" />
        <h2 className="m-0 text-[clamp(26px,3vw,40px)] leading-[1.15] font-bold">{conf.headline}</h2>
        <p className="m-0 text-[18px] leading-[1.5] text-grey max-w-[560px]">{conf.body}</p>
      </div>
      <div className="flex flex-col gap-2.5 items-start justify-self-end self-end">
        <Button href={confLink('/', 'home')} variant="yellow" onClick={() => track({ name: 'conf_outbound_click', placement: 'home', confState: CONFERENCE_STATE })}>
          {conf.cta}
        </Button>
        <span className="text-[15px] text-grey-mid">conf.zurichjs.com</span>
      </div>
    </section>
  );
}
