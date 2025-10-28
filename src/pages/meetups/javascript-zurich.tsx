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

export default function JavaScriptZurich({ upcomingEvents }: Props) {
  const faqs = [
    {
      question: 'What are the best JavaScript meetups in Zurich?',
      answer:
        'ZurichJS is the premier JavaScript and TypeScript community in Zurich, Switzerland. We host regular free meetups featuring expert speakers covering React, Node.js, Vue, Angular, and modern web development. Our community welcomes developers of all levels from Zurich, Winterthur, Basel, Zug, and nearby German cities like Konstanz.',
    },
    {
      question: 'Where can I find JavaScript events in Zurich?',
      answer:
        'ZurichJS hosts monthly JavaScript meetups in Zurich at various tech company offices. Visit zurichjs.com/events to see upcoming JavaScript, TypeScript, React, and Node.js events. All our regular meetups are free to attend.',
    },
    {
      question: 'How do I join the JavaScript community in Zurich?',
      answer:
        'Join ZurichJS by attending our free monthly meetups, following us on Twitter @zurichjs, joining our Meetup.com group, or visiting zurichjs.com. We welcome JavaScript developers, TypeScript enthusiasts, and web developers of all skill levels.',
    },
    {
      question: 'Are there TypeScript meetups in Zurich?',
      answer:
        'Yes! ZurichJS covers both JavaScript and TypeScript. Our meetups regularly feature TypeScript talks, workshops, and discussions. Many of our speakers present on TypeScript best practices, type-safe development, and modern TypeScript features.',
    },
    {
      question: 'What topics are covered at ZurichJS meetups?',
      answer:
        'ZurichJS meetups cover JavaScript, TypeScript, React, Vue, Angular, Node.js, web performance, AI/ML integration, serverless, GraphQL, testing, accessibility, and modern web development practices. We also host specialized workshops and Pro Meetups with international speakers.',
    },
  ];

  const structuredData = [generateOrganizationSchema(), generateFAQSchema(faqs)];

  return (
    <Layout>
      <SEO
        title="JavaScript Meetups in Zurich | ZurichJS - Premier JS & TypeScript Community"
        description="Looking for JavaScript meetups in Zurich? Join ZurichJS, the leading JavaScript and TypeScript community in Switzerland. Free monthly meetups, expert speakers, workshops on React, Node.js, Vue, Angular, and web development. Welcome developers from Zurich, Winterthur, Basel, Zug, Konstanz, and nearby cities."
        keywords={[
          'JavaScript Zurich',
          'JavaScript meetup Zurich',
          'TypeScript Zurich',
          'JS meetup Zurich',
          'Web development Zurich',
          'React meetup Zurich',
          'Node.js Zurich',
          'Vue meetup Zurich',
          'Angular Zurich',
          'Frontend development Zurich',
          'Tech meetup Zurich',
          'Programming events Zurich',
          'Software engineering Zurich',
          'Developer community Switzerland',
          'Coding meetup Zurich',
          'JavaScript Switzerland',
          'Tech events Zurich',
          'Developer meetup Zurich',
          'JavaScript events Zurich',
          'TypeScript meetup Switzerland',
        ]}
        geo={{
          region: 'CH-ZH',
          placename: 'Zurich',
          position: '47.3769;8.5417',
        }}
        structuredData={structuredData}
        openGraph={{
          title: 'JavaScript Meetups in Zurich | ZurichJS Community',
          description:
            'Join the premier JavaScript and TypeScript community in Zurich. Free monthly meetups with expert speakers on React, Node.js, Vue, and modern web development.',
          image: 'https://zurichjs.com/api/og/home',
          type: 'website',
          url: 'https://zurichjs.com/meetups/javascript-zurich',
        }}
      />

      <div className="pt-20 bg-gradient-to-br from-js to-js-dark">
        {/* Hero Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-black">
              JavaScript Meetups in Zurich
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-800 max-w-4xl">
              In November 2024, we hosted our first JavaScript meetup in Zurich with nothing but personal
              savings and a belief that this city&apos;s developer community deserved better. Today,{' '}
              <strong>ZurichJS</strong> brings together 900+ developers every month—people who travel from
              Basel, Winterthur, even across borders—because there&apos;s something powerful about being in the
              same room with people who don&apos;t look or think exactly like you.
            </p>

            <div className="bg-white p-8 rounded-lg shadow-lg mb-12">
              <h2 className="text-2xl font-bold mb-4">Why We Started This</h2>
              <p className="text-gray-700 mb-4">
                After the pandemic, Zurich&apos;s developer meetup scene had become a piece of history. Monthly
                gatherings disappeared. The energy was gone. In July 2024, our founders met at a ReactJS
                meetup and realized: the Zurich tech space is filled with potential, and we needed to shape
                that into reality.
              </p>
              <p className="text-gray-700 mb-4">
                Our first event validated everything. 70% confirmed attendance. People showing up not just
                for the tech, but for face-to-face connection across backgrounds, languages, and experience
                levels. Because in an age of online everything, there&apos;s value in seeing who&apos;s actually in
                your city and realizing you belong in this industry.
              </p>
              <p className="text-gray-700">
                Less than a year later, we&apos;re a registered Swiss non-profit association, recognized across
                Europe, hosting consistent events that people trust.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="text-3xl mb-3">900+</div>
                <h3 className="font-bold text-xl mb-2">Active Members</h3>
                <p className="text-gray-700">
                  Developers from Zurich, Winterthur, Basel, and beyond. Consistent 70-80% attendance rate.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="text-3xl mb-3">100%</div>
                <h3 className="font-bold text-xl mb-2">Free Events</h3>
                <p className="text-gray-700">
                  All meetups are free. Non-profit model funded by community donations. No barriers to
                  learning.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="text-3xl mb-3">🤝</div>
                <h3 className="font-bold text-xl mb-2">Real Connections</h3>
                <p className="text-gray-700">
                  From juniors to CTOs. Technical exchange and networking that happens naturally.
                </p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-lg mb-12">
              <h2 className="text-3xl font-bold mb-6">How We Built This</h2>

              <div className="prose prose-lg max-w-none">
                <p className="mb-4">
                  We started with zero. No social media followers. No sponsors. No speakers. Just a LinkedIn
                  page, an inactive Meetup group with no past events, and relationships that let us host in
                  borrowed spaces.
                </p>

                <p className="mb-4">
                  What we did have: a belief that <strong>Trust, Authenticity, and Quality</strong> matter more
                  than scale. That conference-level experiences can happen in relaxed meetup spaces. That
                  everyone should feel included, regardless of background or experience level.
                </p>

                <h3 className="text-2xl font-bold mt-6 mb-4">What Makes This Work</h3>
                <ul className="space-y-3 mb-6">
                  <li>
                    <strong>Consistent Rhythm</strong> - Monthly events that people trust. Same quality, every
                    time. 50-100 RSVPs per meetup with 70-80% actual attendance.
                  </li>
                  <li>
                    <strong>Real Growth</strong> - Organic expansion through word of mouth. New members join
                    monthly while loyal faces keep returning. This balance lets us scale without losing
                    character.
                  </li>
                  <li>
                    <strong>Community Sustains Itself</strong> - After almost every event, new volunteers step
                    forward. Members give feedback. Speakers refine their talks. It&apos;s become our DNA.
                  </li>
                  <li>
                    <strong>Geographic Reach</strong> - People travel from Winterthur, Basel, Zug, St. Gallen,
                    even Konstanz. Our workshops showed us developers will cross borders to be part of this.
                  </li>
                  <li>
                    <strong>Lasting Impact</strong> - Talks live on through recap posts, SEO-indexed event
                    pages, social channels. Content amplifies long after the event ends.
                  </li>
                  <li>
                    <strong>Non-Profit Model</strong> - Registered Swiss association. Funded by community
                    donations. Every franc goes back into better events, better speakers, better experiences.
                  </li>
                </ul>

                <h3 className="text-2xl font-bold mt-6 mb-4">Topics We Cover</h3>
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <h4 className="font-bold mb-2">Frontend Development</h4>
                    <ul className="space-y-1 text-gray-700">
                      <li>• React & Next.js</li>
                      <li>• Vue & Nuxt.js</li>
                      <li>• Angular</li>
                      <li>• Svelte & SvelteKit</li>
                      <li>• Web Components</li>
                      <li>• CSS-in-JS & Tailwind</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold mb-2">Backend & Full Stack</h4>
                    <ul className="space-y-1 text-gray-700">
                      <li>• Node.js & Express</li>
                      <li>• Deno & Bun</li>
                      <li>• GraphQL & REST APIs</li>
                      <li>• Serverless & Edge Computing</li>
                      <li>• Database integration</li>
                      <li>• Real-time applications</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold mb-2">Modern JavaScript</h4>
                    <ul className="space-y-1 text-gray-700">
                      <li>• TypeScript</li>
                      <li>• ES2024+ features</li>
                      <li>• Testing & TDD</li>
                      <li>• Build tools & bundlers</li>
                      <li>• Performance optimization</li>
                      <li>• Web security</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold mb-2">Emerging Technologies</h4>
                    <ul className="space-y-1 text-gray-700">
                      <li>• AI & Machine Learning</li>
                      <li>• WebAssembly</li>
                      <li>• Progressive Web Apps</li>
                      <li>• Web3 & Blockchain</li>
                      <li>• IoT with JavaScript</li>
                      <li>• Mobile development</li>
                    </ul>
                  </div>
                </div>

                <h3 className="text-2xl font-bold mt-6 mb-4">Who Should Join?</h3>
                <p className="mb-4">
                  ZurichJS welcomes everyone interested in JavaScript and web development:
                </p>
                <ul className="space-y-2 mb-6">
                  <li>
                    <strong>Beginners</strong> - Learn from experienced developers and get started with
                    modern web development
                  </li>
                  <li>
                    <strong>Intermediate Developers</strong> - Deepen your knowledge and discover new
                    frameworks and tools
                  </li>
                  <li>
                    <strong>Senior Engineers</strong> - Share your expertise, stay current with latest
                    trends, and network
                  </li>
                  <li>
                    <strong>Career Changers</strong> - Connect with the community and learn about job
                    opportunities
                  </li>
                  <li>
                    <strong>Students</strong> - Get real-world insights and meet potential employers
                  </li>
                  <li>
                    <strong>Tech Leads & CTOs</strong> - Scout talent and stay updated on technology trends
                  </li>
                </ul>

                <h3 className="text-2xl font-bold mt-6 mb-4">Location & Accessibility</h3>
                <p className="mb-4">
                  Our meetups are hosted in central Zurich at tech company offices, making them easily
                  accessible by public transport. We regularly welcome attendees from:
                </p>
                <ul className="grid md:grid-cols-3 gap-2 mb-6">
                  <li>• Zurich (Zürich)</li>
                  <li>• Winterthur</li>
                  <li>• Basel</li>
                  <li>• Zug</li>
                  <li>• St. Gallen</li>
                  <li>• Konstanz (Germany)</li>
                  <li>• Baden</li>
                  <li>• Lucerne</li>
                  <li>• Bern</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Upcoming Events */}
        <UpcomingEvents events={upcomingEvents} />

        {/* FAQ Section */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <div key={index} className="bg-white p-6 rounded-lg shadow-md">
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
            <h2 className="text-3xl font-bold mb-6">Ready to Join Zurich&apos;s JavaScript Community?</h2>
            <p className="text-xl mb-8">
              Don&apos;t miss out on the next JavaScript meetup in Zurich. Join our community today!
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
    revalidate: 3600, // Revalidate every hour
  };
}
