import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-08-27.basil',
});

const SUPPORT_PRODUCT_ID = process.env.NODE_ENV === 'production' 
  ? 'prod_SkD5vsBEz5iO6W' // You'll fill this in later
  : 'prod_SkCbG5XY7IZzkT'; // Test product ID


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch all prices for the support product
    const prices = await stripe.prices.list({
      product: SUPPORT_PRODUCT_ID,
      active: true,
      limit: 100,
    });

    // Categorize prices by type
    const oneTimePrices = prices.data.filter(price => price.type === 'one_time');
    const recurringPrices = prices.data.filter(price => price.type === 'recurring');

    // Format prices for the frontend
    const formatPrice = (price: Stripe.Price) => ({
      id: price.id,
      amount: price.unit_amount! / 100, // Convert from cents
      currency: price.currency.toUpperCase(),
      type: price.type,
      interval: price.recurring?.interval || null,
      interval_count: price.recurring?.interval_count || null,
      nickname: price.nickname || null,
    });

    const formattedData = {
      oneTime: oneTimePrices.map(formatPrice),
      recurring: recurringPrices.map(formatPrice),
      product: {
        id: SUPPORT_PRODUCT_ID,
        name: 'ZurichJS Support',
      },
    };

    return res.status(200).json(formattedData);
  } catch (err: unknown) {
    console.error('Error fetching support prices:', err);
    let message = 'Unknown error';
    if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: unknown }).message === 'string') {
      message = (err as { message: string }).message;
    }
    return res.status(500).json({ error: message });
  }
}