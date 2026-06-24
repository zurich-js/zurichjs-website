import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { z } from "zod";

import { requireAdminOrg } from "@/lib/api/adminAuth";
import { emailSchema, optionalCouponCodeSchema, stripeIdSchema } from "@/lib/validation/input";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-08-27.basil",
});

const createCheckoutSessionSchema = z.object({
  priceId: stripeIdSchema,
  quantity: z.coerce.number().int().min(1).max(25),
  customerEmail: emailSchema,
  couponCode: optionalCouponCodeSchema,
  mode: z.enum(["card_entry", "tap_to_pay"]).optional(),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!requireAdminOrg(req, res)) {
    return;
  }

  const parsed = createCheckoutSessionSchema.safeParse(req.body);

  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Missing required fields: priceId, quantity, customerEmail" });
  }

  const { priceId, quantity, customerEmail, couponCode, mode } = parsed.data;

  try {
    // Validate the price exists
    const price = await stripe.prices.retrieve(priceId);
    const product = await stripe.products.retrieve(price.product as string);

    // Prepare line items
    const lineItems = [
      {
        price: priceId,
        quantity: quantity,
      },
    ];

    // Prepare discounts if coupon is provided
    let discountOptions = {};
    if (couponCode) {
      try {
        const coupon = await stripe.coupons.retrieve(couponCode);
        if (coupon.valid) {
          discountOptions = {
            discounts: [{ coupon: couponCode }],
          };
        }
      } catch (err) {
        console.warn(`Coupon ${couponCode} not found or invalid:`, err);
      }
    }

    // Create Checkout Session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      line_items: lineItems,
      mode: "payment",
      customer_email: customerEmail, // This is the correct parameter for receipt email
      success_url: `${req.headers.origin}/admin/tap-to-pay?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/admin/tap-to-pay?payment=cancelled`,
      metadata: {
        productId: product.id,
        productName: product.name,
        quantity: quantity.toString(),
        couponCode: couponCode || "",
        adminTapToPay: "true",
        paymentMode: mode || "card_entry",
        createdBy: "admin-tap-to-pay",
      },
      billing_address_collection: "required",
      phone_number_collection: {
        enabled: true,
      },
      ...discountOptions,
    };

    // For iOS devices, optimize the checkout experience
    const userAgent = req.headers["user-agent"] || "";
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);

    if (isIOS) {
      // Optimize for mobile experience
      sessionParams.billing_address_collection = "auto";
      sessionParams.shipping_address_collection = {
        allowed_countries: ["US", "CA", "GB", "AU", "DE", "FR", "IT", "ES", "NL", "CH"],
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return res.status(200).json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (err: unknown) {
    console.error("Error creating checkout session:", err);
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
