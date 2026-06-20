import { ImageKit } from "@imagekit/nodejs";
import { NextApiRequest, NextApiResponse } from "next";

import { ImageKitFile } from "../../../types/gallery";
import { isVideoFile, generateThumbnail } from "../../../utils/thumbnailGenerator";
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");

    const imagekit = new ImageKit({
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
    });

    const list = await imagekit.assets.list({
      limit: 1000,
      type: "file",
      sort: "DESC_CREATED",
    });

    const filesByFolder: Record<string, ImageKitFile[]> = {};

    list.forEach((file: unknown) => {
      const fileObj = file as Record<string, unknown>;
      if (fileObj.filePath && fileObj.fileId && fileObj.url) {
        const pathParts = (fileObj.filePath as string).split("/").filter(Boolean);
        if (pathParts.length > 0) {
          const folder = pathParts[0];
          if (!filesByFolder[folder]) {
            filesByFolder[folder] = [];
          }

          const isVideo = isVideoFile(fileObj.name as string);

          // Get actual dimensions from ImageKit or calculate from metadata
          const metadata = fileObj.metadata as { width?: number; height?: number } | undefined;
          const actualWidth =
            (fileObj.width as number) || metadata?.width || (isVideo ? 1920 : 1200);
          const actualHeight =
            (fileObj.height as number) || metadata?.height || (isVideo ? 1080 : 800);

          // Calculate aspect ratio for consistent display
          const aspectRatio = actualWidth / actualHeight;

          const thumbnailUrl = isVideo
            ? undefined
            : generateThumbnail(fileObj.url as string, false, "medium");

          const enhancedFile: ImageKitFile = {
            fileId: fileObj.fileId as string,
            name: fileObj.name as string,
            filePath: fileObj.filePath as string,
            url: fileObj.url as string,
            createdAt: fileObj.createdAt as string,
            isVideo,
            width: actualWidth,
            height: actualHeight,
            aspectRatio,
            thumbnailUrl,
            duration: (fileObj.duration as number) || (isVideo ? 120 : undefined),
            fileSize: (fileObj.size as number) || 0,
          };

          filesByFolder[folder].push(enhancedFile);
        }
      }
    });

    // Sort files within each folder by creation date (newest first)
    Object.keys(filesByFolder).forEach((folder) => {
      filesByFolder[folder].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    });

    res.status(200).json(filesByFolder);
  } catch (error) {
    console.error("Error fetching files from ImageKit:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export default handler;
