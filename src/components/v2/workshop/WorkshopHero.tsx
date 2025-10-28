import {CirclePercent, Clock4, GraduationCap, Share2, Users} from "lucide-react";
import React from "react";

import KitButton from "@/components/v2/kit/button/KitButton";
import KitBackLink from "@/components/v2/kit/KitBackLink";
import KitChip from "@/components/v2/kit/KitChip";
import KitPill from "@/components/v2/kit/KitPill";
import KitHero from "@/components/v2/kit/structure/KitHero";
import {
  calculateDuration,
  calculateTimeRemaining,
  formatDateForWorkshop,
} from "@/components/v2/kit/utils/dateOperations";
import WorkshopHero_Speaker from "@/components/v2/workshop/WorkshopHero_Speaker";
import {Speaker} from "@/types";


export default function WorkshopHero({
  title,
  description,
  truncatedDescriptionAnchor,
  date,
  startTime,
  endTime,
  maxSeats,
  seatsLeft,
  speaker,
  rsvp = 'pricing-and-registration',
  currentPricing,
  totalDiscount
}: {
  title: string;
  description: string;
  truncatedDescriptionAnchor?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  maxSeats: number;
  seatsLeft: number;
  speaker: Speaker
  rsvp?: string;
  currentPricing: {
    date: string; // YYYY-MM-DD - EXPIRATION date
    time: string; // HH:MM - EXPIRATION time
    title: string; // e.g. "Early Bird"
    discount: number; // percentage discount, e.g. 20
  };
  totalDiscount: number;
}) {


  const { day, monthShort } = formatDateForWorkshop(date);
  const duration = calculateDuration(startTime, endTime);
  const discountPeriodTimeLeft = calculateTimeRemaining(currentPricing.date, currentPricing.time, { singleUnit: true });

  function onShare() {
    if (navigator.share) {
      navigator.share({
        title: document.title,
        url: window.location.href
      }).catch((error) => console.log('Error sharing', error));
    } else {
      // copy to clipboard as fallback
      navigator.clipboard.writeText(window.location.href).then(() => {
        alert('Link copied to clipboard');
      }).catch((error) => console.log('Error copying link to clipboard', error));
    }
  }


  return (
    <KitHero
      title={title}
      description={description}
      truncatedDescriptionAnchor={truncatedDescriptionAnchor}
      slots={{
        top: (
          <>
            <KitBackLink className="block relative -translate-y-12" href="/workshops">Back to workshops</KitBackLink>
            <KitChip variant="blue" icon={GraduationCap} iconSize={12}>Workshop</KitChip>
          </>
        ),
        details: (
          <div className="flex flex-row items-center gap-4 py-2.5">
            <div className="size-14 flex flex-col items-center justify-center border-t-2 border-t-black bg-white rounded-md shadow-md shadow-black/20 my-4">
              <p className="text-kit-xl leading-none font-bold">{day}</p>
              <p className="text-kit-xs leading-none font-medium">{monthShort}</p>
            </div>
            <div className="flex flex-row gap-5">
              <DetailsGrouping
                title={`${startTime} - ${endTime}`}
                subtitle={duration}
                icon={<Clock4 size={24} />}
              />
              <DetailsGrouping
                title={`${seatsLeft} seats left`}
                subtitle={`Max ${maxSeats} participants`}
                icon={<Users size={24} />}
              />
              {currentPricing.title && currentPricing.time && (
                <DetailsGrouping
                  title={currentPricing.title}
                  subtitle={`${discountPeriodTimeLeft} left`}
                  icon={<CirclePercent size={24} />}
                />
              )}
            </div>
          </div>
        ),
        actions: (
          <div className="flex gap-2.5 w-full max-w-screen-xs">
            <KitButton
              as="a"
              variant="black"
              className="flex-1 text-center relative"
              {...(rsvp ? { href: `#${rsvp}` } : { disabled: true })}
            >
              <KitPill color="orange" className="absolute -top-2 -right-2">
                {totalDiscount}% off
              </KitPill>
              Grab a seat
            </KitButton>
            {/*<KitButton*/}
            {/*  lucideIcon={Plus}*/}
            {/*  variant="white"*/}
            {/*  {...(wishlist ? { href: wishlist, target: '_blank' } : { disabled: true })}*/}
            {/*>*/}
            {/*  Wishlist*/}
            {/*</KitButton>*/}
            <KitButton lucideIcon={Share2} variant="white" onClick={onShare} />
          </div>
        ),
        card: (
          <WorkshopHero_Speaker speaker={speaker} />
        ),
      }}
    />
  );
}

function DetailsGrouping({ title, icon, subtitle }: { title: string; icon: React.ReactNode; subtitle: string }) {
  return (
    <div className="flex flex-row gap-2.5 items-center px-2.5">
      {icon}
      <div className="flex flex-col">
        <p className="text-kit-base leading-none font-medium">{title}</p>
        <p className="text-kit-xs leading-none">{subtitle}</p>
      </div>
    </div>
  )
}
