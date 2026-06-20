import type { NextApiRequest, NextApiResponse } from "next";

import { listEventMedia } from "@/lib/media/imagekit";
import type { EventMediaResponse, MediaKind } from "@/types/media";

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 48;

function parsePositiveInteger(value: string | string[] | undefined, fallback: number) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number(rawValue);

  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.floor(parsed);
}

function parseKind(value: string | string[] | undefined): MediaKind | "all" {
  const rawValue = Array.isArray(value) ? value[0] : value;
  return rawValue === "photo" || rawValue === "video" ? rawValue : "all";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<EventMediaResponse | { message: string }>,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const eventId = Array.isArray(req.query.eventId) ? req.query.eventId[0] : req.query.eventId;
  if (!eventId) {
    return res.status(400).json({ message: "Missing eventId" });
  }

  const limit = Math.min(parsePositiveInteger(req.query.limit, DEFAULT_LIMIT), MAX_LIMIT);
  const skip = parsePositiveInteger(req.query.skip, 0);
  const kind = parseKind(req.query.kind);
  const includeCounts = req.query.includeCounts !== "false";

  try {
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");

    const [items, allItems] = await Promise.all([
      listEventMedia(eventId, { limit: limit + 1, skip, kind }),
      includeCounts ? listEventMedia(eventId, { limit: 1000, skip: 0, kind: "all" }) : null,
    ]);

    const pageItems = items.slice(0, limit);

    return res.status(200).json({
      eventId,
      items: pageItems,
      nextSkip: items.length > limit ? skip + limit : null,
      ...(allItems
        ? {
            photoCount: allItems.filter((asset) => asset.kind === "photo").length,
            videoCount: allItems.filter((asset) => asset.kind === "video").length,
          }
        : {}),
    });
  } catch (error) {
    console.error(`Error fetching media for event ${eventId}:`, error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
