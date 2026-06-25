import { clerkClient } from "@clerk/nextjs/server";
import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { rateLimitRequest } from "@/lib/api/rateLimit";
import { requiredText } from "@/lib/validation/input";

const userLookupQuerySchema = z.object({
  id: requiredText(160).regex(/^user_[a-zA-Z0-9]+$/),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (
    !rateLimitRequest(req, res, { key: "public-user-lookup", limit: 20, windowMs: 10 * 60 * 1000 })
  ) {
    return;
  }

  const parsed = userLookupQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({ error: "User ID is required" });
  }

  const { id } = parsed.data;

  try {
    // Initialize the clerk client
    const client = await clerkClient();

    // Get user by ID
    const user = await client.users.getUser(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Return a sanitized user object with just the needed fields
    return res.status(200).json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
      profileImageUrl: user.imageUrl,
      createdAt: user.createdAt,
    });
  } catch (error: unknown) {
    console.error("Error fetching user:", error);

    return res.status(500).json({
      error: "Failed to fetch user",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export default handler;
