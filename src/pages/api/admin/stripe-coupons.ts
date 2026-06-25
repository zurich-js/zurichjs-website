import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { requireAdminOrg } from "@/lib/api/adminAuth";
import { stripe } from "@/lib/stripe";
import { couponCodeSchema, optionalText } from "@/lib/validation/input";

const emptyStringToUndefined = (value: unknown) => (value === "" ? undefined : value);

const stripeCouponCreateSchema = z
  .object({
    id: couponCodeSchema,
    name: optionalText(160),
    discountType: z.enum(["percent", "amount"]),
    percentOff: z.preprocess(
      emptyStringToUndefined,
      z.coerce.number().min(0.01).max(100).optional(),
    ),
    amountOff: z.preprocess(
      emptyStringToUndefined,
      z.coerce.number().min(0.01).max(100000).optional(),
    ),
    currency: z.enum(["chf", "eur", "usd", "gbp"]).optional().default("chf"),
    duration: z.enum(["forever", "once", "repeating"]),
    durationInMonths: z.preprocess(
      emptyStringToUndefined,
      z.coerce.number().int().min(1).max(36).optional(),
    ),
    maxRedemptions: z.preprocess(
      emptyStringToUndefined,
      z.coerce.number().int().min(1).max(100000).optional(),
    ),
    redeemBy: optionalText(80),
    metadata: z.record(z.string().max(80), z.string().max(500)).optional().default({}),
  })
  .refine((value) => value.discountType !== "percent" || value.percentOff !== undefined, {
    message: "Invalid percent off value",
  })
  .refine((value) => value.discountType !== "amount" || value.amountOff !== undefined, {
    message: "Invalid amount off value",
  })
  .refine((value) => value.duration !== "repeating" || value.durationInMonths !== undefined, {
    message: "Duration in months required for repeating coupons",
  });

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireAdminOrg(req, res)) {
    return;
  }

  if (req.method === "GET") {
    try {
      // Fetch coupons from Stripe
      const coupons = await stripe.coupons.list({
        limit: 100,
      });

      // Calculate stats
      const stats = {
        totalCoupons: coupons.data.length,
        activeCoupons: coupons.data.filter((c) => c.valid).length,
        totalRedemptions: coupons.data.reduce((sum, c) => sum + c.times_redeemed, 0),
        mostUsedCoupon: coupons.data.reduce(
          (most, current) =>
            current.times_redeemed > (most?.times_redeemed || 0) ? current : most,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          null as any,
        ),
      };

      res.status(200).json({
        coupons: coupons.data,
        stats,
      });
    } catch (error) {
      console.error("Error fetching coupons:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  } else if (req.method === "POST") {
    try {
      const parsed = stripeCouponCreateSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid coupon request" });
      }

      const {
        id,
        name,
        discountType,
        percentOff,
        amountOff,
        currency,
        duration,
        durationInMonths,
        maxRedemptions,
        redeemBy,
        metadata,
      } = parsed.data;

      // Build coupon parameters
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const couponParams: Record<string, any> = {
        id,
        duration,
        metadata,
      };

      if (name) {
        couponParams.name = name;
      }

      if (discountType === "percent") {
        couponParams.percent_off = percentOff;
      } else {
        couponParams.amount_off = Math.round((amountOff ?? 0) * 100); // Convert to cents
        couponParams.currency = currency;
      }

      if (duration === "repeating") {
        couponParams.duration_in_months = durationInMonths;
      }

      if (maxRedemptions) {
        couponParams.max_redemptions = maxRedemptions;
      }

      if (redeemBy) {
        couponParams.redeem_by = Math.floor(new Date(redeemBy).getTime() / 1000);
      }

      // Create coupon in Stripe
      const coupon = await stripe.coupons.create(couponParams);

      res.status(201).json({
        message: "Coupon created successfully",
        coupon,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error creating coupon:", error);

      if (error.type === "StripeCardError" || error.type === "StripeInvalidRequestError") {
        return res.status(400).json({ message: error.message });
      }

      res.status(500).json({ message: "Internal server error" });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).json({ message: "Method not allowed" });
  }
}

export default handler;
