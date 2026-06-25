import { clerkClient } from "@clerk/nextjs/server";
import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { requireAdminOrg } from "@/lib/api/adminAuth";
import { requiredText } from "@/lib/validation/input";

const updateCreditsSchema = z.object({
  userId: requiredText(160),
  credits: z.coerce.number().int().min(0).max(100000),
  action: z.enum(["add", "remove", "set"]),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!requireAdminOrg(req, res)) {
    return;
  }

  try {
    const clerk = await clerkClient();

    // Get request data
    const parsed = updateCreditsSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { userId, credits, action } = parsed.data;

    // Get the target user
    const user = await clerk.users.getUser(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get current credits or initialize if it doesn't exist
    const currentCredits = (user.unsafeMetadata?.credits as number) || 0;

    let newCreditValue: number;

    if (action === "add") {
      newCreditValue = currentCredits + credits;
    } else if (action === "remove") {
      newCreditValue = Math.max(0, currentCredits - credits);
    } else if (action === "set") {
      newCreditValue = Math.max(0, credits); // Ensure we don't set negative credits
    } else {
      return res.status(400).json({ error: 'Invalid action. Use "add", "remove", or "set"' });
    }

    // Update the user's metadata
    await clerk.users.updateUser(userId, {
      unsafeMetadata: {
        ...user.unsafeMetadata,
        credits: newCreditValue,
      },
    });

    // Return success
    return res.status(200).json({
      success: true,
      credits: newCreditValue,
      message: `Successfully ${action === "add" ? "added" : action === "remove" ? "removed" : "set"} credits to ${newCreditValue}`,
    });
  } catch (error) {
    console.error("Error updating credits:", error);
    return res.status(500).json({ error: "Failed to update credits" });
  }
}

export default handler;
