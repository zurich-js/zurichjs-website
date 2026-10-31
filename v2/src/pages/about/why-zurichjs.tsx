import { Layout } from '@/components/layout/Layout';
import { PageOpening } from '@/components/layout/PageOpening';
import { Button } from '@/components/ui/Button';
import { useNextMeetupHref } from '@/lib/hooks';

const H = ({ children }: { children: string }) => <h2 className="m-0 mt-[clamp(28px,3vw,40px)] text-[clamp(24px,2.4vw,30px)] leading-[1.2] font-bold">{children}</h2>;
const P = ({ children }: { children: React.ReactNode }) => <p className="m-0 text-[18px] leading-[1.65] text-ink-2 text-pretty">{children}</p>;
const L = ({ items }: { items: string[] }) => (
  <ul className="m-0 pl-5 text-[18px] leading-[1.65] text-ink-2 flex flex-col gap-1">
    {items.map((i) => (
      <li key={i}>{i}</li>
    ))}
  </ul>
);

/** The owner's full "Why it's called ZurichJS" post, lightly edited for the page. */
export default function WhyPage() {
  const nextHref = useNextMeetupHref();
  return (
    <Layout
      title="Why it’s called ZurichJS"
      description="People ask this surprisingly often. The short answer: JavaScript is the common ground that brought us together."
      opening={<PageOpening title="Why it’s called ZurichJS" crumb={{ label: 'About', href: '/about', here: 'Why it’s called ZurichJS' }} sub="People ask this surprisingly often. Why ZurichJS? Why not ZurichTS? Why not Zurich Web? Why not Zurich Engineering or Zurich Tech?" />}
    >
      <main className="px-gut pt-[clamp(40px,5vw,72px)] pb-[clamp(64px,8vw,112px)]">
        <article className="max-w-[720px] flex flex-col gap-4">
          <P>
            <b className="text-black">The short answer is simple: JavaScript is the common ground that brought us together.</b>
          </P>
          <P>The longer answer is more interesting, but what’s even more interesting is that we understood it after we named it.</P>

          <H>It started with something simple</H>
          <P>Bogdan and Faris first crossed paths at the Zürich ReactJS Meetup. At the time, the ecosystem in Zurich already had a few communities:</P>
          <L items={['Zürich ReactJS Meetup', 'Angular Zurich', 'Web Zurich', 'Svelte Society Zurich']} />
          <P>All great communities, with a rich history, and each focused on a specific slice of the web ecosystem. But it felt like something was missing.</P>
          <P>React is a library. Angular is a framework. Vue had a meetup at some point but it had gone silent for a while. All of them orbit the same gravity well. JavaScript. That’s the core everything eventually touches.</P>
          <P>And for Bogdan and Faris, JavaScript is also the language we built our careers on. So the name was born from this connection. ZurichJS.</P>
          <P>At the time, it was mostly practical. A neutral home base that wasn’t tied to one framework, and most importantly, the Meetup.com group was free! What we didn’t fully realise then is how much that name would come to represent later.</P>

          <H>JavaScript is bigger than the browser</H>
          <P>For a long time JavaScript meant one thing. The browser. But over the past decade that boundary completely disappeared. JavaScript moved everywhere:</P>
          <L items={['Servers with Node.js and new runtimes', 'Infrastructure with tools and cloud SDKs', 'CI/CD pipelines', 'Native desktop and mobile applications', 'CLI applications with tools like Ink', 'Databases and ORMs', 'Edge runtimes', 'Even parts of operating systems']} />
          <P>For better or worse, JavaScript is everywhere now. You can argue about performance. You can argue about multi-threading (Matteo Collina will happily argue about all of that). But none of that changes one thing: JavaScript became the most accessible programming language on the planet. You can start with a browser tab and end up building distributed systems.</P>

          <H>Accessibility changes who gets to build</H>
          <P>One of the reasons we leaned into the JavaScript identity is that it lowers barriers. People can move across the stack more easily. Frontend developers write backend services. Backend engineers explore UI. People build tools, scripts, and infrastructure.</P>
          <P>Seldom because JavaScript is the best tool for everything. But because it’s approachable. And that approachability expands who gets to participate. That philosophy naturally shaped the meetup, and now it is shaping the conference.</P>

          <H>ZurichJS isn’t just about JavaScript talks</H>
          <P>People sometimes ask before submitting a talk: “Does it have to be about JavaScript?” Not really. We’ve had talks about:</P>
          <L items={['Laravel (thank you, Bert De Swaef)', 'Career development (thanks to Alex Suzuki)', 'Infrastructure (naturally, brought to you by Hugo Sousa)', 'Developer experience', 'Observability (thanks to the power team, Dani Coll and Indermohan Singh)', 'Systems architecture']} />
          <P>One of our favourite moments was when Bert De Swaef came and gave a Laravel talk at a JavaScript meetup. And it worked perfectly. We’ve come to learn that most of the ideas developers care about are beyond the scope of a single language. They are about building systems, running teams, shipping software and learning from each other. JavaScript simply happens to be the bridge connecting a lot of those worlds.</P>

          <H>The name ended up meaning more than we expected</H>
          <P>In the beginning, ZurichJS was just a name. Now it’s a philosophy. JavaScript represents something larger than the language itself: accessibility, experimentation, cross-stack thinking, a welcoming entry point into software.</P>
          <P>That’s the spirit we want ZurichJS to embody. A place where people from different backgrounds can show up, share ideas, and learn from each other.</P>
          <P>
            <b className="text-black">JavaScript just happens to be the banner we stand under. And it turns out that banner is wide enough to welcome everyone.</b>
          </P>

          <div className="flex flex-wrap gap-3 pt-6">
            <Button href={nextHref} variant="black">
              See the next meetup
            </Button>
            <Button href="/cfp" variant="white">
              Propose a talk
            </Button>
          </div>
        </article>
      </main>
    </Layout>
  );
}
