interface CouponDetails {
  id: string;
  code: string;
  percentOff: number | null;
  amountOff: number | null;
  currency: string | null;
  name: string | null;
  isValid: boolean;
}

interface PricingPeriod {
  date: string;
  time: string;
  title: string;
  discount: number;
  isOffer?: boolean;
}

interface DiscountInfo {
  percent: number;
  amount: number;
  displayString: string;
}

/**
 * Calculate total discount combining pricing tier and coupon discounts
 */
export function calculateTotalDiscount(
  basePrice: number,
  pricingTier: PricingPeriod,
  couponDetails: CouponDetails | null,
  isCouponApplied: boolean
): DiscountInfo {
  let totalPercentOff = 0;
  let totalAmountOff = 0;

  // Add pricing tier discount
  if (!!pricingTier.discount) {
    totalPercentOff += pricingTier.discount;
  }

  // Add coupon discount
  if (isCouponApplied && couponDetails?.isValid) {
    if (couponDetails.percentOff) {
      totalPercentOff += couponDetails.percentOff;
    }
    if (couponDetails.amountOff) {
      // Convert from cents to CHF
      totalAmountOff += couponDetails.amountOff / 100;
    }
  }

  // Calculate total discount
  const percentDiscount = (basePrice * totalPercentOff) / 100;
  const totalDiscountAmount = percentDiscount + totalAmountOff;
  const totalDiscountPercent = (totalDiscountAmount / basePrice) * 100;

  // Cap at 100%
  const finalDiscountPercent = Math.min(totalDiscountPercent, 100);
  const finalDiscountAmount = Math.min(totalDiscountAmount, basePrice);

  return {
    percent: finalDiscountPercent,
    amount: finalDiscountAmount,
    displayString: totalAmountOff > 0
      ? `-${finalDiscountAmount.toFixed(0)} CHF`
      : `-${finalDiscountPercent.toFixed(0)}%`
  };
}

/**
 * Calculate only coupon discount (for display in coupon section)
 */
export function calculateCouponDiscount(couponDetails: CouponDetails | null): {
  percent: number | null;
  amount: number | null;
  displayString: string | null;
} {
  if (!couponDetails?.isValid) {
    return {
      percent: null,
      amount: null,
      displayString: null
    };
  }

  const percentOff = couponDetails.percentOff || 0;
  const amountOff = couponDetails.amountOff ? couponDetails.amountOff / 100 : 0;

  return {
    percent: percentOff,
    amount: amountOff,
    displayString: amountOff > 0
      ? `-${amountOff.toFixed(0)} CHF`
      : `-${percentOff}%`
  };
}

export function roundToNearestHalf(num: number): number {
  return Math.round(num * 2) / 2;
}
