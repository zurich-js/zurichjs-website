import React from 'react';

import KitPill from "@/components/kit/KitPill";

export default function WorkshopPricingItemTitle({
  title,
  discount,
  children
}: {
  title: string;
  discount?: number;
  children: React.ReactNode;
}) {

  const numberDiscount = (() => {
    if (!discount) return null
    if (discount < 1) {
      return '-' + discount * 100 + '%'
    }
    return '-' + discount + '%'
  })()

  return (
    <div>
      <h3 className="text-kit-base font-medium">
        {title}
        {discount && (
          <KitPill color="green" className="inline-block ml-1 -translate-y-0.5">
            {numberDiscount}
          </KitPill>
        )}
      </h3>
      {children}
    </div>
  )
}
