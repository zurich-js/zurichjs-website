import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { rateLimitRequest } from "@/lib/api/rateLimit";
import { emailSchema, optionalText } from "@/lib/validation/input";

// EmailOctopus API details
const API_KEY = process.env.EMAIL_OCTOPUS_API_KEY;
const LIST_ID = process.env.EMAIL_OCTOPUS_LIST_ID;
const API_URL = "https://emailoctopus.com/api/1.6";
const subscribeSchema = z.object({
  email: emailSchema,
  firstName: optionalText(120),
  lastName: optionalText(120),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!rateLimitRequest(req, res, { key: "subscribe", limit: 5, windowMs: 10 * 60 * 1000 })) {
    return;
  }

  const parsed = subscribeSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: "Email is required" });
  }

  const { email } = parsed.data;

  try {
    // Make request to EmailOctopus API
    const response = await fetch(`${API_URL}/lists/${LIST_ID}/contacts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: API_KEY,
        email_address: email,
        status: "SUBSCRIBED",
        // You can add more fields if needed
        // fields: {
        //   FirstName: firstName,
        //   LastName: lastName,
        // },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle EmailOctopus specific errors
      if (data.error?.code === "MEMBER_EXISTS_WITH_EMAIL_ADDRESS") {
        return res.status(400).json({ error: "You are already subscribed!" });
      }

      throw new Error(data.error?.message || "Failed to subscribe");
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Newsletter subscription error:", error);
    return res.status(500).json({
      error: "Failed to subscribe. Please try again later.",
    });
  }
}

export default handler;
