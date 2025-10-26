import Link from 'next/link';

import Layout from '@/components/layout/Layout';
import JoinCTA from '@/components/sections/JoinCTA';
import UpcomingEvents from '@/components/sections/UpcomingEvents';
import SEO from '@/components/SEO';
import { getUpcomingEvents } from '@/sanity/queries';
import type { Event } from '@/sanity/queries';
import { generateOrganizationSchema, generateFAQSchema } from '@/utils/structuredData';

interface Props {
  upcomingEvents: Event[];
}

export default function TechConferencesZurich({ upcomingEvents }: Props) {
  const faqs = [
    {
      question: 'What are the best tech conferences and meetups in Zurich?',
      answer:
        'Zurich offers many excellent tech events including ZurichJS (JavaScript/TypeScript meetups), FrontConf Zurich, Voxxed Days Zurich, WeAreDevelopers, and various specialized meetups. ZurichJS hosts free monthly meetups and occasional Pro Meetups with international speakers, making it accessible for developers at all levels.',
    },
    {
      question: 'How does ZurichJS complement FrontConf and Voxxed Days Zurich?',
      answer:
        'ZurichJS is the official warm-up event partner for both FrontConf and Voxxed Days Zurich 2026! We complement these annual conferences with free monthly meetups throughout the year, keeping the community connected between major events. Our Pro Meetups bring conference-level international speakers to Zurich, all completely free thanks to our non-profit model and community support.',
    },
    {
      question: 'Should I attend both ZurichJS meetups and tech conferences?',
      answer:
        'Absolutely! They complement each other perfectly. ZurichJS keeps you connected to the Zurich tech community year-round with monthly free meetups, while conferences like FrontConf and Voxxed Days provide immersive multi-day experiences. As the official warm-up event partner for both conferences in 2026, our meetups help you prepare for and extend your conference experience.',
    },
    {
      question: 'What topics does ZurichJS cover compared to tech conferences?',
      answer:
        'ZurichJS focuses on JavaScript, TypeScript, and web development including React, Vue, Angular, Node.js, AI/ML integration, performance, and modern frameworks. While conferences offer broader tech coverage, we provide deep dives into JavaScript ecosystem topics with opportunities to interact directly with speakers.',
    },
  ];

  const structuredData = [generateOrganizationSchema(), generateFAQSchema(faqs)];

  return (
    <Layout>
      <SEO
        title="Tech Conferences & Meetups in Zurich | ZurichJS Alternative to FrontConf & Voxxed Days"
        description="Looking for tech conferences in Zurich? Discover ZurichJS - a year-round alternative to FrontConf, Voxxed Days Zurich, and other annual conferences. Free monthly JavaScript & TypeScript meetups, workshops, and Pro Meetups with international speakers in Zurich, Switzerland."
        keywords={[
          'tech conferences Zurich',
          'FrontConf Zurich',
          'Voxxed Days Zurich',
          'JavaScript conference Zurich',
          'web development conference Switzerland',
          'tech meetups Zurich',
          'developer conferences Zurich',
          'frontend conference Zurich',
          'WeAreDevelopers Zurich',
          'tech events Zurich',
          'programming conferences Switzerland',
          'software engineering events Zurich',
          'React conference Zurich',
          'TypeScript conference Switzerland',
          'developer events Zurich',
        ]}
        geo={{
          region: 'CH-ZH',
          placename: 'Zurich',
          position: '47.3769;8.5417',
        }}
        structuredData={structuredData}
        openGraph={{
          title: 'Tech Conferences & Meetups in Zurich | ZurichJS',
          description:
            'Year-round alternative to FrontConf & Voxxed Days. Free monthly JavaScript meetups & affordable Pro Meetups in Zurich.',
          image: 'https://zurichjs.com/api/og/home',
          type: 'website',
          url: 'https://zurichjs.com/conferences/tech-conferences-zurich',
        }}
      />

      <div className="pt-20 bg-gradient-to-br from-js to-js-dark">
        {/* Hero Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-black">
              Meetups & Conferences in Zurich
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-800 max-w-4xl">
              In late 2024, we started ZurichJS because Zurich&apos;s meetup scene had become history after the
              pandemic. Today, we&apos;re the <strong>official warm-up partner</strong> for both FrontConf and Voxxed
              Days Zurich 2026—proof that consistent, community-driven events can complement the conference
              scene, not replace it.
            </p>

            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-8 rounded-lg shadow-xl mb-12 border-l-4 border-blue-600">
              <h2 className="text-2xl font-bold mb-4">Why This Partnership Matters</h2>
              <p className="text-lg mb-4">
                Less than a year after our first event, conference organizers approached us to become the
                official warm-up partner for 2026. This happened because we proved something: consistent,
                trust-based meetups can strengthen the entire ecosystem, not compete with it.
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold text-lg mb-2">Building Bridges</h3>
                  <p className="text-gray-700">
                    Conferences happen once a year. We keep the community connected month after month, creating
                    the foundation that makes those big events even better.
                  </p>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">Always Accessible</h3>
                  <p className="text-gray-700">
                    Every ZurichJS event is free. Registered non-profit, funded by community donations. No
                    financial barriers to being part of this.
                  </p>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">Different Format, Same Quality</h3>
                  <p className="text-gray-700">
                    50-100 people per meetup means real conversations with speakers. Conference-level content in
                    a relaxed space where networking happens naturally.
                  </p>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">Beyond Zurich</h3>
                  <p className="text-gray-700">
                    Developers travel from Basel, Winterthur, St. Gallen, even Konstanz. Geographic reach that
                    validates the need for this community.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="text-3xl mb-3">🎯</div>
                <h3 className="font-bold text-xl mb-2">Monthly Meetups</h3>
                <p className="text-gray-700">
                  Free JavaScript & TypeScript meetups every month - no expensive conference tickets needed
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="text-3xl mb-3">🌟</div>
                <h3 className="font-bold text-xl mb-2">Pro Meetups</h3>
                <p className="text-gray-700">
                  Premium events with international speakers at a fraction of conference prices
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="text-3xl mb-3">🤝</div>
                <h3 className="font-bold text-xl mb-2">Community Focus</h3>
                <p className="text-gray-700">
                  Build lasting connections with fellow developers throughout the year
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Meetups vs Conferences Section */}
        <section className="py-16 px-4 bg-white">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold mb-8 text-center">
              Understanding Meetups vs Conferences
            </h2>
            <p className="text-center text-lg mb-8 max-w-3xl mx-auto text-gray-700">
              Both meetups and conferences serve important roles in the developer community. Here&apos;s how they
              complement each other:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full bg-white shadow-lg rounded-lg">
                <thead className="bg-black text-js">
                  <tr>
                    <th className="p-4 text-left">Aspect</th>
                    <th className="p-4 text-center">Monthly Meetups (ZurichJS)</th>
                    <th className="p-4 text-center">Annual Conferences</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="p-4 font-semibold">Frequency</td>
                    <td className="p-4 text-center">Monthly year-round</td>
                    <td className="p-4 text-center">Once or twice per year</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="p-4 font-semibold">Format</td>
                    <td className="p-4 text-center">2-3 focused talks, networking</td>
                    <td className="p-4 text-center">Multi-track, workshops, keynotes</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold">Atmosphere</td>
                    <td className="p-4 text-center">Casual, intimate, community-focused</td>
                    <td className="p-4 text-center">Professional, polished, large-scale</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="p-4 font-semibold">Networking</td>
                    <td className="p-4 text-center">Deep connections, ongoing relationships</td>
                    <td className="p-4 text-center">Broad exposure, many new contacts</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold">Speaker Interaction</td>
                    <td className="p-4 text-center">Extended Q&A, personal conversations</td>
                    <td className="p-4 text-center">Brief Q&A, speaker hallway track</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="p-4 font-semibold">Best For</td>
                    <td className="p-4 text-center">Continuous learning, local community</td>
                    <td className="p-4 text-center">Big picture insights, industry trends</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border-l-4 border-blue-600">
              <h3 className="font-bold text-xl mb-3">What We&apos;ve Learned</h3>
              <p className="text-gray-700 mb-4">
                The developers who get the most out of Zurich&apos;s tech scene do both: they attend our monthly
                meetups for consistent community connection, and they go to conferences for those immersive
                multi-day experiences.
              </p>
              <p className="text-gray-700 mb-4">
                Meetups give you familiar faces month after month. Conferences give you broad industry exposure.
                Together, they create something neither can do alone: a complete, year-round professional
                development ecosystem.
              </p>
              <p className="text-gray-700">
                That&apos;s why we&apos;re building warm-up events for 2026—to make sure conference attendees already know
                each other, already have context, already feel like they belong before walking into those bigger
                venues.
              </p>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="bg-white p-8 rounded-lg shadow-lg mb-12">
              <h2 className="text-3xl font-bold mb-6">
                Complete Guide to Tech Conferences & Meetups in Zurich
              </h2>

              <div className="prose prose-lg max-w-none">
                <h3 className="text-2xl font-bold mt-6 mb-4">Major Tech Conferences in Zurich</h3>

                <div className="space-y-6">
                  <div className="border-l-4 border-yellow-400 pl-4 bg-yellow-50 p-4 rounded-r-lg">
                    <h4 className="font-bold text-xl mb-2">🤝 FrontConf Zurich (Official Partner)</h4>
                    <p className="mb-2">
                      <strong>Focus:</strong> Frontend development, UX, design systems
                    </p>
                    <p className="mb-2">
                      <strong>When:</strong> 27 February 2026
                    </p>
                    <p className="mb-2">
                      <strong>Best for:</strong> Frontend developers, UX designers, design system enthusiasts
                    </p>
                    <p className="text-gray-700 mb-3">
                      ZurichJS is the official warm-up event partner for FrontConf 2026. Join our meetups
                      throughout the year to connect with the community and get excited for the main conference!
                    </p>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-sm font-semibold text-yellow-800">
                        💡 Attend ZurichJS meetups to meet fellow FrontConf attendees year-round
                      </p>
                    </div>
                  </div>

                  <div className="border-l-4 border-blue-600 pl-4 bg-blue-50 p-4 rounded-r-lg">
                    <h4 className="font-bold text-xl mb-2">🤝 Voxxed Days Zurich (Official Partner)</h4>
                    <p className="mb-2">
                      <strong>Focus:</strong> Multi-track developer conference (Java, Cloud, Web, etc.)
                    </p>
                    <p className="mb-2">
                      <strong>When:</strong> 24 March 2026
                    </p>
                    <p className="mb-2">
                      <strong>Best for:</strong> Developers interested in diverse technology stacks
                    </p>
                    <p className="text-gray-700 mb-3">
                      ZurichJS serves as the official warm-up event for Voxxed Days Zurich 2026. Our JavaScript
                      track complements Voxxed Days&apos; comprehensive program with year-round community events.
                    </p>
                    <div className="bg-white p-3 rounded-lg">
                      <p className="text-sm font-semibold text-blue-800">
                        💡 Network with Voxxed Days speakers and attendees at our monthly meetups
                      </p>
                    </div>
                  </div>
                </div>

                <h3 className="text-2xl font-bold mt-8 mb-4">Why Attend ZurichJS Meetups?</h3>

                <p className="mb-4">
                  As a registered non-profit, ZurichJS is committed to making tech education accessible to
                  everyone. All our events are completely free thanks to community donations and sponsors:
                </p>

                <ul className="space-y-3 mb-6">
                  <li>
                    ✓ <strong>100% Free</strong> - All meetups are free to attend, including Pro Meetups with
                    international speakers. We&apos;re a non-profit funded by community donations.
                  </li>
                  <li>
                    ✓ <strong>Consistent Learning</strong> - Don&apos;t wait a year between conferences. Attend 12+
                    events annually.
                  </li>
                  <li>
                    ✓ <strong>Pro Meetups</strong> - Conference-quality talks with international speakers flown
                    to Zurich, still completely free!
                  </li>
                  <li>
                    ✓ <strong>Current Topics</strong> - Monthly format means we adapt quickly to new trends and
                    technologies.
                  </li>
                  <li>
                    ✓ <strong>Community Building</strong> - See the same faces monthly, build lasting
                    relationships.
                  </li>
                  <li>
                    ✓ <strong>Speaker Opportunities</strong> - We welcome speakers of all experience levels.
                  </li>
                  <li>
                    ✓ <strong>Flexible Schedule</strong> - Attend when it fits your schedule, no multi-day
                    commitment needed.
                  </li>
                </ul>

                <h3 className="text-2xl font-bold mt-8 mb-4">Topics We Cover</h3>
                <p className="mb-4">
                  ZurichJS covers the latest in JavaScript and web development, often featuring topics you&apos;ll
                  see at conferences, but in a more interactive format:
                </p>

                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-bold mb-2">Frontend Frameworks</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• React & Next.js</li>
                      <li>• Vue & Nuxt</li>
                      <li>• Angular</li>
                      <li>• Svelte & SvelteKit</li>
                      <li>• Astro, Remix, Qwik</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-bold mb-2">Backend & APIs</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Node.js, Deno, Bun</li>
                      <li>• GraphQL & tRPC</li>
                      <li>• Serverless functions</li>
                      <li>• Edge computing</li>
                      <li>• API design patterns</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-bold mb-2">Modern Topics</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• AI/ML integration</li>
                      <li>• Web performance</li>
                      <li>• TypeScript advanced</li>
                      <li>• Testing strategies</li>
                      <li>• Accessibility (a11y)</li>
                    </ul>
                  </div>
                </div>

                <h3 className="text-2xl font-bold mt-8 mb-4">Who Attends ZurichJS?</h3>
                <p className="mb-4">Our community includes:</p>
                <ul className="space-y-2 mb-6">
                  <li>
                    • <strong>Conference Regulars</strong> - Developers who attend FrontConf, Voxxed Days, and
                    other conferences
                  </li>
                  <li>
                    • <strong>Senior Engineers</strong> - Tech leads and architects staying current with
                    JavaScript trends
                  </li>
                  <li>
                    • <strong>Freelancers & Consultants</strong> - Building networks and showcasing expertise
                  </li>
                  <li>
                    • <strong>Students & Career Changers</strong> - Learning from experienced developers
                  </li>
                  <li>
                    • <strong>International Developers</strong> - People from Zurich, Winterthur, Basel, Zug,
                    Konstanz, and beyond
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Upcoming Events */}
        <UpcomingEvents events={upcomingEvents} />

        {/* FAQ Section */}
        <section className="py-16 px-4 bg-white">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <div key={index} className="bg-gray-50 p-6 rounded-lg shadow-md">
                  <h3 className="font-bold text-xl mb-3">{faq.question}</h3>
                  <p className="text-gray-700">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-3xl font-bold mb-6">
              Don&apos;t Wait for the Next Conference - Join ZurichJS Today
            </h2>
            <p className="text-xl mb-8">
              Get conference-quality content every month at a fraction of the price. Free meetups + affordable
              Pro Meetups with international speakers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/events"
                className="bg-black text-js px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-800 transition-colors"
              >
                View Upcoming Events
              </Link>
              <Link
                href="/cfp"
                className="bg-white text-black px-8 py-4 rounded-lg font-bold text-lg border-2 border-black hover:bg-gray-100 transition-colors"
              >
                Become a Speaker
              </Link>
            </div>
          </div>
        </section>

        <JoinCTA />
      </div>
    </Layout>
  );
}

export async function getStaticProps() {
  const upcomingEvents = await getUpcomingEvents();

  return {
    props: {
      upcomingEvents,
    },
    revalidate: 3600,
  };
}
