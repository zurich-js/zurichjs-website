import KitHero from "@/components/kit/KitHero";
import { calculateDuration, getCurrentPricingPeriod } from "@/components/kit/utils/dateOperations";
import WorkshopActionsSlot from "@/components/kit/workshop/WorkshopActionsSlot";
import {WorkshopDetailsRow} from "@/components/kit/workshop/WorkshopDetailsRow";
import WorkshopSpeakerCard from "@/components/kit/workshop/WorkshopSpeakerCard";
import WorkshopTopSlot from "@/components/kit/workshop/WorkshopTopSlot";
import {Speaker} from "@/types";

export default function WorkshopHero({
  title,
  description,
  truncatedDescriptionAnchor,
  date,
  startTime,
  endTime,
  durationString,
  maxSeats,
  seatsLeft,
  speaker,
  rsvp,
  pricing
}: {
  title: string;
  description: string;
  truncatedDescriptionAnchor?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  durationString?: string;
  maxSeats: number;
  seatsLeft: number;
  speaker: Speaker
  rsvp: string;
  pricing?: {
    [key: string]: {
      date: string; // YYYY-MM-DD
      discount: number; // percentage discount, e.g. 20
      time: string; // HH:MM
      title: string; // e.g. "Early Bird"
    }
  };
}) {

  const computedPricing = getCurrentPricingPeriod(pricing, date, startTime);

  const duration = durationString || calculateDuration(startTime, endTime);

  return (
    <KitHero
      title={title}
      description={description}
      truncatedDescriptionAnchor={truncatedDescriptionAnchor}
      slots={{
        top: <WorkshopTopSlot />,
        details: (
          <WorkshopDetailsRow
            date={date}
            startTime={startTime}
            endTime={endTime}
            duration={duration}
            maxSeats={maxSeats}
            seatsLeft={seatsLeft}
            discountPeriodTitle={computedPricing.title}
            discountPeriodEndDate={computedPricing.date}
            discountPeriodEndTime={computedPricing.time}
          />
        ),
        actions: <WorkshopActionsSlot
          rsvp={rsvp}
        />,
        card: (
          <WorkshopSpeakerCard speaker={speaker} />
        ),
      }}
    />
  );
}
