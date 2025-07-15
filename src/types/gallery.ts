// Event types for filtering gallery content
export enum EventType {
  ALL = 'all',
  MEETUP = 'meetup',
  WORKSHOP = 'workshop',
  SOCIAL = 'social',
  CONFERENCE = 'conference'
}

// Media types for gallery filtering
export enum MediaType {
  ALL = 'all',
  PHOTO = 'photo',
  VIDEO = 'video'
}

// Sort options for gallery
export enum SortOption {
  DATE_DESC = 'date_desc',
  DATE_ASC = 'date_asc',
  EVENT_NAME = 'event_name',
  POPULARITY = 'popularity'
}

// Time period filters
export enum TimePeriod {
  ALL = 'all',
  RECENT = 'recent',
  THIS_YEAR = 'this_year',
  LAST_YEAR = 'last_year'
}

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

// Props types (data passed to components)
export interface GalleryPageProps {
  initialMedia: MediaItem[];
  totalCount: number;
  featuredEvents: FeaturedEvent[];
}

export interface MediaItem {
  id: string;
  url: string;
  thumbnailUrl: string;
  type: MediaType;
  eventType: EventType;
  eventName: string;
  eventDate: string;
  photographer: string;
  tags: string[];
  description: string;
  width: number;
  height: number;
  aspectRatio?: number; // calculated from width/height
  duration?: number; // for videos
}

export interface FeaturedEvent {
  id: string;
  name: string;
  date: string;
  mediaCount: number;
}

export interface GalleryFilters {
  eventType: EventType;
  mediaType: MediaType;
  timePeriod: TimePeriod;
  searchQuery: string;
  sortBy: SortOption;
}

// Query types (API response data)
export interface GalleryQueryResponse {
  media: MediaItem[];
  totalCount: number;
  hasMore: boolean;
  nextCursor?: string;
}