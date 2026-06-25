import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { z } from "zod";

import { requireAdminOrg } from "@/lib/api/adminAuth";
import { emailSchema, optionalCouponCodeSchema, stripeIdSchema } from "@/lib/validation/input";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-08-27.basil",
});

const createPaymentIntentSchema = z.object({
  priceId: stripeIdSchema,
  quantity: z.coerce.number().int().min(1).max(25),
  customerEmail: emailSchema,
  couponCode: optionalCouponCodeSchema,
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!requireAdminOrg(req, res)) {
    return;
  }

  const parsed = createPaymentIntentSchema.safeParse(req.body);

  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Missing required fields: priceId, quantity, customerEmail" });
  }

  const { priceId, quantity, customerEmail, couponCode } = parsed.data;

  try {
    // Validate the price exists
    const price = await stripe.prices.retrieve(priceId);
    const product = await stripe.products.retrieve(price.product as string);

    // Calculate amount (server-side validation)
    let calculatedAmount = (price.unit_amount || 0) * quantity;

    // Apply coupon if provided
    let couponDetails = null;
    if (couponCode) {
      try {
        const coupon = await stripe.coupons.retrieve(couponCode);
        if (coupon.valid) {
          couponDetails = coupon;
          if (coupon.percent_off) {
            calculatedAmount = Math.round(calculatedAmount * (1 - coupon.percent_off / 100));
          } else if (coupon.amount_off) {
            calculatedAmount = Math.max(0, calculatedAmount - coupon.amount_off * quantity);
          }
        }
      } catch (err) {
        console.warn(`Coupon ${couponCode} not found or invalid:`, err);
      }
    }

    // Create PaymentIntent for Terminal
    const paymentIntent = await stripe.paymentIntents.create({
      amount: calculatedAmount,
      currency: price.currency,
      payment_method_types: ["card_present"],
      capture_method: "manual", // Manual capture for better control
      receipt_email: customerEmail,
      metadata: {
        priceId,
        productId: product.id,
        productName: product.name,
        quantity: quantity.toString(),
        couponCode: couponCode || "",
        originalAmount: ((price.unit_amount || 0) * quantity).toString(),
        discountAmount: ((price.unit_amount || 0) * quantity - calculatedAmount).toString(),
        adminTapToPay: "true",
      },
      description: `${product.name} (Qty: ${quantity})${couponCode ? ` - Coupon: ${couponCode}` : ""}`,
    });

    return res.status(200).json({
      paymentIntent: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        client_secret: paymentIntent.client_secret,
      },
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
      },
      coupon: couponDetails
        ? {
            id: couponDetails.id,
            name: couponDetails.name,
            percent_off: couponDetails.percent_off,
            amount_off: couponDetails.amount_off,
          }
        : null,
    });
  } catch (err: unknown) {
    console.error("Error creating payment intent:", err);
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
