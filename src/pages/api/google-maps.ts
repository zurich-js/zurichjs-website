import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { requiredText } from "@/lib/validation/input";

const googleMapsQuerySchema = z.object({
  location: requiredText(240),
});

function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const parsed = googleMapsQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({ error: "Single location parameter is required" });
  }

  const { location } = parsed.data;

  // Process the location (in a real app, you might call Google Maps API here)
  const encodedLocation = encodeURIComponent(location);
  const responseString = `https://maps.googleapis.com/maps/api/staticmap?center=${encodedLocation}&zoom=15&size=600x300&markers=color:yellow%7C${encodedLocation}&key=${process.env.GOOGLE_MAPS_API_KEY}`;

  // Return the response as a string
  res.status(200).send({
    url: responseString,
  });
}

export default handler;
