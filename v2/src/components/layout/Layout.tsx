import Head from 'next/head';
import type { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { useNextMeetupHref } from '@/lib/hooks';

interface Props {
  title: string;
  description?: string;
  /** Rendered inside the black opening, under the header (hero or page opening). */
  opening: ReactNode;
  children: ReactNode;
  noIndex?: boolean;
}

export function Layout({ title, description, opening, children, noIndex }: Props) {
  const nextHref = useNextMeetupHref();
  const fullTitle = title === 'ZurichJS' ? 'ZurichJS · JavaScript meetups in Zurich' : `${title} · ZurichJS`;
  return (
    <>
      <Head>
        <title>{fullTitle}</title>
        {description && <meta name="description" content={description} />}
        <meta property="og:title" content={fullTitle} />
        {description && <meta property="og:description" content={description} />}
        {noIndex && <meta name="robots" content="noindex" />}
      </Head>
      <div className="min-h-screen flex flex-col bg-white text-black">
        <div className="on-black bg-black text-white">
          <Header nextHref={nextHref} />
          {opening}
        </div>
        <div className="flex-1">{children}</div>
        <Footer />
      </div>
    </>
  );
}
