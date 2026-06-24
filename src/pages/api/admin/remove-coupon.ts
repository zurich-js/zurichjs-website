import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { requireAdminOrg } from "@/lib/api/adminAuth";
import { couponCodeSchema, requiredText } from "@/lib/validation/input";

interface Coupon {
  code: string;
  assignedAt: string;
  assignedBy: string;
  isActive: boolean;
}

const couponRemovalSchema = z.object({
  userId: requiredText(160),
  couponCode: couponCodeSchema,
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (!requireAdminOrg(req, res)) {
      return;
    }

    const parsed = couponRemovalSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { userId: targetUserId, couponCode } = parsed.data;

    // First, fetch the current user data to get existing metadata
    const userResponse = await fetch(`https://api.clerk.dev/v1/users/${targetUserId}`, {
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error("Failed to fetch user data");
    }

    const userData = await userResponse.json();
    const currentMetadata = userData.unsafe_metadata || {};
    const currentCoupons = currentMetadata.coupons || [];

    // Filter out the coupon to be removed
    const updatedCoupons = currentCoupons.filter((coupon: Coupon) => coupon.code !== couponCode);

    // Update the user's metadata
    const response = await fetch(`https://api.clerk.dev/v1/users/${targetUserId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        unsafe_metadata: {
          ...currentMetadata,
          coupons: updatedCoupons,
        },
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to update user metadata");
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error removing coupon:", error);
    return res.status(500).json({ error: "Failed to remove coupon" });
  }
}

export default handler;
