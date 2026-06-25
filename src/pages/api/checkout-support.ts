import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { z } from "zod";

import { rateLimitRequest } from "@/lib/api/rateLimit";
import { getTrustedRequestOrigin } from "@/lib/api/requestOrigin";
import { emailSchema, stripeIdSchema } from "@/lib/validation/input";

function createStripeClient() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  return new Stripe(stripeSecretKey, {
    apiVersion: "2025-08-27.basil",
  });
}

const supportCheckoutSchema = z
  .object({
    priceId: stripeIdSchema.optional(),
    amount: z.coerce.number().min(1).max(1000).optional(),
    email: emailSchema.optional(),
    recurring: z.boolean().optional().default(false),
  })
  .refine((value) => value.priceId || value.amount !== undefined, {
    message: "Price ID or custom amount is required",
  });

function getSupportProductId() {
  const supportProductId = process.env.STRIPE_SUPPORT_PRODUCT_ID;

  if (!supportProductId) {
    throw new Error("STRIPE_SUPPORT_PRODUCT_ID is not configured");
  }

  return supportProductId;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (
    !rateLimitRequest(req, res, { key: "checkout-support", limit: 8, windowMs: 10 * 60 * 1000 })
  ) {
    return;
  }

  const parsed = supportCheckoutSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: "Price ID or custom amount is required" });
  }

  const { priceId, amount, email, recurring } = parsed.data;

  try {
    const stripe = createStripeClient();
    const supportProductId = getSupportProductId();
    const origin = getTrustedRequestOrigin(req);
    let sessionParams: Stripe.Checkout.SessionCreateParams;

    if (amount && !priceId) {
      // For custom amounts, create based on recurring flag
      const isRecurring = recurring === true;
      const mode = isRecurring ? "subscription" : "payment";
      const donationType = isRecurring ? "monthly" : "custom";

      const successParams = new URLSearchParams({
        success: "true",
        donation_type: donationType,
        amount: String(amount),
        currency: "CHF",
      });

      if (email) {
        successParams.set("customer_email", email);
      }

      const priceData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData = {
        currency: "chf",
        product: supportProductId,
        unit_amount: Math.round(amount * 100), // Convert to cents
      };

      // Add recurring info if it's a subscription
      if (isRecurring) {
        priceData.recurring = {
          interval: "month",
        };
      }

      sessionParams = {
        line_items: [
          {
            price_data: priceData,
            quantity: 1,
          },
        ],
        mode,
        success_url: `${origin}/buy-us-a-coffee?${successParams.toString()}`,
        cancel_url: `${origin}/buy-us-a-coffee?canceled=true`,
        metadata: {
          type: mode,
          amount: String(amount),
          recurring: String(isRecurring),
        },
      };
    } else {
      if (!priceId) {
        return res.status(400).json({ error: "Price ID is required" });
      }

      // Use the provided price ID
      const price = await stripe.prices.retrieve(priceId);
      const mode = price.type === "recurring" ? "subscription" : "payment";

      const donationType = mode === "subscription" ? "monthly" : "oneoff";
      const successParams = new URLSearchParams({
        success: "true",
        donation_type: donationType,
        amount: String(price.unit_amount ? price.unit_amount / 100 : 0),
        currency: price.currency.toUpperCase(),
      });

      if (email) {
        successParams.set("customer_email", email);
      }

      sessionParams = {
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode,
        success_url: `${origin}/buy-us-a-coffee?${successParams.toString()}`,
        cancel_url: `${origin}/buy-us-a-coffee?canceled=true`,
        metadata: {
          type: mode,
          priceId,
        },
      };
    }

    // Add customer email if provided
    if (email) {
      sessionParams.customer_email = email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return res.status(200).json({ url: session.url });
  } catch (err: unknown) {
    console.error("Error creating support checkout session:", err);
    return res.status(500).json({ error: "Unable to create checkout session" });
  }
}

export default handler;
