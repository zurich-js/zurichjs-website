import { NextApiRequest, NextApiResponse } from "next";

import { rateLimitRequest } from "@/lib/api/rateLimit";
import { sendPlatformNotification } from "@/lib/notification";

interface PlatformNotification {
  title: string;
  message: string;
  type:
    | "referral"
    | "event"
    | "workshop"
    | "tshirt"
    | "merch-suggestion"
    | "tap_to_pay_success"
    | "other";
  priority: "low" | "normal" | "high";
  slackChannel?: string;
  userData?: {
    name: string;
    email: string;
    userId: string;
    isLoggedIn: boolean;
  };
  eventData?: {
    eventId: string;
    eventTitle: string;
  };
  feedbackData?: {
    overallRating: number;
    worthTime: string;
    wouldRecommend: string;
    ratings: {
      food: number;
      drinks: number;
      talks: number;
      timing: number;
      execution: number;
      dealOfDay: number;
    };
    comments: {
      food: string;
      drinks: string;
      talks: string;
      timing: string;
      execution: string;
      dealOfDay: string;
      improvements: string;
      futureTopics: string;
      additional: string;
    };
  };
}

const PUBLIC_NOTIFICATION_TYPES = new Set<PlatformNotification["type"]>([
  "referral",
  "event",
  "workshop",
  "tshirt",
  "merch-suggestion",
  "other",
]);

function isValidText(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (
    !rateLimitRequest(req, res, {
      key: "notifications-send",
      limit: 5,
      windowMs: 10 * 60 * 1000,
    })
  ) {
    return;
  }

  try {
    const notification: PlatformNotification = req.body;
    const internalSecret = process.env.INTERNAL_NOTIFICATION_SECRET;
    const isInternalRequest =
      Boolean(internalSecret) && req.headers["x-internal-notification-secret"] === internalSecret;

    // Validate required fields
    if (
      !isValidText(notification.title, 160) ||
      !isValidText(notification.message, 2500) ||
      !notification.type
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!isInternalRequest) {
      if (!PUBLIC_NOTIFICATION_TYPES.has(notification.type)) {
        return res.status(400).json({ error: "Invalid notification type" });
      }

      notification.priority = notification.priority === "low" ? "low" : "normal";
      notification.slackChannel = undefined;
    }

    // Set default priority if not provided
    if (!notification.priority) {
      notification.priority = "normal";
    }

    // Map priority strings to numbers for the notification system
    const priorityMap = {
      low: 0,
      normal: 1,
      high: 2,
    };

    // Log detailed data for debugging (especially useful for feedback)
    if (notification.type === "event" && notification.feedbackData) {
      console.log("Detailed feedback submission:", {
        user: notification.userData,
        event: notification.eventData,
        feedback: notification.feedbackData,
        timestamp: new Date().toISOString(),
      });
    }

    // Log Tap to Pay transactions for audit trail
    if (notification.type === "tap_to_pay_success") {
      console.log("Tap to Pay transaction completed:", {
        timestamp: new Date().toISOString(),
        notification: notification,
      });
    }

    // Send the notification using the real notification system
    await sendPlatformNotification({
      title: notification.title,
      message: notification.message,
      priority: priorityMap[notification.priority],
      slackChannel: notification.slackChannel || undefined,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error sending notification:", error);
    return res.status(500).json({ error: "Failed to send notification" });
  }
}

export default handler;
