import React from 'react';

import KitButton from '@/components/kit/button/KitButton';

interface WorkshopPricingFinalProps {
  totalCost: number;
  totalSavings: number;
  totalDiscountPercent: number;
  workshopQuantity: number;
  tshirtQuantity?: number;
  onSecureSpot: () => void;
  onDonateTicket?: () => void;
}

export default function WorkshopPricingFinal({
  totalCost,
  totalSavings,
  totalDiscountPercent,
  workshopQuantity,
  tshirtQuantity = 0,
  onSecureSpot,
  onDonateTicket
}: WorkshopPricingFinalProps) {
  const formatPrice = (amount: number) => `CHF ${amount}`;

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
      {/* Final Cost Display */}
      <div className="text-center mb-6">
        <div className="text-3xl font-bold text-gray-900 mb-2">
          {formatPrice(totalCost)}
        </div>
        <div className="text-sm text-gray-600 mb-1">
          {workshopQuantity} tickets for Sep 9th
          {tshirtQuantity > 0 && ` • ${tshirtQuantity} T-Shirts`}
        </div>
        <div className="text-green-600 font-medium text-sm">
          {totalDiscountPercent}% discount, saving {formatPrice(totalSavings)}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <KitButton
          variant="black"
          className="w-full py-3 text-lg font-semibold"
          onClick={onSecureSpot}
        >
          Secure your spot
        </KitButton>
        
        {onDonateTicket && (
          <KitButton
            variant="white"
            className="w-full py-3 text-lg font-semibold border-2 border-gray-300"
            onClick={onDonateTicket}
          >
            Donate a ticket
          </KitButton>
        )}
      </div>
    </div>
  );
}
