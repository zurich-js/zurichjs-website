import type { NextApiRequest, NextApiResponse } from "next";

import { listAllMediaForOverview, listRecentMedia } from "@/lib/media/imagekit";
import { getPastEventsForMedia } from "@/sanity/queries";
import type { MediaCollection, MediaOverviewResponse } from "@/types/media";

function toTimestamp(value: string | null | undefined) {
  return value ? new Date(value).getTime() : 0;
}

const COLLECTION_LIMIT = 12;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MediaOverviewResponse | { message: string }>,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");

    const [recentPhotos, allMedia, pastEvents] = await Promise.all([
      listRecentMedia("photo", 12),
      listAllMediaForOverview(),
      getPastEventsForMedia(),
    ]);

    const eventById = new Map(pastEvents.map((event) => [event.id, event]));
    const mediaByEvent = allMedia.reduce<Record<string, typeof allMedia>>((groups, asset) => {
      groups[asset.eventId] = groups[asset.eventId] || [];
      groups[asset.eventId].push(asset);
      return groups;
    }, {});

    const collections: MediaCollection[] = Object.entries(mediaByEvent)
      .map(([eventId, assets]) => {
        const event = eventById.get(eventId);
        const sortedAssets = [...assets].sort(
          (a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt),
        );
        const cover =
          sortedAssets.find((asset) => asset.kind === "photo") || sortedAssets[0] || null;

        return {
          eventId,
          eventTitle: event?.title || eventId,
          eventDate: event?.datetime || "",
          eventHref: `/events/${eventId}#media`,
          cover,
          photoCount: assets.filter((asset) => asset.kind === "photo").length,
          videoCount: assets.filter((asset) => asset.kind === "video").length,
        };
      })
      .filter((collection) => collection.photoCount + collection.videoCount > 0)
      .sort((a, b) => toTimestamp(b.eventDate) - toTimestamp(a.eventDate));

    const response: MediaOverviewResponse = {
      summary: {
        photoCount: allMedia.filter((asset) => asset.kind === "photo").length,
        videoCount: allMedia.filter((asset) => asset.kind === "video").length,
        collectionCount: collections.length,
      },
      recentPhotos,
      collections: collections.slice(0, COLLECTION_LIMIT),
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching media overview:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
