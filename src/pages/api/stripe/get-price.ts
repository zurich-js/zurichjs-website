import type { APIContext } from 'astro';
import { stripe } from '@/lib/stripe';

export const prerender = false;

export async function GET({ url }: APIContext) {
  const priceId = url.searchParams.get('priceId');

  if (!priceId) {
    return new Response(JSON.stringify({ error: 'Price ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const price = await stripe.prices.retrieve(priceId);

    return new Response(JSON.stringify({
      id: price.id,
      unitAmount: price.unit_amount,
      currency: price.currency,
      type: price.type,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    console.error('Error fetching price:', err);
    const error = err as { statusCode?: number; message: string };
    return new Response(JSON.stringify({
      error: error.message || 'Error fetching price',
    }), {
      status: error.statusCode || 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
