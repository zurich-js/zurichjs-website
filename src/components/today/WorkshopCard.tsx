// Public workshop schedule from conf.zurichjs.com, September 2026.
// Prices and availability are confirmed on each workshop booking page.
const todayWorkshops = [
  {
    title: "Applied AI engineering: beyond the prompt",
    slug: "applied-ai-engineering-beyond-the-prompt",
    speakers: "Tejas Kumar",
    time: "09:00",
    duration: 4,
    room: "Technopark",
  },
  {
    title: "TanStack Query - Beyond the Basics",
    slug: "tanstack-query-beyond-the-basics",
    speakers: "Dominik Dorfmeister",
    time: "09:00",
    duration: 4,
    room: "Livingdocs - Headline",
  },
  {
    title: "AI inside your documents: build a next-gen rich text editor with Tiptap",
    slug: "ai-inside-your-documents-build-a-next-gen-rich-text-editor-with-tiptap",
    speakers: "Arnau Gómez Farell",
    time: "09:00",
    duration: 2,
    room: "Livingdocs - Lead",
  },
  {
    title: "Chaos to Calm: An Advanced Full-Stack Guide to Reliability",
    slug: "chaos-to-calm-an-advanced-full-stack-guide-to-reliability",
    speakers: "Daniel Afonso",
    time: "14:00",
    duration: 4,
    room: "Livingdocs - Headline",
  },
  {
    title: "React: Internals and Advanced Performance Patterns",
    slug: "react-internals-and-advanced-performance-patterns",
    speakers: "Matheus Albuquerque",
    time: "14:00",
    duration: 4,
    room: "Livingdocs - Lead",
  },
  {
    title: "Building and Deploying a Multi-Agent AI D&D with TypeScript",
    slug: "building-and-deploying-a-multi-agent-ai-d-d-with-typescript",
    speakers: "Salih Güler",
    time: "14:00",
    duration: 4,
    room: "Technopark",
  },
];

export default function WorkshopCard() {
  return (
    <section id="workshops" className="scroll-mt-24 space-y-5" aria-labelledby="workshops-title">
      <div>
        <p className="text-sm font-bold text-gray-600">10 SEPTEMBER · ZURICH ENGINEERING DAY</p>
        <h2 id="workshops-title" className="text-xl font-bold text-gray-900">
          Last-minute workshops
        </h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {todayWorkshops.map((workshop) => (
          <a
            key={workshop.slug}
            href={`https://conf.zurichjs.com/workshops/${workshop.slug}?utm_source=zurichjs&utm_medium=today_page&utm_campaign=last_minute_workshops`}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex flex-col rounded-2xl border border-gray-200 bg-gray-50 p-4 transition-colors hover:border-black hover:bg-js/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
            aria-label={`Check availability and book ${workshop.title} (opens in a new tab)`}
          >
            <span
              aria-hidden="true"
              className="absolute right-4 top-3 text-xl text-gray-500 group-hover:text-black"
            >
              ↗
            </span>
            <p className="pr-7 text-xs font-bold text-gray-600">
              {workshop.time} · {workshop.duration} hours
            </p>
            <h3 className="mt-3 text-lg font-bold leading-snug">{workshop.title}</h3>
            <p className="my-2 text-xs font-normal text-gray-600">with {workshop.speakers}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
