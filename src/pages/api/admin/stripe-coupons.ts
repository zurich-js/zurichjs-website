import { NextApiRequest, NextApiResponse } from 'next';


import { withTelemetry } from '@/lib/multiplayer';
import { stripe } from '@/lib/stripe';


async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      // Fetch coupons from Stripe
      const coupons = await stripe.coupons.list({
        limit: 100,
      });

      // Calculate stats
      const stats = {
        totalCoupons: coupons.data.length,
        activeCoupons: coupons.data.filter(c => c.valid).length,
        totalRedemptions: coupons.data.reduce((sum, c) => sum + c.times_redeemed, 0),
        mostUsedCoupon: coupons.data.reduce((most, current) => 
          current.times_redeemed > (most?.times_redeemed || 0) ? current : most
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        , null as any)
      };

      res.status(200).json({
        coupons: coupons.data,
        stats
      });
    } catch (error) {
      console.error('Error fetching coupons:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    try {

      const {
        id,
        name,
        discountType,
        percentOff,
        amountOff,
        currency,
        duration,
        durationInMonths,
        maxRedemptions,
        redeemBy,
        metadata
      } = req.body;

      // Validate required fields
      if (!id || !discountType || !duration) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      if (discountType === 'percent' && (!percentOff || percentOff <= 0 || percentOff > 100)) {
        return res.status(400).json({ message: 'Invalid percent off value' });
      }

      if (discountType === 'amount' && (!amountOff || amountOff <= 0)) {
        return res.status(400).json({ message: 'Invalid amount off value' });
      }

      // Build coupon parameters
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const couponParams: Record<string, any> = {
        id,
        duration,
        metadata: metadata || {}
      };

      if (name) {
        couponParams.name = name;
      }

      if (discountType === 'percent') {
        couponParams.percent_off = parseFloat(percentOff);
      } else {
        couponParams.amount_off = Math.round(parseFloat(amountOff) * 100); // Convert to cents
        couponParams.currency = currency || 'usd';
      }

      if (duration === 'repeating') {
        if (!durationInMonths || durationInMonths <= 0) {
          return res.status(400).json({ message: 'Duration in months required for repeating coupons' });
        }
        couponParams.duration_in_months = parseInt(durationInMonths);
      }

      if (maxRedemptions && maxRedemptions > 0) {
        couponParams.max_redemptions = parseInt(maxRedemptions);
      }

      if (redeemBy) {
        couponParams.redeem_by = Math.floor(new Date(redeemBy).getTime() / 1000);
      }

      // Create coupon in Stripe
      const coupon = await stripe.coupons.create(couponParams);

      res.status(201).json({
        message: 'Coupon created successfully',
        coupon
      });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Error creating coupon:', error);
      
      if (error.type === 'StripeCardError' || error.type === 'StripeInvalidRequestError') {
        return res.status(400).json({ message: error.message });
      }
      
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ message: 'Method not allowed' });
  }
}

export default withTelemetry(handler, {
  spanName: 'admin-stripe-coupons',
  attributes: {
    'api.category': 'admin',
    'service': 'management',
  },
});
