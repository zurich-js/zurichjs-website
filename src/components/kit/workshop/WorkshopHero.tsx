import KitHero from "@/components/kit/KitHero";
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
  duration,
  maxSeats,
  seatsLeft,
  discountPeriodTitle,
  discountPeriodEndDate,
  speaker,
}: {
  title: string;
  description: string;
  truncatedDescriptionAnchor?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  duration: string;
  maxSeats: number;
  seatsLeft: number;
  discountPeriodTitle?: string;
  discountPeriodEndDate?: string; // YYYY-MM-DD
  speaker: Speaker
}) {
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
            discountPeriodTitle={discountPeriodTitle}
            discountPeriodEndDate={discountPeriodEndDate}
          />
        ),
        actions: <WorkshopActionsSlot />,
        card: (
          <WorkshopSpeakerCard speaker={speaker} />
        ),
      }}
    />
  );
}
