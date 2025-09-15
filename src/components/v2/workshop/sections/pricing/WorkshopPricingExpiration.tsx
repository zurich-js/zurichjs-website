import React from 'react';

import { getTimeUnitsFromStrings } from '../../../kit/utils/dateOperations';

function ExpCard({children}: {children: React.ReactNode}) {
  return (
    <span className="text-white text-kit-sm font-medium leading-none w-7 h-6 inline-flex items-center justify-center rounded-sm bg-kit-orange">
      {children}
    </span>
  )
}

export default function WorkshopPricingExpiration({
  date,
  time
}: {
  date: string;
  time: string;
}) {

  const timeUnits = getTimeUnitsFromStrings(date, time);

  return (
    <div className="text-kit-sm text-kit-secondary">
      {timeUnits.days > 0 ? (
        <>
          Expires in <ExpCard>{timeUnits.days}</ExpCard> days <ExpCard>{timeUnits.hours}</ExpCard> hours
        </>
      ) : (
        <>
          Expires in <ExpCard>{timeUnits.hours}</ExpCard> hours <ExpCard>{timeUnits.minutes}</ExpCard> minutes
        </>
      )}
    </div>
  )
}
