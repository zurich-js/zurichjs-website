import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { z } from "zod";

import { rateLimitRequest } from "@/lib/api/rateLimit";
import { getTrustedRequestOrigin } from "@/lib/api/requestOrigin";
import {
  emailSchema,
  optionalCouponCodeSchema,
  requiredText,
  stripeIdSchema,
} from "@/lib/validation/input";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-08-27.basil",
});

const tshirtSizeSchema = z.enum(["S", "M", "L", "XL", "XXL"]);
const tshirtCheckoutSchema = z
  .object({
    sizeQuantities: z
      .partialRecord(tshirtSizeSchema, z.coerce.number().int().min(0).max(25))
      .refine((value) => Object.values(value).some((quantity) => quantity > 0), {
        message: "No valid items in order",
      }),
    delivery: z.boolean().optional().default(false),
    priceId: stripeIdSchema,
    isMember: z.boolean().optional().default(false),
    totalQuantity: z.coerce.number().int().min(1).max(25),
    shippingRateId: stripeIdSchema.optional(),
    email: emailSchema.optional(),
    couponCode: optionalCouponCodeSchema,
    deliveryAddress: z
      .object({
        name: requiredText(160),
        email: emailSchema,
        address: requiredText(160),
        city: requiredText(120),
        zipCode: requiredText(40),
        country: requiredText(80),
      })
      .optional(),
  })
  .refine(
    (value) =>
      Object.values(value.sizeQuantities).reduce((total, quantity) => total + quantity, 0) ===
      value.totalQuantity,
    { message: "Invalid total quantity" },
  );

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!rateLimitRequest(req, res, { key: "checkout-tshirt", limit: 8, windowMs: 10 * 60 * 1000 })) {
    return;
  }

  const parsed = tshirtCheckoutSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid T-shirt checkout request" });
  }

  const {
    sizeQuantities,
    delivery,
    priceId,
    isMember,
    totalQuantity,
    shippingRateId,
    email,
    couponCode,
    deliveryAddress,
  } = parsed.data;

  // Calculate discount
  let discounts: Stripe.Checkout.SessionCreateParams.Discount[] = [];
  if (isMember) {
    // TODO: Use real Stripe coupon/discount
    discounts = [{ coupon: "zurichjs-community" }];
  }

  // Create Stripe Checkout session
  try {
    const origin = getTrustedRequestOrigin(req);
    const orderedSizes = Object.entries(sizeQuantities)
      .filter(([, qty]) => qty > 0)
      .map(([size]) => size)
      .join(",");

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      line_items: Object.entries(sizeQuantities)
        .filter(([, qty]) => qty > 0)
        .map(([, qty]) => ({
          price: priceId,
          quantity: qty,
        })),
      mode: "payment",
      discounts,
      success_url: `${origin}/tshirt?success=true&session_id={CHECKOUT_SESSION_ID}&delivery=${delivery}`,
      cancel_url: `${origin}/tshirt?canceled=true`,
      metadata: {
        sizes: orderedSizes,
        sizeQuantities: JSON.stringify(sizeQuantities),
        delivery: delivery ? "true" : "false",
        totalQuantity: String(totalQuantity),
        userEmail: email || "",
        couponCode: couponCode || "",
        deliveryAddress: deliveryAddress ? JSON.stringify(deliveryAddress) : "",
      },
      invoice_creation: {
        enabled: true,
        invoice_data: {
          metadata: {
            sizes: orderedSizes,
            sizeQuantities: JSON.stringify(sizeQuantities),
            delivery: delivery ? "true" : "false",
            totalQuantity: String(totalQuantity),
            userEmail: email || "",
            couponCode: couponCode || "",
            deliveryAddress: deliveryAddress ? JSON.stringify(deliveryAddress) : "",
          },
        },
      },
    };

    // Set customer email if provided
    if (email) {
      sessionParams.customer_email = email;
    }

    // Configure address collection for delivery orders
    if (delivery) {
      // Collect shipping address when delivery is selected
      sessionParams.shipping_address_collection = {
        allowed_countries: ["CH"], // Switzerland only as mentioned in UI
      };

      // Pre-fill shipping address if provided
      if (deliveryAddress) {
        sessionParams.customer_creation = "always";

        // Store address in session metadata for reference, but Stripe will collect fresh address
        // The user will still need to enter/confirm address in Stripe checkout for security
      }
    } else {
      // For pickup orders, we still collect billing address but not shipping
      sessionParams.billing_address_collection = "required";
    }
    if (shippingRateId) {
      sessionParams.shipping_options = [{ shipping_rate: shippingRateId }];
    }
    const session = await stripe.checkout.sessions.create(sessionParams);

    return res.status(200).json({ url: session.url });
  } catch (err: unknown) {
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
