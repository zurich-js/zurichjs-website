import { Code, Users, Lightbulb, Globe, Star } from "lucide-react";
import type { JSX } from "react";

import Section from "@/components/Section";
import { FadeIn } from "@/components/ui/FadeIn";

interface CommunityValue {
  icon: JSX.Element;
  title: string;
  description: string;
}

export default function CommunityValues() {
  const values: CommunityValue[] = [
    {
      icon: <Code size={24} />,
      title: "Epic Knowledge Sharing",
      description:
        "Got JS wisdom? Share it! We believe in freely exchanging ideas so everyone can level up their JavaScript superpowers! No gatekeeping, just pure learning goodness.",
    },
    {
      icon: <Users size={24} />,
      title: "Everyone Belongs Here",
      description:
        "From JS newbies to seasoned pros - our community welcomes developers of all backgrounds, experience levels, and coding styles with open arms! Your unique perspective matters!",
    },
    {
      icon: <Lightbulb size={24} />,
      title: "Cutting-Edge Innovation",
      description:
        "We're all about exploring those shiny new JS frameworks, libraries, and techniques! Stay ahead of the curve and geek out with fellow tech enthusiasts on the coolest JS innovations!",
    },
    {
      icon: <Globe size={24} />,
      title: "Zurich × Global JS Scene",
      description:
        "Proudly rooted in our beautiful city of Zurich, but connected to the worldwide JavaScript ecosystem. We bring global JS trends to our local community and showcase Swiss JS talent!",
    },
  ];

  return (
    <Section variant="gradient">
      <FadeIn className="text-center mb-12">
        <p className="text-[13px] font-bold tracking-[0.08em] uppercase text-[var(--zjs-blue)] mb-3 inline-flex items-center gap-2">
          <span className="w-6 h-[1.5px] bg-[var(--zjs-blue)] inline-block" />
          What makes our JS community special
        </p>

        <h2 className="text-[var(--zjs-fs-5xl)] font-extrabold tracking-[var(--zjs-tracking-tight)] leading-[var(--zjs-lh-tight)] mb-3">
          Our JavaScript Community Values
        </h2>
        <p className="max-w-[60ch] mx-auto text-[var(--zjs-fs-lg)] text-[var(--zjs-gray-600)] leading-[1.55]">
          These aren&apos;t just words on a screen - they&apos;re the core principles that make
          ZurichJS the most vibrant, welcoming, and knowledge-packed JavaScript community in
          Switzerland!
        </p>
      </FadeIn>

      <div className="grid grid-cols-[repeat(auto-fit,_minmax(280px,1fr))] gap-5">
        {values.map((value, index) => (
          <FadeIn
            key={index}
            delay={index * 80}
            className="bg-white rounded-[20px] p-8 relative overflow-hidden border border-transparent hover:border-[var(--zjs-blue)] transition-colors group"
          >
            <div className="absolute -right-4 -bottom-4 opacity-[0.03]">
              <Star size={100} />
            </div>

            <div className="w-12 h-12 bg-[var(--zjs-blue-soft)] text-[var(--zjs-blue)] rounded-xl flex items-center justify-center mb-5 relative z-10">
              {value.icon}
            </div>

            <h3 className="text-[var(--zjs-fs-xl)] font-bold tracking-[var(--zjs-tracking-snug)] mb-2.5 relative z-10">
              {value.title}
            </h3>
            <p className="text-sm text-[var(--zjs-gray-600)] leading-[1.55] relative z-10">
              {value.description}
            </p>
          </FadeIn>
        ))}
      </div>

      <FadeIn delay={400} className="mt-12 text-center">
        <p className="text-xl font-bold">Sounds like your kind of community?</p>
        <p className="text-lg font-medium">
          <a
            href="https://www.meetup.com/zurich-js"
            target="_blank"
            className="underline hover:text-[var(--zjs-blue)] transition-colors"
            data-flow="F1.values-cta"
          >
            Join us at our next meetup
          </a>{" "}
          and experience the ZurichJS magic!
        </p>
      </FadeIn>
    </Section>
  );
}
