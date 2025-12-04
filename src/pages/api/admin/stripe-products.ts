import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';



const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-08-27.basil',
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch all active products
    const products = await stripe.products.list({
      active: true,
      limit: 100,
    });

    // Fetch prices for each product
    const productsWithPrices = await Promise.all(
      products.data.map(async (product) => {
        const prices = await stripe.prices.list({
          product: product.id,
          active: true,
          limit: 100,
        });

        return {
          id: product.id,
          name: product.name,
          description: product.description,
          metadata: product.metadata,
          prices: prices.data.map(price => ({
            id: price.id,
            amount: price.unit_amount || 0,
            currency: price.currency,
            type: price.type,
            interval: price.recurring?.interval,
            interval_count: price.recurring?.interval_count,
            nickname: price.nickname,
          })),
        };
      })
    );

    // Filter out products without prices
    const validProducts = productsWithPrices.filter(product => product.prices.length > 0);

    return res.status(200).json(validProducts);
  } catch (err: unknown) {
    console.error('Error fetching Stripe products:', err);
    let message = 'Unknown error';
    if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: unknown }).message === 'string') {
      message = (err as { message: string }).message;
    }
    return res.status(500).json({ error: message });
  }
}

export default handler;
