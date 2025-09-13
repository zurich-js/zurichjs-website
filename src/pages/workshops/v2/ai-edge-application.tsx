import { useUser } from "@clerk/nextjs";
import {Brain, CloudCog, Database, Atom, Check, Plus} from "lucide-react";
import React from "react";

import KitButton from "@/components/kit/button/KitButton";
import KitAccordion, {KitAccordionItem} from "@/components/kit/KitAccordion";
import KitGrid, {KitGridItem} from "@/components/kit/KitGrid";
import KitInputText from "@/components/kit/KitInputText";
import KitList from "@/components/kit/KitList";
import KitPageContent from "@/components/kit/KitPageContent";
import KitPageSection from "@/components/kit/KitPageSection";
import KitSectionContent from "@/components/kit/KitSectionContent";
import KitSectionTitle from "@/components/kit/KitSectionTitle";
import KitSelect from "@/components/kit/KitSelect";
import {getCurrentPricingPeriod, PricingConfig} from "@/components/kit/utils/dateOperations";
import {calculateTotalDiscount, calculateCouponDiscount} from "@/components/kit/utils/discountOperations";
import {makeSlug} from "@/components/kit/utils/makeSlug";
import WorkshopHero from "@/components/kit/workshop/WorkshopHero";
import WorkshopPricingExpiration from "@/components/kit/workshop/WorkshopPricingExpiration";
import WorkshopPricingItemRow from "@/components/kit/workshop/WorkshopPricingItemRow";
import WorkshopPriceTitle from "@/components/kit/workshop/WorkshopPricingItemTitle";
import {WorkshopPricingSummary, WorkshopPricingTotals} from "@/components/kit/workshop/WorkshopPricingSummary";
import WorkshopVenueInfo from "@/components/kit/workshop/WorkshopVenueInfo";
import PageLayout from '@/components/layout/Layout';
import CancelledCheckout from "@/components/workshop/CancelledCheckout";
import { useCouponEnhanced } from "@/hooks/useCouponEnhanced";
import {getSpeakerById} from "@/sanity/queries";
import {Speaker} from "@/types";

const WORKSHOP_PRICE = 125;
const EARLY_BIRD_DISCOUNT = 20;
const STANDARD_DISCOUNT = 10;

const GROUP_DISCOUNT = 10;
const GROUP_DISCOUNT_5PLUS = 20;

const TSHIRT_DISCOUNT = 20;
const TSHIRT_PRICE = 25;
const TSHIRT_BUNDLE_DISCOUNT = 10;
const TSHIRT_BUNDLE_DISCOUNT_3PLUS = 15;
const TSHIRT_QTY_DISCOUNT = 10;


const title = "Building a Full-Stack AI Application on the Edge"
const preSectionMap = {
  overview: "Overview",
  learn: "What you'll learn",
  faq: "Frequently Asked Questions",
  price: "Pricing and Registration",
  venue: "Venue Info",
  others: "Other Events"
}

const pricing: PricingConfig = {
  early: { date: '2025-09-15', discount: EARLY_BIRD_DISCOUNT, time: '23:59', title: 'Early bird', isOffer: true },
  standard: { date: '2025-10-14', discount: STANDARD_DISCOUNT, time: '23:59', title: 'Standard' },
  late: { date: '2025-11-12', discount: 0, time: '17:59', title: 'Last minute' },
}

const sections: Record<string, { title: string, slug: string }> = Object.fromEntries(
  Object.entries(preSectionMap).map(([key, title]) => [key, { title, slug: makeSlug(title) }])
)

const sizes = ['S', 'M', 'L', 'XL', '2XL', '3XL'];


export default function AiEdgeApplication({ speaker }: { speaker: Speaker }) {
  const { user } = useUser();
  const harshil = {
    ...speaker,
    company: 'Cloudflare Inc.',
    companyLogo: 'https://cf-assets.www.cloudflare.com/dzlvafdwdttg/69wNwfiY5mFmgpd9eQFW6j/d5131c08085a977aa70f19e7aada3fa9/1pixel-down__1_.svg',
  }

  const [qty, setQty] = React.useState(1);
  const [tshirts, setTshirts] = React.useState<{ size: string; qty: number }[]>([]);
  const firstTshirtSizeThatIsntAddedYet = sizes.find(size => !tshirts.find(t => t.size === size)) || 'S';

  // Use coupon hook
  const {
    couponCode,
    setCouponCode,
    applyCoupon,
    isCouponApplied,
    isCouponCodeValid,
    handleKeyPress,
    couponDetails,
    isLoadingCoupon,
    couponError,
    couponStatusText,
    isFreeWorkshop,
    isSingleUseCoupon
  } = useCouponEnhanced({
    workshopId: 'ai-edge-application',
    workshopTitle: title
  });

  // Memoized handlers to prevent re-renders
  const handleTshirtQtyChange = React.useCallback((index: number) => (v: string) => {
    const newQty = parseInt(v) || 1;
    setTshirts(prev => prev.map((t, i) =>
      i === index ? { ...t, qty: newQty } : t
    ));
  }, []);

  const handleTshirtSizeChange = React.useCallback((index: number) => (v: string) => {
    setTshirts(prev => prev.map((t, i) =>
      i === index ? { ...t, size: v } : t
    ));
  }, []);

  // Get available sizes for a specific t-shirt row (excludes sizes used by other rows)
  const getAvailableSizes = React.useCallback((currentIndex: number) => {
    const usedSizes = tshirts
      .filter((_, i) => i !== currentIndex) // Exclude current row
      .map(t => t.size);

    return sizes
      .filter(size => !usedSizes.includes(size))
      .map(size => ({ value: size, label: size }));
  }, [tshirts]);

  const totalTshirtQuantity = tshirts.reduce((sum, t) => sum + t.qty, 0);

  const currentPricingTier = React.useMemo(()=> getCurrentPricingPeriod(pricing, '2025-11-12', '17:59'), [pricing]);
  const couponDiscountInfo = calculateCouponDiscount(couponDetails);
  const totalDiscountInfo = React.useMemo(() => calculateTotalDiscount(
    WORKSHOP_PRICE,
    currentPricingTier,
    couponDetails,
    isCouponApplied
  ), [currentPricingTier, couponDetails, isCouponApplied]);


  const pricingSections = [
    {
      header: {
        title: "Workshop tickets",
        quantity: qty,
        price: WORKSHOP_PRICE
      },
      discounts: [
        ...(currentPricingTier.discount > 0 ? [{
          title: currentPricingTier.title,
          quantity: qty,
          discount: currentPricingTier.discount
        }] : []),
        ...(couponDiscountInfo.percent && couponDiscountInfo.percent > 0 ? [{
          title: "Voucher",
          quantity: qty,
          discount: couponDiscountInfo.percent
        }] : []),
        ...(qty > 1 ? [{
          title: "Group",
          quantity: qty,
          discount: qty >= 5 ? GROUP_DISCOUNT_5PLUS : GROUP_DISCOUNT
        }] : [])
      ]
    },
    ...(tshirts.length > 0 ? [{
      header: {
        title: "T-Shirts",
        quantity: totalTshirtQuantity,
        price: TSHIRT_PRICE
      },
      discounts: [
        {
          title: "Workshop bundle",
          quantity: totalTshirtQuantity,
          discount: TSHIRT_BUNDLE_DISCOUNT
        },
        ...(couponDiscountInfo.percent && couponDiscountInfo.percent > 0 ? [{
          title: "Voucher",
          quantity: totalTshirtQuantity,
          discount: couponDiscountInfo.percent
        }] : []),
        ...(totalTshirtQuantity > 1 ? [{
          title: "Quantity",
          quantity: totalTshirtQuantity,
          discount: totalTshirtQuantity >= 3 ? TSHIRT_BUNDLE_DISCOUNT_3PLUS : TSHIRT_QTY_DISCOUNT
        }] : [])
      ]
    }] : [])
  ]

  return (
    <PageLayout>
      <WorkshopHero
        title={title}
        description="Ready to build lightning-fast AI applications that scale globally? In this hands-on workshop, you'll master the Cloudflare Developer Platform by building a complete full-stack AI application from scratch. You'll start with the fundamentals of Cloudflare Workers and progressively add AI capabilities, databases, object storage, and a modern React frontend. By the end, you'll have deployed a production-ready AI application running on Cloudflare's global edge network."
        truncatedDescriptionAnchor="overview"
        date="2025-11-12"
        startTime="18:00"
        endTime="21:00"
        durationString="3 hours"
        maxSeats={30}
        seatsLeft={11}
        speaker={harshil}
        rsvp={sections.price.slug}
        pricing={pricing}
        totalDiscountPc={totalDiscountInfo.percent}
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
            {sections.learn.title}
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
            {sections.faq.title}
          </KitSectionTitle>
          <KitSectionContent>
            <KitAccordion>
              <KitAccordionItem title="Are there group discounts? I could bring a friend...">
                For groups of 2 or more, we offer an additional discount of {GROUP_DISCOUNT}% on each ticket. For groups of 5 or more, the discount increases to {GROUP_DISCOUNT_5PLUS}% per ticket.
              </KitAccordionItem>
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
            {sections.price.title}
          </KitSectionTitle>
          <KitSectionContent className="space-y-8 pt-4">
            <CancelledCheckout
              workshopId="ai-edge-application"
              workshopTitle={title}
            />
            <div className="space-y-4">
              {currentPricingTier.isOffer && (
                <WorkshopPricingItemRow
                  left={
                    <WorkshopPriceTitle title={currentPricingTier.title} discount={currentPricingTier.discount}>
                      Limited time
                    </WorkshopPriceTitle>
                  }
                  right={
                    <WorkshopPricingExpiration
                      date={currentPricingTier.date}
                      time={currentPricingTier.time}
                    />
                  }
                />
              )}
                <WorkshopPricingItemRow
                  left={
                     <WorkshopPriceTitle
                       title="Voucher"
                       discount={couponDiscountInfo.percent || undefined}
                     >
                      {couponStatusText || (user ? '' : 'Sign in for community discount')}
                    </WorkshopPriceTitle>
                  }
                  right={
                    <div className="grid grid-cols-[1fr_120px] gap-1">
                      <div className="min-w-[200px] relative">
                        <KitInputText
                          value={couponCode}
                          onChange={setCouponCode}
                          onKeyPress={handleKeyPress}
                          placeholder="Enter coupon code..."
                          className="w-full"
                          extra={couponError && (
                              <div className="text-red-500 text-xs mt-1">{couponError}</div>
                          )}
                        >
                          {isCouponApplied && isCouponCodeValid && (
                            <Check size={16} className="absolute z-20 pointer-events-none right-3 top-3.5 text-green-500" style={{ opacity: isCouponApplied ? 1 : 0 }} />
                          )}
                        </KitInputText>
                      </div>
                      <KitButton
                        variant="white"
                        className="w-full"
                        onClick={applyCoupon}
                        disabled={!isCouponCodeValid || isLoadingCoupon}
                      >
                        {isLoadingCoupon ? '...' : 'Apply code'}
                      </KitButton>
                    </div>
                  }
              />
              <WorkshopPricingItemRow
                left={
                  <WorkshopPriceTitle title="How many tickets?" discount={20}>
                    Group discount
                  </WorkshopPriceTitle>
                }
                right={
                  <div className="flex flex-col items-end gap-1">
                    <KitInputText
                      type="number"
                      value={qty}
                      min={1}
                      max={10}
                      onChange={(e) => setQty(parseInt(e) || 1)}
                      className="w-[120px]"
                      disabled={isFreeWorkshop && isSingleUseCoupon}
                    />
                    {isFreeWorkshop && isSingleUseCoupon && (
                      <p className="text-kit-xs text-kit-green">
                        Single-use coupon
                      </p>
                    )}
                  </div>
                }
              />
              <WorkshopPricingItemRow
                left={
                <WorkshopPriceTitle title="Includes">
                  <KitList
                    className="list-disc list-inside text-kit-sm"
                    listStyle="check"
                    items={[
                      '2.5 hours of hands-on training',
                      'In-person Q&A with Cloudflare expert',
                      'Snacks an Refreshments',
                      'Workshop materials'
                    ]}
                  />
                </WorkshopPriceTitle>}
              />
              <WorkshopPricingItemRow
                left={
                  <WorkshopPriceTitle title="Want to represent?" discount={TSHIRT_DISCOUNT}>
                    <p>
                      Throw in a discounted T-shirt
                    </p>
                    <div className="mt-2 grid grid-cols-3 justify-start gap-2 w-fit">
                      <div className="size-10 bg-kit-gray-medium rounded-md"></div>
                      <div className="size-10 bg-kit-gray-medium rounded-md"></div>
                      <div className="size-10 bg-kit-gray-medium rounded-md"></div>
                    </div>
                  </WorkshopPriceTitle>
                }
                right={
                  <div className="space-y-1">
                    {tshirts.map((tshirt, index) => (
                      <div className="grid grid-cols-[1fr_1fr_120px] gap-1" key={`tshirt-${index}`}>
                        <KitInputText
                          type="number"
                          value={tshirt.qty}
                          onChange={handleTshirtQtyChange(index)}
                          className="w-[120px]"
                          valueTransform={(v) => v + ` x CHF ${TSHIRT_PRICE * ((100 - TSHIRT_DISCOUNT)/100)}`}
                        />
                        <KitSelect
                          defaultValue={{ value: tshirt.size, label: tshirt.size }}
                          options={getAvailableSizes(index)}
                          onChange={handleTshirtSizeChange(index)}
                          valueTransform={(v) => `Size: ${v}`}
                        />
                        <KitButton
                          variant="white"
                          className="w-full"
                          onClick={() => setTshirts(prev => prev.filter((_, i) => i !== index))}
                        >
                          Remove
                        </KitButton>
                      </div>
                    ))}
                    {!!firstTshirtSizeThatIsntAddedYet &&
                      <div className="flex justify-end">
                        <KitButton
                          variant="ghost"
                          onClick={() => setTshirts(p => [...p, { size: firstTshirtSizeThatIsntAddedYet, qty: 1}])}
                          lucideIcon={Plus}
                        >
                          Add {!!tshirts.length ? ' another' : ''}
                        </KitButton>
                      </div>
                    }
                  </div>
                }
              />
            </div>
            <div className="overflow-hidden">
              <WorkshopPricingSummary sections={pricingSections} />
              <WorkshopPricingTotals sections={pricingSections} />
            </div>
          </KitSectionContent>
        </KitPageSection>

        <KitPageSection id={sections.venue.slug} layout="section">
          <KitSectionTitle>
            {sections.venue.title}
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
            {sections.others.title}
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
