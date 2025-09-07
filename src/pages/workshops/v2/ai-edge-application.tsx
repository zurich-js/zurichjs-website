import {Brain, CloudCog, Database, Atom} from "lucide-react";
import React from "react";

import KitAccordion, {KitAccordionItem} from "@/components/kit/KitAccordion";
import KitGrid, {KitGridItem} from "@/components/kit/KitGrid";
import KitList from "@/components/kit/KitList";
import KitPageContent from "@/components/kit/KitPageContent";
import KitPageSection from "@/components/kit/KitPageSection";
import KitSectionContent from "@/components/kit/KitSectionContent";
import KitSectionTitle from "@/components/kit/KitSectionTitle";
import {makeSlug} from "@/components/kit/utils/makeSlug";
import WorkshopHero from "@/components/kit/workshop/WorkshopHero";
import WorkshopVenueInfo from "@/components/kit/workshop/WorkshopVenueInfo";
import PageLayout from '@/components/layout/Layout';
import CancelledCheckout from "@/components/workshop/CancelledCheckout";
import {getSpeakerById} from "@/sanity/queries";
import {Speaker} from "@/types";


const title = "Building a Full-Stack AI Application on the Edge"
const preSectionMap = {
  overview: "Overview",
  learn: "What you'll learn",
  faq: "Frequently Asked Questions",
  price: "Pricing and Registration",
  venue: "Venue Info",
  others: "Other Events"
}

const sections: Record<string, { title: string, slug: string }> = Object.fromEntries(
  Object.entries(preSectionMap).map(([key, title]) => [key, { title, slug: makeSlug(title) }])
)

export default function AiEdgeApplication({ speaker }: { speaker: Speaker }) {
  const harshil = {
    ...speaker,
    company: 'Cloudflare Inc.',
    companyLogo: 'https://cf-assets.www.cloudflare.com/dzlvafdwdttg/69wNwfiY5mFmgpd9eQFW6j/d5131c08085a977aa70f19e7aada3fa9/1pixel-down__1_.svg',
  }

  return (
    <PageLayout>
      <WorkshopHero
        title={title}
        description="Ready to build lightning-fast AI applications that scale globally? In this hands-on workshop, you'll master the Cloudflare Developer Platform by building a complete full-stack AI application from scratch. You'll start with the fundamentals of Cloudflare Workers and progressively add AI capabilities, databases, object storage, and a modern React frontend. By the end, you'll have deployed a production-ready AI application running on Cloudflare's global edge network."
        truncatedDescriptionAnchor="overview"
        date="2025-09-09"
        startTime="18:00"
        endTime="21:00"
        durationString="3 hours"
        maxSeats={30}
        seatsLeft={11}
        speaker={harshil}
      />

      <KitPageContent toc={sections} title={title}>
        <KitPageSection id={sections.overview.slug} layout="full">
          <KitSectionContent>
            <p className="text-kit-base">In this hands-on workshop, you&#39;ll master Cloudflare Workers, AI integration, and modern React to deploy a production-ready app on the edge.</p>
            <KitList
              className="mt-1"
              listStyle="badge-check"
              items={[
                'Build and deploy from scratch',
                'Integrate AI capabilities',
                'Learn edge computing best practices',
                'Walk away with a working app'
              ]}
            />
          </KitSectionContent>
        </KitPageSection>

        <KitPageSection id={sections.learn.slug} layout="section">
          <KitSectionTitle>
            What you&#39;ll learn
            <a href="" className="text-kit-sm text-zurich block mt-2 underline hover:opacity-70 w-fit">See full syllabus</a>
          </KitSectionTitle>
          <KitSectionContent>
            <KitGrid>
              <KitGridItem icon={CloudCog} title="Cloudflare Workers & Edge Computing">
                Understand Workers and the Cloudflare Developer Platform, and build & deploy from scratch
              </KitGridItem>
              <KitGridItem icon={Brain} title="AI Integration">
                Integrate AI capabilities using Workers AI with model selection and prompt engineering
              </KitGridItem>
              <KitGridItem icon={Database} title="Data & Storage Solutions">
                Implement D1 databases and R2 object storage for complete data persistence.
              </KitGridItem>
              <KitGridItem icon={Atom} title="Modern React">
                Build interactive UIs with React and Cloudflare Vite plugin for seamless deployment.
              </KitGridItem>
            </KitGrid>
          </KitSectionContent>
        </KitPageSection>

        <KitPageSection id={sections.faq.slug} layout="section">
          <KitSectionTitle>
            Frequently asked qestions
          </KitSectionTitle>
          <KitSectionContent>
            <KitAccordion>
              <KitAccordionItem title="Are there group discounts? I could bring a friend..." content="content" />
              <KitAccordionItem title="Can I get a discount if I'm unemployed?">
                <p className="mb-1">We hold a strong belief: <b><i>Never let finances be a blocker to learning</i></b></p>
                <p>We know everyone’s situation is different, so if you ever want to join one of our paid events but the cost is a challenge, reach out to us.
                We’ll do our best to make it possible for you to attend, network, learn, and thrive. Email us at&nbsp;
                  <a href="mailto:hello@zurichjs.com">hello@zurichjs.com</a>
                </p>
              </KitAccordionItem>
              <KitAccordionItem title="How long is the workshop?">
                <p>
                  The hands-on time is 2.5 hours, separated by a break in between and we’ll provide refreshments and snacks throughout. If you require any special accommodations, reach out to us and we’ll make it work:&nbsp;
                  <a href="mailto:hello@zurichjs.com">hello@zurichjs.com</a>
                </p>
              </KitAccordionItem>
              <KitAccordionItem title="Is this workshop for me?">
                <p>Working on the Frontend, Backend, Full-stack, or even DevOps?</p>
                <p>Interested in Edge computing, Cloudflare workers, AI integration, object storage?<br/>
                  <b>Then it’s a match! 🎉</b>
                </p>
              </KitAccordionItem>
              <KitAccordionItem title="Anything I need to prepare ahead of the workshop?">
                <ol>
                  <li>Bring a Laptop with at least 8 GB of RAM. And make sure you have admin rights</li>
                  <li>Get <a href="https://docs.npmjs.com/downloading-and-installing-node-js-and-npm" target="_blank">Node.js 18+</a>, or, better yet, use <a href="https://github.com/nvm-sh/nvm" target="_blank">nvm</a> to easily switch between node versions.</li>
                  <li>Create a <a href="https://dash.cloudflare.com/sign-up" target="_blank">Cloudflare account</a>. The Free Tier is sufficient for the workshop.</li>
                </ol>
              </KitAccordionItem>
              <KitAccordionItem title="Is the venue wheelchair accessible?">
                <p>Yes, the venue is wheelchair accessible. If you have any specific accessibility needs or concerns, please let us know in advance so we can make the necessary arrangements to ensure your comfort and accessibility during the workshop.</p>
              </KitAccordionItem>
              <KitAccordionItem title="Can I pay cash? or Bitcoin?">
                <p>Our website allows you a multitude of payment options through Stripe. You&#39;ll see these at checkout.</p>
                <p>But yes, you can also pay cash or on-site through Credit Card. If you do pay on-site, be aware that prepaid tickets have priority for seats.</p>
              </KitAccordionItem>
            </KitAccordion>
          </KitSectionContent>
        </KitPageSection>

        <KitPageSection id={sections.price.slug} layout="section">
          <KitSectionTitle>
            Pricing and Registration
          </KitSectionTitle>
          <KitSectionContent>
            <CancelledCheckout
              workshopId="ai-edge-application"
              workshopTitle={title}
            />
          </KitSectionContent>
        </KitPageSection>

        <KitPageSection id={sections.venue.slug} layout="section">
          <KitSectionTitle>
            Venue info
          </KitSectionTitle>
          <KitSectionContent>
            <WorkshopVenueInfo
              location="Smallpdf AG"
              address="Steinstrasse 21, 8003 Zürich"
              floor={2}
              date="2025-09-09"
              startTime="18:00"
            />
          </KitSectionContent>
        </KitPageSection>

        <KitPageSection id={sections.others.slug} layout="full">
          <KitSectionTitle>
            Can&#39;t make it?
            <p className="text-kit-sm mt-1">Check out our other events</p>
          </KitSectionTitle>
        </KitPageSection>
      </KitPageContent>
    </PageLayout>
  )
}


export async function getStaticProps() {
  // Fetch the speaker data using the getSpeakerById function
  const speaker = await getSpeakerById('speaker-c6fff8ee-97c5-4db1-8d6c-fb90ad1376e9');

  if (!speaker) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      speaker: {
        ...speaker,
        title: !speaker.title ? '' : speaker.title.split('@').map(part => part.trim())[0],
        company: speaker.company || (!!speaker.title ? speaker.title.split('@').map(part => part.trim())[1] : ''),
      }
    },
    revalidate: 60, // Revalidate the page every 60 seconds
  };
}
