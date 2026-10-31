import type { GetStaticPaths, GetStaticProps } from 'next';
import Link from 'next/link';
import { Layout } from '@/components/layout/Layout';
import { PageOpening } from '@/components/layout/PageOpening';
import { POLICIES, SITE, type PolicySlug } from '@/data/content';
import { cx } from '@/lib/cx';

interface Props {
  slug: PolicySlug;
}
export const getStaticPaths: GetStaticPaths = async () => ({ paths: POLICIES.map((p) => ({ params: { slug: p.slug } })), fallback: false });
export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const p = POLICIES.find((x) => x.slug === params?.slug);
  return p ? { props: { slug: p.slug } } : { notFound: true };
};

/** One template for the four policy pages: tabs, "On this page" on desktop, the text. */
export default function PolicyPage({ slug }: Props) {
  const pol = POLICIES.find((p) => p.slug === slug)!;
  const isCoc = slug === 'code-of-conduct';
  return (
    <Layout title={pol.title} description={`ZurichJS ${pol.title.toLowerCase()}.`} opening={<PageOpening title={pol.title} compact />}>
      <main className="px-gut pt-[clamp(40px,5vw,72px)] pb-[clamp(64px,8vw,112px)] flex flex-col gap-[clamp(32px,4vw,48px)]">
        <nav aria-label="Policies" className="flex gap-2 flex-wrap">
          {POLICIES.map((p) => (
            <Link
              key={p.slug}
              href={`/policies/${p.slug}`}
              aria-current={p.slug === slug ? 'page' : undefined}
              className={cx('no-underline min-h-[44px] px-5 rounded-pill border border-black font-bold text-[16px] inline-flex items-center', p.slug === slug ? 'bg-black text-white' : 'bg-white text-black hover:bg-grey')}
            >
              {p.tab}
            </Link>
          ))}
        </nav>
        <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] gap-[clamp(32px,5vw,72px)] items-start">
          <nav aria-label="On this page" className="hidden md:flex sticky top-6 flex-col gap-1">
            <div className="text-[16px] font-bold mb-1.5">On this page</div>
            {pol.sections.map((s, i) => (
              <a key={s.heading} href={`#s-${i}`} className="py-1.5 text-[16px] text-ink-2 no-underline hover:text-black hover:underline">
                {s.heading}
              </a>
            ))}
          </nav>
          <article className="flex flex-col gap-[clamp(28px,3vw,40px)] max-w-[720px] min-w-0">
            <div className="text-[16px] text-grey-text">{pol.updated}</div>
            {isCoc && (
              <div className="bg-yellow rounded-card py-[22px] px-6 flex flex-col gap-2">
                <div className="text-[21px] font-bold">Report a concern</div>
                <div className="text-[17px] leading-[1.55]">
                  At a meetup, talk to an organiser in a yellow ZurichJS T-shirt. Any other time, email{' '}
                  <a href={`mailto:${SITE.email}`} className="font-bold">
                    {SITE.email}
                  </a>
                  . Reports are handled in confidence. In an emergency, call 112.
                </div>
              </div>
            )}
            {pol.sections.map((s, i) => (
              <section key={s.heading} id={`s-${i}`} className="flex flex-col gap-3 scroll-mt-6">
                <h2 className="m-0 text-[clamp(24px,2.4vw,30px)] leading-[1.2] font-bold">{s.heading}</h2>
                {s.paragraphs.map((p) => (
                  <p key={p} className="m-0 text-[18px] leading-[1.65] text-ink-2 text-pretty">
                    {p}
                  </p>
                ))}
              </section>
            ))}
            <div className="text-[16px] leading-[1.55] text-ink-2">
              Questions about this policy? Email{' '}
              <a href={`mailto:${SITE.email}`} className="font-bold">
                {SITE.email}
              </a>
              .
            </div>
          </article>
        </div>
      </main>
    </Layout>
  );
}
