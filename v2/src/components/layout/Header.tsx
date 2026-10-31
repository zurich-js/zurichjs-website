import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { cx } from '@/lib/cx';
import { confLink, track } from '@/lib/analytics';
import { CONFERENCE_STATE } from '@/data/content';

interface Props {
  /** Where the "Next meetup" action goes. */
  nextHref: string;
}

const NAV = [
  { label: 'Events', href: '/events', match: ['/events', '/workshops', '/feedback'] },
  { label: 'Speakers', href: '/speakers', match: ['/speakers', '/cfp'] },
  { label: 'Community', href: '/about', match: ['/about', '/partners', '/donate', '/contact'] },
];

export function Header({ nextHref }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const path = router.pathname;

  useEffect(() => {
    const close = () => setOpen(false);
    router.events.on('routeChangeStart', close);
    return () => router.events.off('routeChangeStart', close);
  }, [router.events]);

  const isCurrent = (m: string[]) => m.some((p) => path === p || path.startsWith(p + '/'));
  const confHref = confLink('/', 'nav');
  const onConf = () => track({ name: 'conf_outbound_click', placement: 'nav', confState: CONFERENCE_STATE });

  return (
    <>
      <header className="flex items-center justify-between gap-5 py-5 px-gut">
        <Link href="/" aria-label="ZurichJS home" className="flex">
          <Image src="/images/logo/wordmark-white.svg" alt="ZurichJS" width={274} height={40} priority className="block h-[22px] md:h-7 w-auto" />
        </Link>

        <nav aria-label="Main" className="hidden md:flex items-center gap-7 text-[17px]">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={isCurrent(n.match) ? 'page' : undefined} className={cx('py-1.5 font-bold no-underline hover:text-yellow', isCurrent(n.match) ? 'text-yellow' : 'text-white')}>
              {n.label}
            </Link>
          ))}
          <a href={confHref} onClick={onConf} target="_blank" rel="noopener" className="py-1.5 font-bold no-underline text-white hover:text-yellow">
            Conference
          </a>
          <Button href={nextHref} variant="yellow" className="!min-h-0 py-2.5 px-[22px] text-[17px]">
            Next meetup
          </Button>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="md:hidden border-2 border-white bg-transparent rounded-pill min-w-[44px] h-11 px-4 font-bold text-[15px] text-white cursor-pointer"
        >
          {open ? 'Close' : 'Menu'}
        </button>
      </header>

      {open && (
        <nav id="mobile-nav" aria-label="Main" className="md:hidden flex flex-col gap-1 px-gut pb-6">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={isCurrent(n.match) ? 'page' : undefined} className={cx('py-2.5 text-[24px] font-bold no-underline', isCurrent(n.match) ? 'text-yellow' : 'text-white')}>
              {n.label}
            </Link>
          ))}
          <a href={confHref} onClick={onConf} target="_blank" rel="noopener" className="py-2.5 text-[24px] font-bold no-underline text-white">
            Conference
          </a>
          <Button href={nextHref} variant="yellow" className="mt-3 w-full text-[17px]">
            Next meetup
          </Button>
        </nav>
      )}
    </>
  );
}
