import { getAuth } from "@clerk/nextjs/server";
import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { rateLimitRequest } from "@/lib/api/rateLimit";
import { requiredText } from "@/lib/validation/input";

// Example API route to process referrals
// In a real implementation, you would connect to a database
// and store/update referral information

const clerkUserIdSchema = requiredText(160).regex(/^user_[a-zA-Z0-9]+$/);
const referralProcessSchema = z.object({
  referrerId: clerkUserIdSchema,
  userId: clerkUserIdSchema,
  purchaseType: z.enum(["workshop", "event", "other"]).optional().default("other"),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  if (
    !rateLimitRequest(req, res, { key: "referrals-process", limit: 10, windowMs: 10 * 60 * 1000 })
  ) {
    return;
  }

  try {
    const { userId: authenticatedUserId } = getAuth(req);
    const parsed = referralProcessSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const { referrerId, userId, purchaseType } = parsed.data;
    // userEmail is also available in req.body but not used in this example

    // Validate required fields
    if (!authenticatedUserId || authenticatedUserId !== userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // In a real implementation, you would:
    // 1. Verify that the referrerId exists in your database
    // 2. Check if this is a valid referral (e.g., not self-referral, not duplicate)
    // 3. Update the referrer's credit balance
    // 4. Record the referral in your database

    // For this example, we'll simulate success
    console.log(
      `Processing referral: User ${userId} was referred by ${referrerId} for ${purchaseType}`,
    );

    // Credit values based on purchase type
    const creditValues = {
      workshop: 200,
      event: 100,
      other: 50,
    };

    const creditAmount = creditValues[purchaseType as keyof typeof creditValues] || 50;

    // Mock response with referrer info
    // In a real implementation, you would fetch this from your database
    return res.status(200).json({
      success: true,
      referrer: {
        id: referrerId,
        email: "referrer@example.com", // This would come from your database
        creditAmount,
      },
    });
  } catch (error) {
    console.error("Error processing referral:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export default handler;
