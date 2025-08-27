import KitHero from "@/components/kit/KitHero";
import WorkshopActionsSlot from "@/components/kit/workshop/WorkshopActionsSlot";
import {WorkshopDetailsRow} from "@/components/kit/workshop/WorkshopDetailsRow";
import WorkshopSpeakerCard from "@/components/kit/workshop/WorkshopSpeakerCard";
import WorkshopTopSlot from "@/components/kit/workshop/WorkshopTopSlot";
import PageLayout from '@/components/layout/Layout';
import Section from "@/components/Section";
import {getSpeakerById} from "@/sanity/queries";
import {Speaker} from "@/types";

export default function EdgeApplication({ speaker }: { speaker: Speaker }) {
  const harshil = {
    ...speaker,
    company: 'Cloudflare Inc.',
    companyLogo: 'https://cf-assets.www.cloudflare.com/dzlvafdwdttg/69wNwfiY5mFmgpd9eQFW6j/d5131c08085a977aa70f19e7aada3fa9/1pixel-down__1_.svg',
  }

  return (
    <PageLayout>
      <KitHero
        title="Building a Full-Stack AI Application on the Edge"
        description="Ready to build lightning-fast AI applications that scale globally? In this hands-on workshop, you'll master the Cloudflare Developer Platform by building a complete full-stack AI application from scratch. You'll start with the fundamentals of Cloudflare Workers and progressively add AI capabilities, databases, object storage, and a modern React frontend. By the end, you'll have deployed a production-ready AI application running on Cloudflare's global edge network."
        truncatedDescriptionAnchor='overview'
        slots={{
          top: <WorkshopTopSlot />,
          details: (
              <WorkshopDetailsRow
                date="2025-09-09"
                startTime="18:00"
                endTime="21:00"
                duration="3 hours"
                maxSeats={20}
                seatsLeft={5}
                discountPeriodTitle="Early Bird"
                discountPeriodEndDate="2025-09-01"
              />
          ),
          actions: <WorkshopActionsSlot />,
          card: (
              <WorkshopSpeakerCard speaker={harshil} />
          ),
        }}
      />

      <Section variant="white" id="overview">
        Pending
      </Section>

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
