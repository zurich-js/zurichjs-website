import type { NextApiRequest, NextApiResponse } from "next";

import { rateLimitRequest } from "@/lib/api/rateLimit";
import { sendPlatformNotification } from "@/lib/notification";

type ResponseData = {
  success: boolean;
  message: string;
};

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
    const { companyName, contactName, email, phone, message, tierInterest, venueDetails } =
      req.body;

    // Basic validation
    if (
      typeof companyName !== "string" ||
      companyName.length > 160 ||
      typeof contactName !== "string" ||
      contactName.length > 120 ||
      typeof email !== "string" ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    if (typeof message === "string" && message.length > 2500) {
      return res.status(400).json({ success: false, message: "Message is too long" });
    }

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
