import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { stripe } from "@/lib/stripe";
import { stripeIdSchema } from "@/lib/validation/input";

const getPriceQuerySchema = z.object({
  priceId: stripeIdSchema,
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const parsed = getPriceQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({ error: "Price ID is required" });
  }

  const { priceId } = parsed.data;

  try {
    const price = await stripe.prices.retrieve(priceId);

    return res.status(200).json({
      id: price.id,
      unitAmount: price.unit_amount,
      currency: price.currency,
      type: price.type,
    });
  } catch (err: unknown) {
    console.error("Error fetching price:", err);
    const error = err as { statusCode?: number; message: string };
    return res.status(error.statusCode || 500).json({
      error: error.message || "Error fetching price",
    });
  }
}

export default handler;
