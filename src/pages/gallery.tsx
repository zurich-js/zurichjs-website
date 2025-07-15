import { motion } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';

import GalleryFiltersComponent from '../components/gallery/GalleryFilters';
import MediaGrid from '../components/gallery/MediaGrid';
import MediaModal from '../components/gallery/MediaModal';
import SimpleLayout from '../components/layout/SimpleLayout';
import Section from '../components/Section';
import { 
  MediaItem, 
  GalleryFilters, 
  EventType, 
  MediaType, 
  TimePeriod, 
  SortOption,
  GalleryPageProps,
  ImageKitFile
} from '../types/gallery';
import { generateThumbnail } from '../utils/thumbnailGenerator';

// Helper function to determine media type from enhanced file data
const getMediaType = (file: ImageKitFile): MediaType => {
  return file.isVideo ? MediaType.VIDEO : MediaType.PHOTO;
};

// Helper function to convert enhanced ImageKit files to MediaItem format
const convertImageKitToMediaItem = (file: ImageKitFile): MediaItem => {
  const mediaType = getMediaType(file);
  
  return {
    id: file.fileId,
    url: file.url,
    thumbnailUrl: file.thumbnailUrl || generateThumbnail(file.url, mediaType === MediaType.VIDEO, 'medium'),
    type: mediaType,
    eventType: EventType.MEETUP, // Default to meetup, could be enhanced with folder-based detection
    eventName: file.filePath.split('/')[0] || 'Unknown Event',
    eventDate: file.createdAt,
    photographer: 'Community',
    tags: file.tags || [],
    description: file.name,
    width: file.width || file.metadata?.width || (mediaType === MediaType.VIDEO ? 1920 : 1200),
    height: file.height || file.metadata?.height || (mediaType === MediaType.VIDEO ? 1080 : 800),
    duration: mediaType === MediaType.VIDEO ? file.duration : undefined
  };
};

export default function GalleryPage({ initialMedia }: GalleryPageProps) {
  const [allMedia, setAllMedia] = useState<MediaItem[]>(initialMedia);
  const [filters, setFilters] = useState<GalleryFilters>({
    eventType: EventType.ALL,
    mediaType: MediaType.ALL,
    timePeriod: TimePeriod.ALL,
    searchQuery: '',
    sortBy: SortOption.DATE_DESC
  });
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Fetch real ImageKit data on component mount
  useEffect(() => {
    const fetchImageKitData = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/imagekit/list');
        const filesByFolder = await response.json() as Record<string, ImageKitFile[]>;
        
        // Convert ImageKit files to MediaItem format
        const mediaItems: MediaItem[] = [];
        Object.entries(filesByFolder).forEach(([, files]) => {
          files.forEach(file => {
            mediaItems.push(convertImageKitToMediaItem(file));
          });
        });
        
        // Sort media items by date for consistent ordering
        mediaItems.sort((a, b) => {
          const dateA = new Date(a.eventDate).getTime();
          const dateB = new Date(b.eventDate).getTime();
          return dateB - dateA; // Newest first
        });
        
        setAllMedia(mediaItems);
        setHasMore(false); // Since we're loading all data at once
      } catch (error) {
        console.error('Error fetching ImageKit data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchImageKitData();
  }, []);

  // Filter media based on current filters
  const filteredMedia = useMemo(() => {
    let filtered = allMedia;

    // Filter by event type
    if (filters.eventType !== EventType.ALL) {
      filtered = filtered.filter(media => media.eventType === filters.eventType);
    }

    // Filter by media type
    if (filters.mediaType !== MediaType.ALL) {
      filtered = filtered.filter(media => media.type === filters.mediaType);
    }

    // Filter by time period
    if (filters.timePeriod !== TimePeriod.ALL) {
      const now = new Date();
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      const currentYearStart = new Date(now.getFullYear(), 0, 1);
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());

      filtered = filtered.filter(media => {
        const mediaDate = new Date(media.eventDate);
        switch (filters.timePeriod) {
          case TimePeriod.RECENT:
            return mediaDate >= threeMonthsAgo;
          case TimePeriod.THIS_YEAR:
            return mediaDate >= currentYearStart;
          case TimePeriod.LAST_YEAR:
            return mediaDate >= oneYearAgo && mediaDate < currentYearStart;
          default:
            return true;
        }
      });
    }

    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(media => 
        media.eventName.toLowerCase().includes(query) ||
        media.description.toLowerCase().includes(query) ||
        media.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Sort media
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case SortOption.DATE_ASC:
          return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
        case SortOption.DATE_DESC:
          return new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime();
        case SortOption.EVENT_NAME:
          return a.eventName.localeCompare(b.eventName);
        case SortOption.POPULARITY:
          // For now, sort by date desc as a proxy for popularity
          return new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [allMedia, filters]);

  const handleFiltersChange = (newFilters: Partial<GalleryFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleClearFilters = () => {
    setFilters({
      eventType: EventType.ALL,
      mediaType: MediaType.ALL,
      timePeriod: TimePeriod.ALL,
      searchQuery: '',
      sortBy: SortOption.DATE_DESC
    });
  };

  const handleMediaClick = (media: MediaItem) => {
    setSelectedMedia(media);
  };

  const handleModalClose = () => {
    setSelectedMedia(null);
  };

  const handleModalNavigate = (direction: 'prev' | 'next') => {
    if (!selectedMedia) return;

    const currentIndex = filteredMedia.findIndex(item => item.id === selectedMedia.id);
    let newIndex;

    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : filteredMedia.length - 1;
    } else {
      newIndex = currentIndex < filteredMedia.length - 1 ? currentIndex + 1 : 0;
    }

    setSelectedMedia(filteredMedia[newIndex]);
  };

  const handleLoadMore = () => {
    // Since we're loading all data at once, this is a no-op
    // but keeping it for API compatibility
  };

  return (
    <SimpleLayout>
      <Section variant="gray" padding="lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4"
            >
              Community Gallery
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-lg text-gray-600 max-w-3xl mx-auto"
            >
              Explore moments from our events, workshops, and community gatherings. 
              Filter by event type, media type, or search for specific content.
            </motion.p>
          </div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <GalleryFiltersComponent
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={handleClearFilters}
            />
          </motion.div>

          {/* Media Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <MediaGrid
              media={filteredMedia}
              loading={loading}
              hasMore={hasMore}
              totalCount={filteredMedia.length}
              onLoadMore={handleLoadMore}
              onMediaClick={handleMediaClick}
            />
          </motion.div>
        </div>
      </Section>

      {/* Media Modal */}
      <MediaModal
        media={selectedMedia}
        allMedia={filteredMedia}
        onClose={handleModalClose}
        onNavigate={handleModalNavigate}
      />
    </SimpleLayout>
  );
}

export async function getStaticProps() {
  // Return empty initial data since we'll fetch real data on client side
  return {
    props: {
      initialMedia: [],
      totalCount: 0,
      featuredEvents: []
    },
    revalidate: 3600, // Revalidate every hour
  };
}