import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { z } from "zod";

import { stripeIdSchema } from "@/lib/validation/input";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-08-27.basil",
});

const stockQuerySchema = z.object({
  priceId: stripeIdSchema,
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const parsed = stockQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({ error: "Price ID is required" });
    }

    // Fetch the product by price ID to get metadata
    const price = await stripe.prices.retrieve(parsed.data.priceId);
    const product = await stripe.products.retrieve(price.product as string);

    // Extract stock data from metadata
    const stock: Record<string, number> = {};
    const sizes = ["S", "M", "L", "XL", "XXL"];

    sizes.forEach((size) => {
      const sizeKey = `${size.toLowerCase()}-stock`;
      const stockValue = product.metadata[sizeKey];
      stock[size] = stockValue ? parseInt(stockValue, 10) : 0;
    });

    return res.status(200).json(stock);
  } catch (err: unknown) {
    console.error("Error fetching stock from Stripe:", err);
    let message = "Unknown error";
    if (
      typeof err === "object" &&
      err !== null &&
      "message" in err &&
      typeof (err as { message?: unknown }).message === "string"
    ) {
      message = (err as { message: string }).message;
    }
    return res.status(500).json({ error: message });
  }
}

export default handler;
