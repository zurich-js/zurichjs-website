import Image from 'next/image';
import Link from 'next/link';
import { SITE, CONFERENCE_STATE } from '@/data/content';
import { confLink, track } from '@/lib/analytics';

const COLS = [
  {
    h: 'Events',
    links: [
      { label: 'Upcoming events', href: '/events' },
      { label: 'Past events', href: '/events?tab=past' },
      { label: 'Workshops', href: '/events?type=workshop' },
      { label: 'Photos', href: '/media' },
    ],
  },
  {
    h: 'Take part',
    links: [
      { label: 'Speak at a meetup', href: '/cfp' },
      { label: 'Volunteer', href: '/cfv' },
      { label: 'Host or sponsor', href: '/partners' },
      { label: 'Donate', href: '/donate' },
    ],
  },
  {
    h: 'About',
    links: [
      { label: 'About ZurichJS', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'Code of conduct', href: '/policies/code-of-conduct' },
      { label: 'Privacy policy', href: '/policies/privacy' },
      { label: 'Terms of use', href: '/policies/terms' },
      { label: 'Refund policy', href: '/policies/refunds' },
    ],
  },
];

const SOCIAL = [
  { label: 'Meetup', href: SITE.meetupGroupUrl },
  { label: 'LinkedIn', href: SITE.linkedinUrl },
  { label: 'Bluesky', href: SITE.blueskyUrl },
  { label: 'Instagram', href: SITE.instagramUrl },
];

export function Footer() {
  return (
    <footer className="on-black bg-black text-white pt-[clamp(48px,6vw,88px)] pb-8 px-gut flex flex-col gap-[clamp(40px,5vw,64px)]">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,190px),1fr))] gap-x-10 gap-y-8">
        <div className="flex flex-col gap-4 col-span-full md:col-span-2 max-w-[420px]">
          <Image src="/images/logo/wordmark-white.svg" alt="ZurichJS" width={274} height={40} className="h-7 w-auto self-start max-w-full" />
          <p className="m-0 text-[17px] leading-[1.55]">JavaScript meetups in Zurich, run by volunteers. Part of the {SITE.association}, a non-profit association registered in Switzerland.</p>
          <a href={`mailto:${SITE.email}`} className="text-[17px] font-bold text-yellow no-underline hover:underline">
            {SITE.email}
          </a>
        </div>
        {COLS.map((c) => (
          <nav key={c.h} aria-label={c.h} className="flex flex-col gap-2.5">
            <h2 className="m-0 mb-1 text-[18px] font-bold">{c.h}</h2>
            {c.links.map((l) => (
              <Link key={l.label} href={l.href} className="text-[16px] text-grey-mid no-underline hover:text-white hover:underline">
                {l.label}
              </Link>
            ))}
          </nav>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-8 gap-y-4 items-center justify-between">
        <div className="flex items-center gap-3.5 flex-wrap">
          <Image src="/images/logo/wordmark-conf-white.svg" alt="ZurichJS Conf" width={300} height={40} className="h-[22px] w-auto max-w-full" />
          <a
            href={confLink('/', 'footer')}
            onClick={() => track({ name: 'conf_outbound_click', placement: 'footer', confState: CONFERENCE_STATE })}
            target="_blank"
            rel="noopener"
            className="text-[16px] text-white underline underline-offset-[3px]"
          >
            conf.zurichjs.com
          </a>
        </div>
        <div className="flex gap-[18px] flex-wrap text-[16px]">
          {SOCIAL.map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener" className="text-grey-mid no-underline hover:text-white">
              {s.label}
            </a>
          ))}
        </div>
      </div>
      <p className="m-0 text-[14px] text-grey-mid">
        © {new Date().getFullYear()} {SITE.association} ({SITE.uid})
      </p>
    </footer>
  );
}
