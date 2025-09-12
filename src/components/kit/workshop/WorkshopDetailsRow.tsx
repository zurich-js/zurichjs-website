import { Clock4, Users, CirclePercent } from 'lucide-react';

import { calculateTimeRemaining } from '../utils/dateOperations';

function Grouping({ title, icon, subtitle }: { title: string; icon: React.ReactNode; subtitle: string }) {
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

export function WorkshopDetailsRow({
  date,
  startTime,
  endTime,
  duration,
  maxSeats,
  seatsLeft,
  discountPeriodTitle,
  discountPeriodEndDate,
  discountPeriodEndTime,
}: {
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  maxSeats: number;
  seatsLeft: number;
  discountPeriodTitle?: string;
  discountPeriodEndDate?: string;
  discountPeriodEndTime?: string;
}) {

  // a function to format date into { day, monthShort }
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const day = date.getDate();
        const monthShort = date.toLocaleString('default', { month: "long" }).substring(0, 3);
        return { day, monthShort };
    };
    const { day, monthShort } = formatDate(date);

    const discountPeriodTimeLeft = discountPeriodEndDate && discountPeriodEndTime 
        ? calculateTimeRemaining(discountPeriodEndDate, discountPeriodEndTime, { singleUnit: true })
        : null;

  return (
    <div className="flex flex-row items-center gap-4 py-2.5">
      <div className="size-14 flex flex-col items-center justify-center border-t-2 border-t-black bg-white rounded-md shadow-md shadow-black/20 my-4">
        <p className="text-kit-xl leading-none font-bold">{day}</p>
        <p className="text-kit-xs leading-none font-medium">{monthShort}</p>
      </div>
      <div className="flex flex-row gap-5">
        <Grouping
          title={`${startTime} - ${endTime}`}
          subtitle={duration}
          icon={<Clock4 size={24} />}
        />
        <Grouping
          title={`${seatsLeft} seats left`}
          subtitle={`Max ${maxSeats} participants`}
          icon={<Users size={24} />}
        />
        {discountPeriodTitle && discountPeriodTimeLeft && (
          <Grouping
            title={discountPeriodTitle}
            subtitle={`${discountPeriodTimeLeft} left`}
            icon={<CirclePercent size={24} />}
          />
        )}
      </div>
    </div>
  );
}
