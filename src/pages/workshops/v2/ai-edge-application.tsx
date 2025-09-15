import {Brain, CloudCog, Database, Atom} from "lucide-react";
import React from "react";

import PageLayout from '@/components/layout/Layout';
import KitList from "@/components/v2/kit/KitList";
import {getActivePricingPhase, getTotalDiscountForPhase} from "@/components/v2/kit/utils/dateOperations";
import {calculateCouponDiscount} from "@/components/v2/kit/utils/discountOperations";
import WorkshopSectionFAQ from "@/components/v2/workshop/sections/WorkshopSectionFAQ";
import WorkshopSectionOverview from "@/components/v2/workshop/sections/WorkshopSectionOverview";
import WorkshopSectionPricing, {WorkshopSectionPricingProps} from "@/components/v2/workshop/sections/WorkshopSectionPricing";
import WorkshopSectionVenueInfo from "@/components/v2/workshop/sections/WorkshopSectionVenueInfo";
import WorkshopSectionWhatYoullLearn from "@/components/v2/workshop/sections/WorkshopSectionWhatYoullLearn";
import WorkshopContent from "@/components/v2/workshop/WorkshopContent";
import WorkshopHero from "@/components/v2/workshop/WorkshopHero";
import {useCouponEnhanced} from "@/hooks/useCouponEnhanced";
import {getSpeakerById} from "@/sanity/queries";
import {Speaker} from "@/types";

export default function AiEdgeApplication({ speaker, config }: { speaker: Speaker, config: WorkshopSectionPricingProps }) {

  const { couponDetails } = useCouponEnhanced({ workshopId: config.workshop.id, workshopTitle: config.workshop.title });
  const currentPricingTier= getActivePricingPhase(config.prices.phases);
  const couponDiscountInfo = calculateCouponDiscount(couponDetails);
  const totalDiscount =  getTotalDiscountForPhase({ phase: currentPricingTier,  couponPercent: couponDiscountInfo.percent,  couponAmount: couponDiscountInfo.amount,  basePrice: config.prices.basePrice });

  return (
    <PageLayout>
      <WorkshopHero
        title={config.workshop.title}
        description="Ready to build lightning-fast AI applications that scale globally? In this hands-on workshop, you'll master the Cloudflare Developer Platform by building a complete full-stack AI application from scratch. You'll start with the fundamentals of Cloudflare Workers and progressively add AI capabilities, databases, object storage, and a modern React frontend. By the end, you'll have deployed a production-ready AI application running on Cloudflare's global edge network."
        truncatedDescriptionAnchor="overview"
        date="2025-11-12"
        startTime="18:00"
        endTime="21:00"
        maxSeats={30}
        seatsLeft={11}
        speaker={speaker}
        currentPricing={currentPricingTier}
        totalDiscount={totalDiscount}
      />

      <WorkshopContent title={config.workshop.title}>
        <WorkshopSectionOverview>
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
        </WorkshopSectionOverview>

        <WorkshopSectionWhatYoullLearn
          gridItems={[
            {
              icon: CloudCog,
              title: "Cloudflare Workers & Edge Computing",
              description: "Understand Workers and the Cloudflare Developer Platform, and build & deploy from scratch"
            },
            {
              icon: Brain,
              title: "AI Integration",
              description: "Integrate AI capabilities using Workers AI with model selection and prompt engineering"
            },
            {
              icon: Database,
              title: "Data & Storage Solutions",
              description: "Implement D1 databases and R2 object storage for complete data persistence."
            },
            {
              icon: Atom,
              title: "Modern React",
              description: "Build interactive UIs with React and Cloudflare Vite plugin for seamless deployment."
            }
          ]}
          syllabusContent={
            'hello'
          }
        />

        <WorkshopSectionFAQ
          items={[
            ...(config.discountFlags.groupDiscount ? [{
              title: "Are there group discounts? I could bring a friend...",
              content: `For groups of 2 or more, we offer an additional discount of ${config.discounts.workshopGroup}% on each ticket.`
              //For groups of 5 or more, the discount increases to ${GROUP_DISCOUNT_5PLUS}% per ticket.
            }] : []),
            {
              title: "Can I get a discount if I'm unemployed?",
              content: (
                <>
                  <p className="mb-1">We hold a strong belief: <b><i>Never let finances be a blocker to learning</i></b></p>
                  <p>We know everyone’s situation is different, so if you ever want to join one of our paid events but the cost is a challenge, reach out to us.
                    We’ll do our best to make it possible for you to attend, network, learn, and thrive. Email us at&nbsp;
                    <a href="mailto:hello@zurichjs.com">hello@zurichjs.com</a>
                  </p>
                </>
              )
            },
            {
              title: "How long is the workshop?",
              content: (
                <p>
                  The hands-on time is 2.5 hours, separated by a break in between and we’ll provide refreshments and snacks throughout. If you require any special accommodations, reach out to us and we’ll make it work:&nbsp;
                  <a href="mailto:hello@zurichjs.com">hello@zurichjs.com</a>
                </p>
              )
            },
            {
              title: "Is this workshop for me?",
              content: (
                <>
                  <p>Working on the Frontend, Backend, Full-stack, or even DevOps?</p>
                  <p>Interested in Edge computing, Cloudflare workers, AI integration, object storage?<br/>
                    <b>Then it’s a match! 🎉</b>
                  </p>
                </>
              )
            },
            {
              title: "Anything I need to prepare ahead of the workshop?",
              content: (
                <ol>
                  <li>Bring a Laptop with at least 8 GB of RAM. And make sure you have admin rights</li>
                  <li>Get <a href="https://docs.npmjs.com/downloading-and-installing-node-js-and-npm" target="_blank">Node.js 18+</a>, or, better yet, use <a href="https://github.com/nvm-sh/nvm" target="_blank">nvm</a> to easily switch between node versions.</li>
                  <li>Create a <a href="https://dash.cloudflare.com/sign-up" target="_blank">Cloudflare account</a>. The Free Tier is sufficient for the workshop.</li>
                </ol>
              )
            },
            {
              title: "Is the venue wheelchair accessible?",
              content: (
                <p>Yes, the venue is wheelchair accessible. If you have any specific accessibility needs or concerns, please <a href="mailto:hello@zurichjs.com">let us know in advance</a> so we can make the necessary arrangements to ensure your comfort and accessibility during the workshop.</p>
              )
            },
            {
              title: "Can I pay cash? or Bitcoin?",
              content: (
                <>
                  <p>Our website allows you a multitude of payment options through Stripe. You&#39;ll see these at checkout.</p>
                  <p>But yes, you can also pay cash or on-site through Credit Card. If you do pay on-site, be aware that prepaid tickets have priority for seats.</p>
                </>
              )
            },
          ]}
        />

        <WorkshopSectionPricing
          currentPricing={currentPricingTier}
          {...config}
        />

        <WorkshopSectionVenueInfo
          location="Smallpdf AG"
          address="Steinstrasse 21, 8003 Zürich"
          floor={2}
          date="2025-09-09"
          startTime="18:00"
        />

        {/*<KitPageSection id={sections.others.slug} layout="full">*/}
        {/*  <KitSectionTitle>*/}
        {/*    {sections.others.title}*/}
        {/*    <p className="text-kit-sm mt-1">Check out our other events</p>*/}
        {/*  </KitSectionTitle>*/}
        {/*</KitPageSection>*/}
      </WorkshopContent>
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

  const config = {
    workshop: {
      id: 'ai-edge-application',
      title: 'Building a Full-Stack AI Application on the Edge',
    },
    discountFlags: {
      phaseExpiry: true,
      groupDiscount: true,
      voucherDiscount: true,
      tshirtVoucherDiscount: true,
      tshirtBundleDiscount: true,
      tshirtQuantityDiscount: true,
    },
    prices: {
      basePrice: 125,
      canBeGifted: true,
      tshirts: {
        price: 25,
        stock: [
          { size: 'S', quantity: 10 },
          { size: 'M', quantity: 10 },
          { size: 'L', quantity: 10 },
          { size: 'XL', quantity: 10 },
          { size: '2XL', quantity: 10 },
          { size: '3XL', quantity: 10 }
        ]
      },
      phases: [
        {
          date: '2025-09-15',
          discount: 30,
          time: '23:59',
          title: 'Early bird'
        },
        {
          date: '2025-10-14',
          discount: 20,
          time: '23:59',
          title: 'Standard'
        },
        {
          date: '2025-11-12',
          discount: 0,
          time: '17:59',
          title: 'Last minute'
        }
      ]
    },
    discounts: {
      workshopGroup: {
        1: 0,
        2: 10,
        5: 15
      },
      tshirtBundle: 10,
      tshirtQuantity: {
        1: 0,
        2: 10,
        5: 20
      }
    },
    seats: {
      total: 30,
      remaining: 11
    }
  }

  return {
    props: {
      speaker: {
        ...speaker,
        title: !speaker.title ? '' : speaker.title.split('@').map(part => part.trim())[0],
        company: 'Cloudflare Inc.',
        companyLogo: 'https://cf-assets.www.cloudflare.com/dzlvafdwdttg/69wNwfiY5mFmgpd9eQFW6j/d5131c08085a977aa70f19e7aada3fa9/1pixel-down__1_.svg',
      },
      config,
    },
    revalidate: 60, // Revalidate the page every 60 seconds
  };
}
