import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { rateLimitRequest } from "@/lib/api/rateLimit";
import { sendPlatformNotification } from "@/lib/notification";
import { emailSchema, optionalText, requiredText } from "@/lib/validation/input";

type ResponseData = {
  success: boolean;
  message: string;
};

const vereinInquirySchema = z.object({
  name: requiredText(120),
  email: emailSchema,
  message: optionalText(2000),
  tier: optionalText(80),
  billingCycle: z.enum(["monthly", "yearly"]).optional(),
});

async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  if (!rateLimitRequest(req, res, { key: "verein-inquiry", limit: 3, windowMs: 10 * 60 * 1000 })) {
    return;
  }

  try {
    const parsed = vereinInquirySchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const { name, email, message, tier, billingCycle } = parsed.data;

    const parts = [
      `Name: ${name}`,
      `Email: ${email}`,
      ...(tier ? [`Tier: ${tier}`] : []),
      ...(billingCycle ? [`Billing: ${billingCycle}`] : []),
      `Message: ${message || "No message provided"}`,
    ];

    await sendPlatformNotification({
      title: `New Verein Membership Inquiry${tier ? ` (${tier})` : ""}`,
      message: parts.join("\n"),
      priority: 0,
    });

    return res.status(200).json({
      success: true,
      message: "Verein inquiry submitted successfully",
    });
  } catch (error) {
    console.error("Verein inquiry error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit inquiry",
    });
  }
}

export default handler;
