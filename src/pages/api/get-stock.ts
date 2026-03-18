import type { APIContext } from 'astro';
import Stripe from 'stripe';

export const prerender = false;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-08-27.basil',
});

export async function GET({ url }: APIContext) {
  try {
    const priceId = url.searchParams.get('priceId');

    // Fetch the product by price ID to get metadata
    const price = await stripe.prices.retrieve(priceId as string);
    const product = await stripe.products.retrieve(price.product as string);

    // Extract stock data from metadata
    const stock: Record<string, number> = {};
    const sizes = ['S', 'M', 'L', 'XL', 'XXL'];

    sizes.forEach(size => {
      const sizeKey = `${size.toLowerCase()}-stock`;
      const stockValue = product.metadata[sizeKey];
      stock[size] = stockValue ? parseInt(stockValue, 10) : 0;
    });

    return new Response(JSON.stringify(stock), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    console.error('Error fetching stock from Stripe:', err);
    let message = 'Unknown error';
    if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: unknown }).message === 'string') {
      message = (err as { message: string }).message;
    }
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
