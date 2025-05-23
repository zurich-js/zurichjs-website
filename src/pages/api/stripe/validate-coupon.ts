import { NextApiRequest, NextApiResponse } from 'next';

import { stripe } from '@/lib/stripe';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Coupon code is required' });
  }

  try {
    // Retrieve the coupon from Stripe
    const coupon = await stripe.coupons.retrieve(code);

    if (!coupon || !coupon.valid) {
      return res.status(400).json({ error: 'Invalid coupon code' });
    }

    // Format the coupon data for the client
    const couponData = {
      id: coupon.id,
      code: coupon.id,
      percentOff: coupon.percent_off,
      amountOff: coupon.amount_off,
      currency: coupon.currency,
      name: coupon.name,
      isValid: coupon.valid,
    };

    return res.status(200).json(couponData);
  } catch (err: unknown) {
    console.error('Error validating coupon:', err);
    
    const error = err as { statusCode?: number; message: string };
    const statusCode = error.statusCode || 500;
    
    return res.status(statusCode).json({
      error: statusCode === 404 
        ? 'Coupon not found' 
        : error.message || 'Error validating coupon',
    });
  }
} 