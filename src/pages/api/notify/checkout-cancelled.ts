import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { rateLimitRequest } from "@/lib/api/rateLimit";
import { sendPlatformNotification } from "@/lib/notification";
import { emailSchema, requiredText, slugSchema } from "@/lib/validation/input";

const checkoutCancelledSchema = z.object({
  workshopId: slugSchema.optional(),
  eventId: slugSchema.optional(),
  ticketType: z.enum(["workshop", "event"]).optional(),
  itemTitle: requiredText(200),
  reason: requiredText(500),
  email: emailSchema,
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (
    !rateLimitRequest(req, res, { key: "checkout-cancelled", limit: 5, windowMs: 10 * 60 * 1000 })
  ) {
    return;
  }

  try {
    const parsed = checkoutCancelledSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const { workshopId, eventId, ticketType, itemTitle, reason, email } = parsed.data;

    // Determine purchase type
    const isWorkshop = ticketType === "workshop" || Boolean(workshopId);
    const itemId = isWorkshop ? workshopId : eventId;
    const itemType = isWorkshop ? "Workshop" : "Event";

    // Create a descriptive message
    const message = {
      title: `⚠️ Checkout Cancelled: ${itemTitle}`,
      message: `Type: ${itemType}
${itemType} ID: ${itemId || "Not specified"}
${itemType}: ${itemTitle}
Reason: ${reason}
Customer Email: ${email}`,
      priority: 0,
    };

    // Send notification to platforms
    await sendPlatformNotification(message);

    // Return success response
    return res.status(200).json({ success: true });
  } catch (err: unknown) {
    console.error("Failed to send cancellation notification:", err);
    const error = err as { message: string };

    return res.status(500).json({
      error: error.message || "An unknown error occurred",
    });
  }
}

export default handler;
