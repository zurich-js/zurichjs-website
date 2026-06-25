import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { rateLimitRequest } from "@/lib/api/rateLimit";
import { sendPlatformNotification } from "@/lib/notification";
import {
  emailSchema,
  optionalText,
  ratingSchema,
  requiredText,
  validationErrorMessage,
} from "@/lib/validation/input";

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

const notificationSchema = z.object({
  title: requiredText(160),
  message: requiredText(2500),
  type: z.enum([
    "referral",
    "event",
    "workshop",
    "tshirt",
    "merch-suggestion",
    "tap_to_pay_success",
    "other",
  ]),
  priority: z.enum(["low", "normal", "high"]).optional().default("normal"),
  slackChannel: optionalText(120),
  userData: z
    .object({
      name: requiredText(160),
      email: emailSchema,
      userId: optionalText(160).default(""),
      isLoggedIn: z.boolean(),
    })
    .optional(),
  eventData: z
    .object({
      eventId: requiredText(160),
      eventTitle: requiredText(240),
    })
    .optional(),
  feedbackData: z
    .object({
      overallRating: ratingSchema,
      worthTime: requiredText(80),
      wouldRecommend: requiredText(80),
      ratings: z.object({
        food: ratingSchema,
        drinks: ratingSchema,
        talks: ratingSchema,
        timing: ratingSchema,
        execution: ratingSchema,
        dealOfDay: ratingSchema,
      }),
      comments: z.object({
        food: optionalText(1200).default(""),
        drinks: optionalText(1200).default(""),
        talks: optionalText(1200).default(""),
        timing: optionalText(1200).default(""),
        execution: optionalText(1200).default(""),
        dealOfDay: optionalText(1200).default(""),
        improvements: optionalText(1200).default(""),
        futureTopics: optionalText(1200).default(""),
        additional: optionalText(1200).default(""),
      }),
    })
    .optional(),
});

const PUBLIC_NOTIFICATION_TYPES = new Set<PlatformNotification["type"]>([
  "referral",
  "event",
  "workshop",
  "tshirt",
  "merch-suggestion",
  "other",
]);

const PUBLIC_SAFETY_ALERT_CHANNELS = new Set(["#zurichjs-safety", "#organizers"]);

function isAllowedPublicEscalation(notification: PlatformNotification) {
  if (notification.type === "event" && notification.feedbackData) {
    return (
      notification.priority === "high" &&
      !notification.slackChannel &&
      notification.feedbackData.overallRating <= 2
    );
  }

  if (notification.type === "other" && notification.slackChannel) {
    return (
      notification.priority === "high" &&
      PUBLIC_SAFETY_ALERT_CHANNELS.has(notification.slackChannel) &&
      /safety alert/i.test(notification.title) &&
      /code phrase/i.test(notification.message)
    );
  }

  return false;
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
    const parsed = notificationSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: validationErrorMessage(parsed.error) });
    }

    const notification: PlatformNotification = parsed.data;
    const internalSecret = process.env.INTERNAL_NOTIFICATION_SECRET;
    const isInternalRequest =
      Boolean(internalSecret) && req.headers["x-internal-notification-secret"] === internalSecret;

    if (!isInternalRequest) {
      if (!PUBLIC_NOTIFICATION_TYPES.has(notification.type)) {
        return res.status(400).json({ error: "Invalid notification type" });
      }

      if (
        (notification.priority === "high" || notification.slackChannel) &&
        !isAllowedPublicEscalation(notification)
      ) {
        return res.status(403).json({
          error: "High priority notifications and Slack channel routing require internal access",
        });
      }

      if (!isAllowedPublicEscalation(notification)) {
        notification.priority = notification.priority === "low" ? "low" : "normal";
      }
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
