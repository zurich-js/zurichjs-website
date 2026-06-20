export type MediaKind = "photo" | "video";

export interface MediaAsset {
  id: string;
  eventId: string;
  kind: MediaKind;
  name: string;
  url: string;
  thumbnailUrl: string | null;
  createdAt: string;
  width?: number;
  height?: number;
  duration?: number;
  fileSize?: number;
}

export interface MediaCollection {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventHref: string;
  cover: MediaAsset | null;
  photoCount: number;
  videoCount: number;
}

export interface MediaOverviewResponse {
  summary: {
    photoCount: number;
    videoCount: number;
    collectionCount: number;
  };
  recentPhotos: MediaAsset[];
  collections: MediaCollection[];
}

export interface EventMediaResponse {
  eventId: string;
  items: MediaAsset[];
  nextSkip: number | null;
  photoCount?: number;
  videoCount?: number;
}
