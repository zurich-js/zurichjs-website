import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { rateLimitRequest } from "@/lib/api/rateLimit";
import { sendPlatformNotification } from "@/lib/notification";
import { emailSchema, optionalText, requiredText } from "@/lib/validation/input";

type ResponseData = {
  success: boolean;
  message: string;
};

const partnershipInquirySchema = z.object({
  companyName: requiredText(160),
  contactName: requiredText(120),
  email: emailSchema,
  phone: optionalText(80),
  message: optionalText(2500),
  tierInterest: optionalText(80),
  venueDetails: z
    .object({
      canProvideFoodDrinks: z.boolean().optional(),
      venueCapacity: optionalText(80),
    })
    .optional(),
});

async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  if (
    !rateLimitRequest(req, res, { key: "partnership-inquiry", limit: 3, windowMs: 10 * 60 * 1000 })
  ) {
    return;
  }

  try {
    const parsed = partnershipInquirySchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const { companyName, contactName, email, phone, message, tierInterest, venueDetails } =
      parsed.data;

    // Format the notification message
    const notificationMessage = {
      title: `New Partnership Inquiry: ${companyName}`,
      message: `
        Tier: ${tierInterest}
        Contact: ${contactName}
        Email: ${email}
        Phone: ${phone || "Not provided"}
        Message: ${message || "No message provided"}
        ${
          tierInterest === "venue"
            ? `
        Venue Details:
        - Can provide food/drinks: ${venueDetails?.canProvideFoodDrinks ? "Yes" : "No"}
        - Venue capacity: ${venueDetails?.venueCapacity || "Not specified"}
        `
            : ""
        }
      `,
      priority: 0,
    };

    // Send the notification
    await sendPlatformNotification(notificationMessage);

    // Return success response
    return res.status(200).json({
      success: true,
      message: "Partnership inquiry submitted successfully",
    });
  } catch (error) {
    console.error("Partnership inquiry error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit partnership inquiry",
    });
  }
}

export default handler;
