import { motion } from 'framer-motion';
import { Camera, Video, Calendar, MapPin, ExternalLink, Play, Image as ImageIcon, Clock, Zap, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect, useCallback, useMemo } from 'react';

import Layout from '@/components/layout/Layout';
import Section from '@/components/Section';
import SEO from '@/components/SEO';
import Button from '@/components/ui/Button';
import ImageGallery from '@/components/ui/ImageGallery';
import VideoPlayer from '@/components/ui/VideoPlayer';
import { Event, getPastEvents } from "@/sanity/queries"

import { ImageKitFile } from '../types/gallery';
import { isVideoFile } from '../utils/thumbnailGenerator';

export type MediaProps = {
  pastEvents: Event[];
}

interface MediaItem {
  type: 'photo' | 'video';
  url: string;
  thumbnailUrl?: string;
  duration?: number;
  fileSize?: number;
  mimeType?: string;
  createdAt: string;
  width?: number;
  height?: number;
}

interface EventMedia {
  folderId: string;
  event: Event | null;
  media: MediaItem[];
}

interface FeaturedImage {
  url: string;
  thumbnailUrl: string;
  eventName: string;
  eventDate: string;
  eventId: string;
  aspectRatio?: number;
}

// Video detection is now handled by the centralized utility function

// Helper function to get the first photo from media array (skip videos)
const getFirstPhoto = (media: MediaItem[]) => {
  return media.find(item => item.type === 'photo') || null;
};

// Helper function to get the first video from media array
const getFirstVideo = (media: MediaItem[]) => {
  return media.find(item => item.type === 'video') || null;
};

// Helper function to get appropriate thumbnail based on active tab
const getThumbnailMedia = (media: MediaItem[], activeTab: string) => {
  if (activeTab === 'videos') {
    return getFirstVideo(media) || getFirstPhoto(media);
  } else {
    return getFirstPhoto(media) || getFirstVideo(media);
  }
};

// Safe Image component with fallback handling to prevent infinite loops
const SafeImage: React.FC<{
  src: string;
  alt: string;
  fill?: boolean;
  className?: string;
  sizes?: string;
  fallbackSrc?: string;
  isVideo?: boolean;
}> = ({ src, alt, fill = true, className, sizes, fallbackSrc, isVideo }) => {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback(() => {
    if (!hasError && fallbackSrc && currentSrc !== fallbackSrc) {
      setHasError(true);
      setCurrentSrc(fallbackSrc);
    } else if (!hasError) {
      setHasError(true);
      // Show placeholder div instead of broken image
    }
  }, [hasError, fallbackSrc, currentSrc]);

  // Reset error state when src changes
  useEffect(() => {
    if (src !== currentSrc) {
      setCurrentSrc(src);
      setHasError(false);
    }
  }, [src, currentSrc]);

  // If it's a video file, show video placeholder
  if (isVideo && (hasError || isVideoFile(src))) {
    return (
      <div className={`bg-gray-900 flex items-center justify-center ${className || ''}`}>
        <div className="flex flex-col items-center justify-center text-white">
          <Video className="w-12 h-12 mb-2" />
          <span className="text-sm font-medium">Video</span>
        </div>
      </div>
    );
  }

  if (hasError && (!fallbackSrc || currentSrc === fallbackSrc)) {
    // Show placeholder when all fallbacks fail
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className || ''}`}>
        <ImageIcon className="w-8 h-8 text-gray-400" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <Image
        src={currentSrc}
        alt={alt}
        fill={fill}
        className={className}
        sizes={sizes}
        onError={handleError}
      />
      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
          <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 sm:p-3 group-hover:scale-110 transition-transform duration-200">
            <Play size={20} className="sm:w-6 sm:h-6 text-gray-900 ml-0.5" />
          </div>
        </div>
      )}
    </div>
  );
};

function filterEventMedias(eventMedias: EventMedia[], activeTab: 'all' | 'photos' | 'videos'): EventMedia[] {
  if (activeTab === 'photos') {
    return eventMedias.map(eventMedia => ({
      ...eventMedia,
      media: eventMedia.media.filter(media => media.type === 'photo'),
    })).filter(eventMedia => eventMedia.media.length > 0);
  } else if (activeTab === 'videos') {
    return eventMedias.map(eventMedia => ({
      ...eventMedia,
      media: eventMedia.media.filter(media => media.type === 'video'),
    })).filter(eventMedia => eventMedia.media.length > 0);
  } else {
    return eventMedias.filter(eventMedia => eventMedia.media.length > 0);
  }
}

function createEventMedias(pastEvents: Event[], filesByFolder: Record<string, ImageKitFile[]>): EventMedia[] {
  return Object.entries(filesByFolder).map(([folderId, files]) => {
    const event = pastEvents.find(event => event.id === folderId);
    const media: MediaItem[] = files.map((file: ImageKitFile) => {
      const isVideo = isVideoFile(file.name);
      return {
        type: isVideo ? 'video' : 'photo',
        url: file.url,
        thumbnailUrl: file.thumbnailUrl, // Use the API-provided thumbnailUrl
        duration: isVideo ? file.duration || 120 : undefined,
        fileSize: file.fileSize || 0,
        mimeType: file.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg'),
        createdAt: file.createdAt,
        width: file.width,
        height: file.height
      };
    });
    
    return ({ 
      folderId: folderId, 
      event: event || null,  
      media
    });
  }).filter(eventMedia => eventMedia.media.length > 0);
}

// Helper function to get featured images from all events - now deterministic
function getFeaturedImages(eventMedias: EventMedia[]): FeaturedImage[] {
  const allImages: FeaturedImage[] = [];
  
  eventMedias.forEach(eventMedia => {
    const photos = eventMedia.media.filter(m => m.type === 'photo');
    photos.forEach(photo => {
      allImages.push({
        url: photo.url,
        thumbnailUrl: photo.thumbnailUrl || photo.url,
        eventName: eventMedia.event?.title || `Event ${eventMedia.folderId}`,
        eventDate: eventMedia.event?.datetime || '',
        eventId: eventMedia.folderId,
        aspectRatio: photo.width && photo.height ? photo.width / photo.height : undefined
      });
    });
  });
  
  // Sort by a stable algorithm instead of random
  // Use a combination of creation time and event ID for deterministic but varied selection
  return allImages
    .sort((a, b) => {
      // First sort by event date (newer first)
      const dateA = new Date(a.eventDate || 0).getTime();
      const dateB = new Date(b.eventDate || 0).getTime();
      if (dateA !== dateB) return dateB - dateA;
      
      // Then by event ID for consistency
      return a.eventId.localeCompare(b.eventId);
    })
    .slice(0, 6); // Take the first 6 after stable sorting
}

// Helper function to get the latest video
function getLatestVideo(eventMedias: EventMedia[]): { media: MediaItem; event: EventMedia } | null {
  let latestVideo: { media: MediaItem; event: EventMedia } | null = null;
  let latestDate = new Date(0);
  
  eventMedias.forEach(eventMedia => {
    const videos = eventMedia.media.filter(m => m.type === 'video');
    videos.forEach(video => {
      const videoDate = new Date(video.createdAt);
      if (videoDate > latestDate) {
        latestDate = videoDate;
        latestVideo = { media: video, event: eventMedia };
      }
    });
  });
  
  return latestVideo;
}

export default function Media({ pastEvents }: MediaProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'photos' | 'videos'>('all');
  const [eventMedias, setEventMedias] = useState<EventMedia[]>([]);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedEventMedia, setSelectedEventMedia] = useState<EventMedia | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<MediaItem | null>(null);

  const filteredMedia = filterEventMedias(eventMedias, activeTab);
  const allMedia = eventMedias.flatMap(eventMedia => eventMedia.media);
  
  // Memoize featured images to prevent re-computation on every render
  const featuredImages = useMemo(() => getFeaturedImages(eventMedias), [eventMedias]);
  const latestVideo = useMemo(() => getLatestVideo(eventMedias), [eventMedias]);

  useEffect(() => {
    fetch('/api/imagekit/list', {
      method: 'GET',
      headers: {
          'Content-Type': 'application/json',
      },
    }).then(response => response.json())
      .then((filesByFolder: Record<string, ImageKitFile[]>) => {
        const eventMedias = createEventMedias(pastEvents, filesByFolder);
        setEventMedias(eventMedias);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching media:', error);
        setLoading(false);
      });
  }, [pastEvents]);

  const handleTabChange = (tab: 'all' | 'photos' | 'videos') => {
    setActiveTab(tab);
  };

  const handleCardClick = (eventMedia: EventMedia, thumbnailMedia: MediaItem) => {
    if (thumbnailMedia.type === 'video') {
      setSelectedVideo(thumbnailMedia);
      setVideoModalOpen(true);
    } else {
      const photos = eventMedia.media.filter(item => item.type === 'photo');
      if (photos.length > 0) {
        setSelectedEventMedia(eventMedia);
        setGalleryOpen(true);
      }
    }
  };

  const handleGalleryClose = () => {
    setGalleryOpen(false);
    setSelectedEventMedia(null);
  };

  const handleVideoClose = () => {
    setVideoModalOpen(false);
    setSelectedVideo(null);
  };

  // Handle ESC key to close video modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && videoModalOpen) {
        handleVideoClose();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [videoModalOpen]);
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };


  return (
    <Layout>
      <SEO 
        title="Media Gallery - ZurichJS"
        description="Explore photos and videos from ZurichJS community events, workshops, and meetups. Browse our collection of memorable moments."
      />
      
      {/* Hero Section */}
      <Section variant="gradient" padding="lg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center text-white">
            <h1 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg">
              Media Gallery
            </h1>
            <h2 className="text-xl md:text-2xl mb-6 opacity-90 max-w-2xl mx-auto">
              Capturing Our JavaScript Journey
            </h2>
            <p className="text-base md:text-lg opacity-80 max-w-3xl mx-auto">
              Dive into our rich collection of photos and videos from meetups, workshops, and special events. Each image tells a story of learning, networking, and community building.
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
            <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-full px-4 sm:px-6 py-2 sm:py-3">
              <Camera className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span className="font-medium text-sm sm:text-base">{allMedia.filter(item => item.type === 'photo').length} Photos</span>
            </div>
            <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-full px-4 sm:px-6 py-2 sm:py-3">
              <Video className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span className="font-medium text-sm sm:text-base">{allMedia.filter(item => item.type === 'video').length} Videos</span>
            </div>
            <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-full px-4 sm:px-6 py-2 sm:py-3">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span className="font-medium text-sm sm:text-base">{eventMedias.length} Events</span>
            </div>
          </div>
        </motion.div>
      </Section>

      {/* Featured Images Section */}
      <Section variant="white" padding="md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-6 sm:mb-8">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Featured Images</h2>
          </div>
          
          {loading ? (
            // Loading skeleton for featured images
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <motion.div
                  key={`skeleton-${index}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="aspect-square overflow-hidden rounded-lg sm:rounded-xl shadow-lg"
                >
                  <div className="w-full h-full bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200 animate-pulse">
                    <div className="w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            // Actual featured images
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
              {featuredImages.map((image, index) => (
                <motion.div
                  key={`${image.eventId}-${index}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="group cursor-pointer touch-manipulation"
                >
                  <div className="relative aspect-square overflow-hidden rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <SafeImage
                      src={image.thumbnailUrl}
                      alt={`Photo from ${image.eventName}`}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                      fallbackSrc={image.url}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-white/90 backdrop-blur-sm rounded-full p-1.5 sm:p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <ImageIcon size={14} className="sm:w-4 sm:h-4 text-gray-700" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* Latest Video Section */}
      <Section variant="gray" padding="md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-6 sm:mb-8">
            <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Latest Video</h2>
          </div>
          
          {loading ? (
            // Loading skeleton for latest video
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-white rounded-xl sm:rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
                <div className="relative lg:col-span-2">
                  <div className="aspect-video sm:aspect-[4/5] lg:aspect-[9/16] xl:aspect-[4/5] 2xl:aspect-[9/16] bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200 animate-pulse">
                    <div className="w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                  </div>
                </div>
                <div className="lg:col-span-3 p-4 sm:p-6 lg:p-8">
                  <div className="animate-pulse">
                    <div className="bg-gray-200 rounded h-4 w-20 mb-4"></div>
                    <div className="bg-gray-200 rounded h-6 w-3/4 mb-3"></div>
                    <div className="bg-gray-200 rounded h-4 w-1/2 mb-4"></div>
                    <div className="bg-gray-200 rounded h-3 w-full mb-2"></div>
                    <div className="bg-gray-200 rounded h-3 w-2/3 mb-4"></div>
                    <div className="bg-gray-200 rounded h-8 w-1/3"></div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : latestVideo ? (
            // Actual latest video
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-white rounded-xl sm:rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
                <div className="relative lg:col-span-2">
                  <div className="aspect-video sm:aspect-[4/5] lg:aspect-[9/16] xl:aspect-[4/5] 2xl:aspect-[9/16]">
                    <VideoPlayer
                      src={latestVideo.media.url}
                      thumbnail={latestVideo.media.thumbnailUrl || latestVideo.media.url}
                      title={latestVideo.event.event?.title || 'Event Video'}
                      className="w-full h-full"
                    />
                    {latestVideo.media.duration && (
                      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-black/70 text-white px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium flex items-center gap-1">
                        <Clock size={12} className="sm:w-3.5 sm:h-3.5" />
                        <span>{formatDuration(latestVideo.media.duration)}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="lg:col-span-3 p-4 sm:p-6 lg:p-8 flex flex-col justify-center">
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="bg-red-100 text-red-800 px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium">
                      Latest
                    </span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium">
                      Video
                    </span>
                  </div>
                  
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 line-clamp-2">
                    {latestVideo.event.event?.title || 'Event Video'}
                  </h3>
                  
                  <div className="flex items-center text-gray-600 text-xs sm:text-sm mb-4">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span>{latestVideo.event.event?.datetime ? formatDate(latestVideo.event.event.datetime) : 'Date not available'}</span>
                  </div>
                  
                  <p className="text-sm sm:text-base text-gray-700 mb-4 sm:mb-6 line-clamp-3">
                    {latestVideo.event.event?.description || 'Watch highlights from this community event.'}
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      href={latestVideo.media.url}
                      target="_blank"
                      variant="primary"
                      className="flex-1 justify-center"
                      size="sm"
                    >
                      <Play size={14} className="mr-2" />
                      Open in New Tab
                    </Button>
                    <Button
                      onClick={() => {
                        const photos = latestVideo.event.media.filter(item => item.type === 'photo');
                        if (photos.length > 0) {
                          handleCardClick(latestVideo.event, photos[0]);
                        }
                      }}
                      variant="outline"
                      className="flex-1 justify-center"
                      size="sm"
                    >
                      <ImageIcon size={14} className="mr-2" />
                      View Gallery
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : null}
        </div>
      </Section>

      {/* Media Gallery */}
      <Section variant="white" padding="lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Event Gallery
            </h2>
            
            <div className="flex flex-wrap gap-2 md:gap-3 bg-gray-100 rounded-lg p-1">
              <button
                className={`flex-1 md:flex-none px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-md transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2 font-medium text-sm sm:text-base touch-manipulation ${
                  activeTab === 'all'
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
                onClick={() => handleTabChange('all')}
              >
                <span>All</span>
                <span className="text-xs bg-white/20 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full">
                  {allMedia.length}
                </span>
              </button>
              
              <button
                className={`flex-1 md:flex-none px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-md transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2 font-medium text-sm sm:text-base touch-manipulation ${
                  activeTab === 'photos'
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
                onClick={() => handleTabChange('photos')}
              >
                <Camera size={14} className="sm:w-4 sm:h-4" />
                <span>Photos</span>
                <span className="text-xs bg-white/20 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full">
                  {allMedia.filter(item => item.type === 'photo').length}
                </span>
              </button>
              
              <button
                className={`flex-1 md:flex-none px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-md transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2 font-medium text-sm sm:text-base touch-manipulation ${
                  activeTab === 'videos'
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
                onClick={() => handleTabChange('videos')}
              >
                <Video size={14} className="sm:w-4 sm:h-4" />
                <span>Videos</span>
                <span className="text-xs bg-white/20 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full">
                  {allMedia.filter(item => item.type === 'video').length}
                </span>
              </button>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-12 sm:py-16">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-sm sm:text-base text-gray-600">Loading media...</span>
            </div>
          )}

          {/* Media Grid */}
          {!loading && filteredMedia.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {filteredMedia.map((item, index) => {
                const photos = item.media.filter(media => media.type === 'photo');
                const videos = item.media.filter(media => media.type === 'video');
                const hasPhotos = photos.length > 0;
                const hasVideos = videos.length > 0;
                
                return (
                  <motion.div
                    key={item.folderId}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index % 3 * 0.1 }}
                    className="bg-white rounded-lg sm:rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 group cursor-pointer touch-manipulation"
                    onClick={() => {
                      const thumbnailMedia = getThumbnailMedia(item.media, activeTab);
                      if (thumbnailMedia) {
                        handleCardClick(item, thumbnailMedia);
                      }
                    }}
                  >
                    <div className="relative h-48 sm:h-56 w-full">
                      {(() => {
                        const thumbnailMedia = getThumbnailMedia(item.media, activeTab);
                        if (thumbnailMedia) {
                          return (
                            <SafeImage
                              src={thumbnailMedia.thumbnailUrl || thumbnailMedia.url}
                              alt={item.event?.title || "Event " + item.folderId}
                              fill
                              className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              fallbackSrc={thumbnailMedia.url}
                              isVideo={thumbnailMedia.type === 'video'}
                            />
                          );
                        } else {
                          // No photos available, show placeholder
                          return (
                            <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                              <div className="flex flex-col items-center justify-center text-white">
                                <Video className="w-10 h-10 sm:w-12 sm:h-12 mb-2" />
                                <span className="text-xs sm:text-sm font-medium">Video Only</span>
                              </div>
                            </div>
                          );
                        }
                      })()}
                      
                      {/* Overlay with type indicator */}
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                      
                      {/* Media count badges */}
                      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex flex-col gap-1 sm:gap-2">
                        {hasPhotos && (
                          <div className="bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 sm:px-3 sm:py-1 text-xs sm:text-sm font-medium text-gray-900 flex items-center gap-1">
                            <Camera size={12} className="sm:w-3.5 sm:h-3.5" />
                            <span>{photos.length}</span>
                          </div>
                        )}
                        {hasVideos && (
                          <div className="bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 sm:px-3 sm:py-1 text-xs sm:text-sm font-medium text-gray-900 flex items-center gap-1">
                            <Video size={12} className="sm:w-3.5 sm:h-3.5" />
                            <span>{videos.length}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Video duration for video items */}
                      {activeTab === 'videos' && item.media[0]?.type === 'video' && item.media[0]?.duration && (
                        <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 bg-black/70 text-white px-2 py-1 rounded text-xs sm:text-sm font-medium flex items-center gap-1">
                          <Clock size={10} className="sm:w-3 sm:h-3" />
                          <span>{formatDuration(item.media[0].duration)}</span>
                        </div>
                      )}
                      
                      {/* Click to view overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 sm:p-3 transform scale-90 group-hover:scale-100 transition-transform duration-300">
                          <Play size={20} className="sm:w-6 sm:h-6 text-gray-900 ml-0.5" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 sm:p-6">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                        {item.event?.title || `Event ${item.folderId}`}
                      </h3>
                      
                      <div className="flex items-center text-gray-600 text-xs sm:text-sm mb-3">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                        <span>{item.event?.datetime ? formatDate(item.event.datetime) : 'Date not available'}</span>
                      </div>
                      
                      <div className="flex items-center text-gray-600 text-xs sm:text-sm mb-4">
                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                        <span>{item.event?.location || 'Location not available'}</span>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        {hasPhotos && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              const firstPhoto = getFirstPhoto(item.media);
                              if (firstPhoto) {
                                handleCardClick(item, firstPhoto);
                              }
                            }}
                            variant="primary"
                            size="sm"
                            className="flex-1 justify-center"
                          >
                            <Camera size={12} className="sm:w-3.5 sm:h-3.5 mr-2" />
                            View Photos
                          </Button>
                        )}
                        {item.event?.meetupUrl && (
                          <Button
                            href={item.event.meetupUrl}
                            variant="outline"
                            size="sm"
                            className="flex-1 justify-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink size={12} className="sm:w-3.5 sm:h-3.5 mr-2" />
                            Event Details
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : !loading && filteredMedia.length === 0 ? (
            <div className="text-center py-12 sm:py-16">
              <div className="mb-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                  <Camera className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                No {activeTab === 'all' ? 'media' : activeTab} found
              </h3>
              <p className="text-sm sm:text-base text-gray-600">
                {activeTab === 'all' 
                  ? 'No media available at the moment.' 
                  : `No ${activeTab} available for the selected filter.`}
              </p>
            </div>
          ) : null}
        </div>
      </Section>
      {/* Image Gallery Modal */}
      {selectedEventMedia && (
        <ImageGallery
          isOpen={galleryOpen}
          onClose={handleGalleryClose}
          media={selectedEventMedia.media}
          eventTitle={selectedEventMedia.event?.title || "Event"}
        />
      )}

      {/* Video Modal */}
      {selectedVideo && (
        <div 
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${videoModalOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={handleVideoClose}
        >
          <div 
            className="relative w-full max-w-4xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleVideoClose}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <VideoPlayer
                src={selectedVideo.url}
                thumbnail={selectedVideo.thumbnailUrl || selectedVideo.url}
                title="Event Video"
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export async function getStaticProps() {
  const pastEvents = await getPastEvents();
  
  return {
    props: {
      pastEvents,
    },
  };
}