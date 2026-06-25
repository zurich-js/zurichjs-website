import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

function createStripeClient() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  return new Stripe(stripeSecretKey, {
    apiVersion: "2025-08-27.basil",
  });
}

function getSupportProductId() {
  const supportProductId = process.env.STRIPE_SUPPORT_PRODUCT_ID;

  if (!supportProductId) {
    throw new Error("STRIPE_SUPPORT_PRODUCT_ID is not configured");
  }

  return supportProductId;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const stripe = createStripeClient();
    const supportProductId = getSupportProductId();

    // Fetch all prices for the support product
    const prices = await stripe.prices.list({
      product: supportProductId,
      active: true,
      limit: 100,
    });

    // Categorize prices by type
    const oneTimePrices = prices.data.filter((price) => price.type === "one_time");
    const recurringPrices = prices.data.filter((price) => price.type === "recurring");

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
        id: supportProductId,
        name: "ZurichJS Support",
      },
    };

    return res.status(200).json(formattedData);
  } catch (err: unknown) {
    console.error("Error fetching support prices:", err);
    return res.status(500).json({ error: "Unable to load support prices" });
  }
}

export default handler;
