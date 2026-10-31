// ImageKit file object type
export interface ImageKitFile {
  fileId: string;
  name: string;
  filePath: string;
  url: string;
  thumbnailUrl?: string;
  thumbnailUrlSmall?: string;
  thumbnailUrlLarge?: string;
  width?: number;
  height?: number;
  size?: number;
  duration?: number;
  createdAt: string;
  updatedAt?: string;
  isVideo?: boolean;
  aspectRatio?: number;
  fallbackUrl?: string;
  tags?: string[];
  fileSize?: number;
  mimeType?: string;
  metadata?: {
    width?: number;
    height?: number;
    [key: string]: unknown;
  };
}
