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
  durationString,
  maxSeats,
  seatsLeft,
  discountPeriodTitle,
  discountPeriodEndDate,
  speaker,
  rsvp,
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
  discountPeriodTitle?: string;
  discountPeriodEndDate?: string; // YYYY-MM-DD
  speaker: Speaker
  rsvp: string;
}) {

  const duration = (() => {
    if (durationString) return durationString;
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours > 0 ? hours + 'h' : ''}${hours > 0 && minutes > 0 ? ' ' : ''}${minutes > 0 ? minutes + 'm' : ''}`;
  })();
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
