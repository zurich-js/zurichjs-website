import React from 'react';

import KitPill from "@/components/kit/KitPill";

export default function WorkshopPricingItemTitle({
  title,
  discount,
  children
}: {
  title: string;
  discount?: number | string;
  children: React.ReactNode;
}) {

  const displayDiscount = (() => {
    if (!discount) return null
    if (typeof discount === 'string') {
      return discount
    }
    return '-' + discount + '%'
  })()

  return (
    <div>
      <h3 className="text-kit-base font-medium">
        {title}
        {discount && (
          <KitPill color="green" className="inline-block ml-1 -translate-y-0.5">
            {displayDiscount}
          </KitPill>
        )}
      </h3>
      {children}
    </div>
  )
}
