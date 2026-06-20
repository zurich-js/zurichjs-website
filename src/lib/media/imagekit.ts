import { ImageKit } from "@imagekit/nodejs";
import type { File } from "@imagekit/nodejs/resources/files/files";

import type { MediaAsset, MediaKind } from "@/types/media";

const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "avi", "mkv", "webm", "wmv", "flv", "m4v"]);

type ListOptions = {
  limit?: number;
  skip?: number;
  kind?: MediaKind | "all";
};

export function getImageKitClient() {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("IMAGEKIT_PRIVATE_KEY is not configured");
  }

  return new ImageKit({ privateKey });
}

export function isVideoAsset(name = "", mime = "") {
  const extension = name.toLowerCase().split(".").pop();
  return (
    Boolean(extension && VIDEO_EXTENSIONS.has(extension)) || mime.toLowerCase().startsWith("video/")
  );
}

function withTransformation(url: string, transformation: string) {
  if (!url.includes("ik.imagekit.io")) return url;

  try {
    const parsedUrl = new URL(url);
    parsedUrl.searchParams.set("tr", transformation);
    return parsedUrl.toString();
  } catch {
    return url;
  }
}

export function getImageThumbnailUrl(url: string, variant: "cover" | "grid" | "detail" = "grid") {
  const transformations = {
    cover: "w-640,h-420,c-at_least,q-75,fo-auto",
    grid: "w-360,h-240,c-at_least,q-70,fo-auto",
    detail: "w-1200,q-80,fo-auto",
  };

  return withTransformation(url, transformations[variant]);
}

export function getVideoThumbnailUrl(url: string, width = 640) {
  if (!url.includes("ik.imagekit.io")) return null;

  try {
    const parsedUrl = new URL(url);
    const baseUrl = `${parsedUrl.origin}${parsedUrl.pathname}/ik-thumbnail.jpg`;
    return `${baseUrl}?tr=so-5,w-${width},q-75`;
  } catch {
    return null;
  }
}

export function getEventIdFromPath(filePath = "") {
  return filePath.split("/").filter(Boolean)[0] || "";
}

export function toMediaAsset(file: File): MediaAsset | null {
  if (!file.fileId || !file.filePath || !file.url || !file.name || !file.createdAt) {
    return null;
  }

  const eventId = getEventIdFromPath(file.filePath);
  if (!eventId) return null;

  const kind: MediaKind = isVideoAsset(file.name, file.mime) ? "video" : "photo";

  return {
    id: file.fileId,
    eventId,
    kind,
    name: file.name,
    url: file.url,
    thumbnailUrl:
      kind === "video" ? getVideoThumbnailUrl(file.url) : getImageThumbnailUrl(file.url, "grid"),
    createdAt: file.createdAt,
    width: file.width,
    height: file.height,
    duration: file.duration,
    fileSize: file.size,
  };
}

export async function listRecentMedia(kind: MediaKind, limit: number) {
  const imagekit = getImageKitClient();
  const list = await imagekit.assets.list({
    type: "file",
    fileType: kind === "photo" ? "image" : "non-image",
    limit,
    sort: "DESC_CREATED",
  });

  return list
    .filter((asset): asset is File => asset.type === "file")
    .map(toMediaAsset)
    .filter((asset): asset is MediaAsset => Boolean(asset))
    .filter((asset) => asset.kind === kind)
    .slice(0, limit);
}

export async function listAllMediaForOverview(limit = 1000) {
  const imagekit = getImageKitClient();
  const list = await imagekit.assets.list({
    type: "file",
    limit,
    sort: "DESC_CREATED",
  });

  return list
    .filter((asset): asset is File => asset.type === "file")
    .map(toMediaAsset)
    .filter((asset): asset is MediaAsset => Boolean(asset));
}

export async function listEventMedia(eventId: string, options: ListOptions = {}) {
  const { limit = 24, skip = 0, kind = "all" } = options;
  const imagekit = getImageKitClient();
  const list = await imagekit.assets.list({
    type: "file",
    path: `/${eventId}/`,
    limit,
    skip,
    sort: "DESC_CREATED",
    fileType: kind === "photo" ? "image" : kind === "video" ? "non-image" : "all",
  });

  return list
    .filter((asset): asset is File => asset.type === "file")
    .map(toMediaAsset)
    .filter((asset): asset is MediaAsset => Boolean(asset))
    .filter((asset) => asset.eventId === eventId)
    .filter((asset) => kind === "all" || asset.kind === kind);
}
