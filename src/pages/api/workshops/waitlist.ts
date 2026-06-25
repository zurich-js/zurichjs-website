import { getAuth, clerkClient } from "@clerk/nextjs/server";
import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { rateLimitRequest } from "@/lib/api/rateLimit";
import { sendPlatformNotification } from "@/lib/notification";
import { emailSchema, optionalText, requiredText } from "@/lib/validation/input";

const waitlistRequestSchema = z.object({
  workshopId: requiredText(120),
  workshopTitle: requiredText(200),
  email: emailSchema.optional(),
  name: optionalText(120),
  outcome: z.enum(["walk-in", "email-when-available"]),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (
    !rateLimitRequest(req, res, { key: "workshop-waitlist", limit: 5, windowMs: 10 * 60 * 1000 })
  ) {
    return;
  }

  const parsed = waitlistRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid waitlist request" });
  }

  const { workshopId, workshopTitle, email: bodyEmail, name: bodyName, outcome } = parsed.data;

  try {
    // If signed in via Clerk, prefer that email/name (more trustworthy)
    const { userId } = getAuth(req);

    let email: string | undefined;
    let name: string | undefined;
    let source: "authenticated" | "guest" = "guest";

    if (userId) {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      email = user.primaryEmailAddress?.emailAddress;
      name =
        user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : user.username || undefined;
      source = "authenticated";
    }

    if (!email) {
      email = bodyEmail;
    }
    if (!name) {
      name = bodyName;
    }

    if (!email) {
      return res.status(400).json({ error: "A valid email is required to join the waitlist" });
    }

    const displayName = name || "Guest";

    await sendPlatformNotification({
      title: "New Workshop Waitlist Signup",
      message: [
        `*Workshop:* ${workshopTitle} (${workshopId})`,
        `*Name:* ${displayName}`,
        `*Email:* ${email}`,
        `*Source:* ${source}`,
      ].join("\n"),
      priority: 1,
    });

    return res.status(200).json({
      success: true,
      email,
      name: displayName,
      outcome,
    });
  } catch (error) {
    console.error("Workshop waitlist signup error:", error);
    return res.status(500).json({
      error: "Failed to join the waitlist. Please try again later.",
    });
  }
}

export default handler;
