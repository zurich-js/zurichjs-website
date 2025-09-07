# Coupon Management System

This document explains how to use the coupon management system for workshops and other paid offerings on the ZurichJS website.

## How It Works

The coupon system allows users to apply discounts to their purchases by adding a coupon code to the URL. When a valid coupon is detected, it overrides the default community discount and applies the coupon discount instead.

## Features

- URL-based coupon application via query parameter
- Support for both percentage and fixed amount discounts
- Visual coupon badge showing the applied discount
- Detailed error messages for invalid coupons
- Seamless integration with Stripe's coupon system
- Coupon information included in purchase notifications
- Preserves coupon when a user cancels and returns to checkout

## Creating Coupons

To create a coupon:

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to Billing > Coupons
3. Click "Add coupon"
4. Configure the coupon with:
   - A unique coupon ID (this will be used in the URL)
   - Either a percentage or fixed amount discount
   - Optional restrictions (duration, redemption limit, etc.)
5. Save the coupon

## Using Coupons

To apply a coupon:

1. Add `?coupon=COUPON_CODE` to any workshop URL
   - Example: `https://zurichjs.com/workshops/nodejs-threads?coupon=SUMMER2023`
2. The system will automatically validate the coupon
3. If valid, the coupon discount will be displayed and applied to pricing
4. The coupon will be preserved throughout the checkout process

## Implementing in New Pages

To add coupon support to a new page:

1. Import the `useCoupon` hook from `@/hooks/useCoupon`
2. Use the hook in your component to access coupon data
3. Use the `applyDiscount` function to calculate discounted prices
4. Display appropriate UI based on `couponData` and `error` states
5. Pass the `couponCode` to the checkout process

Example:

```tsx
import { useCoupon } from '@/hooks/useCoupon';

function MyComponent() {
  const { couponCode, couponData, error, applyDiscount } = useCoupon();
  
  // Calculate discounted price
  const originalPrice = 100;
  const discountedPrice = applyDiscount(originalPrice);
  
  // Display coupon badge if valid
  if (couponData && couponData.isValid) {
    // Show coupon badge
  }
  
  // Pass coupon to checkout
  const handleCheckout = () => {
    startCheckout({
      priceId: "price_123",
      couponCode: couponCode,
    });
  };
  
  return (
    // Component JSX
  );
}
```

## Debugging

If coupons aren't working as expected:

1. Check that the coupon ID in the URL exactly matches the ID in Stripe
2. Verify the coupon is active and valid in Stripe Dashboard
3. Check browser console for errors during coupon validation
4. Examine network requests to `/api/stripe/validate-coupon` for error details

## Technical Flow

1. User visits URL with `?coupon=CODE`
2. `useCoupon` hook detects coupon parameter
3. Hook calls `/api/stripe/validate-coupon` to verify the coupon
4. If valid, coupon data is displayed and calculated into pricing
5. During checkout, coupon is passed to Stripe for final application
6. Coupon ID is preserved in success/cancel URLs and notifications 
