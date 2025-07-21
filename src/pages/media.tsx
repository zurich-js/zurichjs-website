import { motion } from 'framer-motion';
import { Camera, Video, Calendar, MapPin, ExternalLink, Play, Image as ImageIcon, Clock, Zap, TrendingUp, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useState, useEffect, useMemo } from 'react';

import Layout from '@/components/layout/Layout';
import Section from '@/components/Section';
import SEO from '@/components/SEO';
import AIFunMode from '@/components/ui/AIFunMode';
import Button from '@/components/ui/Button';
import ImageGallery from '@/components/ui/ImageGallery';
import VideoPlayer from '@/components/ui/VideoPlayer';
import { Event, getPastEvents } from "@/sanity/queries";

import { ImageKitFile } from '../types/gallery';
import { isVideoFile, generateOptimizedImage, generateSizes } from '../utils/thumbnailGenerator';

export type MediaProps = {
  pastEvents: Event[];
}

interface MediaItem {
  type: 'photo' | 'video';
  url: string;
  thumbnailUrl?: string;
  duration?: number;
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

const getFirstPhoto = (media: MediaItem[]) => media.find(item => item.type === 'photo') || null;
const getFirstVideo = (media: MediaItem[]) => media.find(item => item.type === 'video') || null;
const getThumbnailMedia = (media: MediaItem[]) => getFirstPhoto(media) || getFirstVideo(media);

// Optimized Image component with responsive loading and error handling
const OptimizedImage: React.FC<{
  src: string;
  alt: string;
  fill?: boolean;
  className?: string;
  sizes?: string;
  isVideo?: boolean;
  priority?: boolean;
  context?: 'gallery' | 'featured' | 'modal' | 'hero';
  lazy?: boolean;
  thumbnailUrl?: string;
}> = ({ src, alt, fill = true, className, sizes, isVideo, priority = false, context = 'gallery', lazy = false, thumbnailUrl }) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Use thumbnail URL if available, otherwise optimize the original URL
  const imageUrl = useMemo(() => {
    if (isVideo) return src;
    // Use thumbnail URL if provided, otherwise optimize the original URL
    return thumbnailUrl || generateOptimizedImage(src, context);
  }, [src, isVideo, context, thumbnailUrl]);

  // Handle loading state
  const handleLoad = () => {
    setIsLoading(false);
  };

  // Handle error state
  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // Show video placeholder for video files
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

  // Show error placeholder
  if (hasError) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className || ''}`}>
        <ImageIcon className="w-8 h-8 text-gray-400" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Loading placeholder */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
        </div>
      )}
      
      <Image
        src={imageUrl}
        alt={alt}
        fill={fill}
        className={`${className || ''} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        sizes={sizes || generateSizes()}
        priority={priority}
        onLoad={handleLoad}
        onError={handleError}
        loading={lazy ? 'lazy' : (priority ? 'eager' : 'lazy')}
        quality={85}
      />
      
      {/* Video play button overlay */}
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

function createEventMedias(pastEvents: Event[], filesByFolder: Record<string, ImageKitFile[]>): EventMedia[] {
  return Object.entries(filesByFolder).map(([folderId, files]) => {
    const event = pastEvents.find(event => event.id === folderId);
    const media: MediaItem[] = files.map((file: ImageKitFile) => ({
      type: isVideoFile(file.name) ? 'video' : 'photo',
      url: file.url,
      thumbnailUrl: file.thumbnailUrl,
      duration: isVideoFile(file.name) ? file.duration || 120 : undefined,
      createdAt: file.createdAt,
      width: file.width,
      height: file.height
    }));
    
    const sortedMedia = media.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    return { folderId, event: event || null, media: sortedMedia };
  }).filter(eventMedia => eventMedia.media.length > 0);
}

function getFeaturedImages(eventMedias: EventMedia[]): FeaturedImage[] {
  const featuredImages: FeaturedImage[] = [];
  
  const latestTwoEvents = [...eventMedias]
    .sort((a, b) => new Date(b.event?.datetime || 0).getTime() - new Date(a.event?.datetime || 0).getTime())
    .slice(0, 2);
  
  latestTwoEvents.forEach((eventMedia, eventIndex) => {
    const photos = eventMedia.media.filter(m => m.type === 'photo');
    
    if (photos.length > 0) {
      const remainingSlots = 9 - featuredImages.length;
      const maxPhotosFromEvent = eventIndex === 0 
        ? Math.min(7, photos.length, remainingSlots) 
        : Math.min(5, photos.length, remainingSlots);
      
      const selectedIndices: number[] = [];
      if (photos.length <= maxPhotosFromEvent) {
        selectedIndices.push(...photos.map((_, i) => i));
      } else {
        selectedIndices.push(0);
        if (photos.length >= 3) selectedIndices.push(Math.floor(photos.length / 4));
        if (photos.length >= 2) selectedIndices.push(Math.floor(photos.length / 3));
        if (photos.length >= 4) selectedIndices.push(Math.floor(photos.length / 2));
        if (photos.length >= 5) selectedIndices.push(Math.floor(photos.length * 2 / 3));
        if (photos.length >= 6) selectedIndices.push(photos.length - 1);
        
        while (selectedIndices.length < maxPhotosFromEvent && selectedIndices.length < photos.length) {
          const gap = Math.floor(photos.length / (selectedIndices.length + 1));
          const newIndex = selectedIndices.length * gap + Math.floor(gap / 2);
          if (newIndex < photos.length && !selectedIndices.includes(newIndex)) {
            selectedIndices.push(newIndex);
          } else {
            break;
          }
        }
      }
      
      const uniqueSelectedIndices = Array.from(new Set(selectedIndices));
      
      uniqueSelectedIndices.slice(0, maxPhotosFromEvent).forEach(photoIndex => {
        const photo = photos[photoIndex];
        if (photo && featuredImages.length < 10) {
          featuredImages.push({
            url: photo.url,
            thumbnailUrl: photo.thumbnailUrl || photo.url,
            eventName: eventMedia.event?.title || `Event ${eventMedia.folderId}`,
            eventDate: eventMedia.event?.datetime || '',
            eventId: eventMedia.folderId,
            aspectRatio: photo.width && photo.height ? photo.width / photo.height : undefined
          });
        }
      });
    }
  });
  
  return featuredImages.slice(0, 10);
}

function getLatestVideo(eventMedias: EventMedia[]): { media: MediaItem; event: EventMedia } | null {
  const sortedEvents = [...eventMedias].sort((a, b) => 
    new Date(b.event?.datetime || 0).getTime() - new Date(a.event?.datetime || 0).getTime()
  );
  
  for (const eventMedia of sortedEvents) {
    const videos = eventMedia.media.filter(m => m.type === 'video');
    if (videos.length > 0) {
      const sortedVideos = [...videos].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      return { media: sortedVideos[0], event: eventMedia };
    }
  }
  
  return null;
}

export default function Media({ pastEvents }: MediaProps) {
  const router = useRouter();
  const [eventMedias, setEventMedias] = useState<EventMedia[]>([]);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedEventMedia, setSelectedEventMedia] = useState<EventMedia | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<MediaItem | null>(null);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);
  const [aiFunModeOpen, setAiFunModeOpen] = useState(false);
  const [selectedImageForAI, setSelectedImageForAI] = useState<{ url: string; alt: string } | null>(null);
  const [aiFunModeActive, setAiFunModeActive] = useState(false);

  // Check if AI fun mode easter egg is unlocked via URL parameter
  const isAIFunModeUnlocked = router.query.ai === 'true';

  // Enable AI Fun Mode when easter egg is unlocked
  useEffect(() => {
    if (isAIFunModeUnlocked) {
      setAiFunModeActive(true);
    }
  }, [isAIFunModeUnlocked]);

  const allMedia = eventMedias.flatMap(eventMedia => eventMedia.media);
  const featuredImages = useMemo(() => getFeaturedImages(eventMedias), [eventMedias]);
  const latestVideo = useMemo(() => getLatestVideo(eventMedias), [eventMedias]);

  // Temporarily disable preloading to debug image loading issues

  useEffect(() => {
    fetch('/api/imagekit/list')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
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

  // Temporarily disable lazy loading to debug image loading issues

  const handleCardClick = (eventMedia: EventMedia, thumbnailMedia: MediaItem) => {
    if (thumbnailMedia.type === 'video') {
      setSelectedVideo(thumbnailMedia);
      setVideoModalOpen(true);
    } else {
      const photos = eventMedia.media.filter(item => item.type === 'photo');
      if (photos.length > 0) {
        const clickedPhotoIndex = photos.findIndex(photo => photo.url === thumbnailMedia.url);
        setSelectedEventMedia(eventMedia);
        setGalleryInitialIndex(clickedPhotoIndex >= 0 ? clickedPhotoIndex : 0);
        setGalleryOpen(true);
      }
    }
  };

  const handleGalleryClose = () => {
    setGalleryOpen(false);
    setSelectedEventMedia(null);
    setGalleryInitialIndex(0);
  };

  const handleVideoClose = () => {
    setVideoModalOpen(false);
    setSelectedVideo(null);
  };

  const handleAIFunModeOpen = (imageUrl: string, imageAlt: string) => {
    setSelectedImageForAI({ url: imageUrl, alt: imageAlt });
    setAiFunModeOpen(true);
  };

  const handleAIFunModeClose = () => {
    setAiFunModeOpen(false);
    setSelectedImageForAI(null);
  };

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && videoModalOpen) {
        handleVideoClose();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [videoModalOpen]);
  const formatDate = (dateString: string) => 
    new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

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
          <div className="text-center text-gray-900">
            <h1 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg">
              Media Gallery
            </h1>
            <h2 className="text-xl md:text-2xl mb-6 opacity-90 max-w-2xl mx-auto">
              Capturing Our JavaScript Journey
            </h2>
            <p className="text-base md:text-lg opacity-80 max-w-3xl mx-auto">
              Dive into our rich collection of photos and videos from meetups, workshops, and special events. Each image tells a story of learning, networking, and community building.
            </p>
            
            {isAIFunModeUnlocked && !aiFunModeActive && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mt-6"
              >
                <Button
                  onClick={() => setAiFunModeActive(true)}
                  variant="primary"
                  className="bg-blue-800 hover:bg-blue-900 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                  size="lg"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Enable AI Fun Mode
                </Button>
              </motion.div>
            )}
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8 mt-4">
            <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-full px-4 sm:px-6 py-2 sm:py-3">
              <Camera className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-gray-900" />
              <span className="font-medium text-sm sm:text-base text-gray-900">{allMedia.filter(item => item.type === 'photo').length} Photos</span>
            </div>
            <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-full px-4 sm:px-6 py-2 sm:py-3">
              <Video className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-gray-900" />
              <span className="font-medium text-sm sm:text-base text-gray-900">{allMedia.filter(item => item.type === 'video').length} Videos</span>
            </div>
            <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-full px-4 sm:px-6 py-2 sm:py-3">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-gray-900" />
              <span className="font-medium text-sm sm:text-base text-gray-900">{eventMedias.length} Events</span>
            </div>
            {aiFunModeActive && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center bg-blue-800/20 backdrop-blur-sm rounded-full px-4 sm:px-6 py-2 sm:py-3 border border-blue-800/30"
              >
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-800" />
                <span className="font-medium text-sm sm:text-base text-blue-800 mr-3">AI Fun Mode Active</span>
                <button
                  onClick={() => setAiFunModeActive(false)}
                  className="bg-blue-800 hover:bg-blue-900 text-white rounded-full px-3 py-1 text-xs font-medium transition-colors"
                >
                  Disable
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </Section>

      {/* Latest Video Section - Shows most recent video from most recent event */}
      <Section variant="white" padding="lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-8 sm:mb-12 justify-center">
            <div className="h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent flex-1 max-w-20"></div>
            <Zap className="w-8 h-8 text-blue-600" />
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center">Latest Video</h2>
            <Zap className="w-8 h-8 text-blue-600" />
            <div className="h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent flex-1 max-w-20"></div>
          </div>
          
          {loading ? (
            // Enhanced loading skeleton for latest video
                <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="bg-gradient-to-br from-white via-gray-50 to-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[400px]">
                <div className="relative lg:col-span-1">
                  <div className="h-full min-h-[400px] flex items-center justify-center">
                    <div className="relative w-full bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200 overflow-hidden rounded-2xl sm:rounded-3xl" style={{ aspectRatio: '9/16', maxHeight: '100%' }}>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-20 h-20 rounded-full bg-white/30 flex items-center justify-center">
                          <Play className="w-10 h-10 text-gray-400" />
                  </div>
            </div>
                    </div>
                  </div>
            </div>
                <div className="lg:col-span-2 p-6 sm:p-8 lg:p-10">
                  <div className="animate-pulse space-y-4">
                    <div className="flex gap-2">
                      <div className="bg-gradient-to-r from-red-200 to-red-300 rounded-full h-6 w-20"></div>
                      <div className="bg-gradient-to-r from-blue-200 to-blue-300 rounded-full h-6 w-16"></div>
        </div>
                    <div className="bg-gradient-to-r from-gray-200 to-gray-300 rounded h-8 w-4/5"></div>
                    <div className="bg-gradient-to-r from-gray-200 to-gray-300 rounded h-5 w-2/3"></div>
                    <div className="space-y-2">
                      <div className="bg-gradient-to-r from-gray-200 to-gray-300 rounded h-4 w-full"></div>
                      <div className="bg-gradient-to-r from-gray-200 to-gray-300 rounded h-4 w-3/4"></div>
          </div>
                    <div className="flex gap-3 pt-4">
                      <div className="bg-gradient-to-r from-blue-200 to-blue-300 rounded h-10 flex-1"></div>
                      <div className="bg-gradient-to-r from-gray-200 to-gray-300 rounded h-10 flex-1"></div>
                  </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : latestVideo ? (
            // Enhanced latest video display
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="bg-gradient-to-br from-white via-gray-50 to-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-gray-100 hover:shadow-3xl transition-all duration-500 group"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[400px]">
                <div className="relative lg:col-span-1 overflow-hidden">
                  <div className="h-full min-h-[400px] flex items-center justify-center">
                    <div className="relative w-full" style={{ aspectRatio: '9/16', maxHeight: '100%' }}>
                    <VideoPlayer
                      src={latestVideo.media.url}
                      thumbnail={latestVideo.media.thumbnailUrl || latestVideo.media.url}
                      title={latestVideo.event.event?.title || 'Event Video'}
                        className="w-full h-full rounded-2xl sm:rounded-3xl"
                        autoplay={true}
                        muted={true}
                    />
                    {latestVideo.media.duration && (
                        <div className="absolute top-4 right-4 bg-gradient-to-r from-black/80 to-black/60 text-white px-3 py-2 rounded-full text-sm font-semibold flex items-center gap-2 backdrop-blur-sm z-10">
                          <Clock size={14} />
                        <span>{formatDuration(latestVideo.media.duration)}</span>
                      </div>
                    )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl sm:rounded-3xl"></div>
                  </div>
                </div>
                </div>
                <div className="lg:col-span-2 p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
                  <div className="flex flex-wrap items-center gap-3 mb-6">
                    <motion.span 
                      whileHover={{ scale: 1.05 }}
                      className="bg-yellow-500 text-black px-3 py-2 sm:px-4 sm:py-2 rounded-full text-sm sm:text-base font-semibold shadow-lg"
                    >
                      🔥 Latest
                    </motion.span>
                    <motion.span 
                      whileHover={{ scale: 1.05 }}
                      className="bg-blue-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-full text-sm sm:text-base font-semibold shadow-lg"
                    >
                      🎥 Video
                    </motion.span>
                  </div>
                  
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-4 line-clamp-2 group-hover:text-zurich transition-colors duration-300">
                    {latestVideo.event.event?.title || 'Event Video'}
                  </h3>
                  
                  <div className="flex items-center text-gray-700 text-sm sm:text-base mb-4">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 text-zurich" />
                    <span className="font-medium">{latestVideo.event.event?.datetime ? formatDate(latestVideo.event.event.datetime) : 'Date not available'}</span>
                  </div>
                  
                  {latestVideo.event.event?.location && (
                    <div className="flex items-center text-gray-700 text-sm sm:text-base mb-6">
                      <MapPin className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 text-js-dark" />
                      <span className="font-medium">{latestVideo.event.event.location}</span>
                    </div>
                  )}
                  
                  <p className="text-sm sm:text-base lg:text-lg text-gray-700 mb-6 sm:mb-8 line-clamp-3 leading-relaxed">
                    {latestVideo.event.event?.description || 'Watch highlights from this amazing community event and see what you missed!'}
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <Button
                      href={latestVideo.media.url}
                      target="_blank"
                      variant="primary"
                      className="flex-1 justify-center group/btn hover:shadow-xl transition-all duration-300 bg-blue-600 hover:bg-blue-700 text-white"
                      size="md"
                    >
                      <Play size={18} className="mr-2 group-hover/btn:scale-110 transition-transform duration-200" />
                      Watch Full Screen
                    </Button>
                    <Button
                      onClick={() => {
                        const photos = latestVideo.event.media.filter(item => item.type === 'photo');
                        if (photos.length > 0) {
                          setSelectedEventMedia(latestVideo.event);
                          setGalleryInitialIndex(0);
                          setGalleryOpen(true);
                        }
                      }}
                      variant="outline"
                      className="flex-1 justify-center hover:shadow-lg transition-all duration-300 border-2 border-js bg-js text-black hover:border-js-darker hover:bg-js-darker hover:text-white"
                      size="md"
                    >
                      <ImageIcon size={18} className="mr-2" />
                      View Gallery
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-gray-500"
            >
              <Video className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg">No videos available yet</p>
            </motion.div>
          )}
        </div>
      </Section>

      {/* Featured Images Section */}
      <Section variant="gray" padding="sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                      <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 text-zurich" />
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Featured Photos from Our Latest Events</h2>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-js rounded-full animate-pulse"></div>
                <span>Latest captures</span>
              </div>
            </div>
          </div>
          
          {loading ? (
            // Compact loading skeleton for 9 images
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3 auto-rows-[120px] sm:auto-rows-[140px] lg:auto-rows-[150px]">
              {[
                // 9-image pattern with wide image 9
                'col-span-2 row-span-2', // 0: Hero (large)
                'col-span-2 row-span-2', // 1: Large (better height)
                'col-span-2 row-span-1', // 2: Medium 
                'col-span-2 row-span-1', // 3: Medium
                'col-span-2 row-span-1', // 4: Medium (below hero)
                'col-span-2 row-span-1', // 5: Medium (below large)
                'col-span-2 row-span-2', // 6: Large (more height)
                'col-span-2 row-span-1', // 7: Medium
                'col-span-3 row-span-1', // 8: Wide (image 9)
              ].map((classes, index) => (
                <motion.div
                  key={`skeleton-${index}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className={`${classes} relative`}
                >
                  <div className="relative w-full h-full overflow-hidden rounded-lg sm:rounded-xl shadow-md">
                    <div className="w-full h-full bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200 animate-pulse relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer"></div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            // Compact symmetrical grid for featured moments
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3 auto-rows-[120px] sm:auto-rows-[140px] lg:auto-rows-[150px]">
              {featuredImages.map((image, index) => {
                // Symmetrical pattern system for featured photos
                const aspectRatio = image.aspectRatio || 1;
                const isPortrait = aspectRatio < 0.75;
                const isLandscape = aspectRatio > 1.5;
                
                // Single 9-image pattern with wide image 9
                const nineImagePattern = [
                  { col: 2, row: 2 }, // 0: Hero (large)
                  { col: 2, row: 2 }, // 1: Large (better height)
                  { col: 2, row: 1 }, // 2: Medium 
                  { col: 2, row: 1 }, // 3: Medium
                  { col: 2, row: 1 }, // 4: Medium (below hero)
                  { col: 2, row: 1 }, // 5: Medium (below large)
                  { col: 2, row: 2 }, // 6: Large (more height)
                  { col: 2, row: 1 }, // 7: Medium
                  { col: 3, row: 1 }, // 8: Wide (image 9)
                ];
                
                // Use direct index since we only have 9 images total
                const baseLayout = nineImagePattern[index];
                
                let colSpan = baseLayout.col;
                let rowSpan = baseLayout.row;
                
                // Smart adjustments based on image aspect ratio
                if (isPortrait) {
                  if (baseLayout.col === 2 && baseLayout.row === 1) {
                    rowSpan = 2; // Make medium squares taller for portraits
                  } else if (baseLayout.col === 1 && baseLayout.row < 3) {
                    rowSpan = Math.max(2, baseLayout.row); // Ensure portrait photos get adequate height
                  }
                }
                // Landscape content adjustments
                else if (isLandscape) {
                  if (baseLayout.col === 2 && baseLayout.row >= 2) {
                    colSpan = 3; // Make large squares wider for landscapes
                    rowSpan = Math.max(1, baseLayout.row - 1); // Reduce height slightly for landscapes
                  } else if (baseLayout.col === 1) {
                    colSpan = 2; // Give more width to narrow landscape images
                  }
                }
                
                const gridClasses = `col-span-${colSpan} row-span-${rowSpan}`;
                return (
                  <motion.div
                    key={`${image.eventId}-${index}`}
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ 
                      duration: 0.5, 
                      delay: index * 0.08,
                      type: "spring",
                      stiffness: 100,
                      damping: 15
                    }}
                    className={`group cursor-pointer relative z-10 hover:z-20 ${gridClasses}`}
                    onClick={() => {
                      const eventMedia = eventMedias.find(em => em.folderId === image.eventId);
                      if (eventMedia) {
                        const photos = eventMedia.media.filter(item => item.type === 'photo');
                        if (photos.length > 0) {
                          const clickedPhotoIndex = photos.findIndex(photo => photo.url === image.url);
                          const initialIndex = clickedPhotoIndex >= 0 ? clickedPhotoIndex : 0;
                          
                          setSelectedEventMedia(eventMedia);
                          setGalleryInitialIndex(initialIndex);
                          setGalleryOpen(true);
                        }
                      }
                    }}
                  >
                    <div className="relative w-full h-full overflow-hidden rounded-lg sm:rounded-xl shadow-md hover:shadow-lg transition-all duration-500 group-hover:scale-[1.02] transform-gpu bg-gray-100">
                                              <OptimizedImage
                          src={image.url}
                          alt={`Photo from ${image.eventName}`}
                          fill
                          className="object-cover transition-all duration-700 group-hover:scale-110"
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                          context="featured"
                          lazy={false}
                          thumbnailUrl={image.thumbnailUrl}
                        />
                      
                      {/* Subtle overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      {/* Compact overlay content */}
                      <div className="absolute inset-0 flex flex-col justify-end p-2 sm:p-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0">
                        <div className="space-y-1">
                          <h4 className="text-white font-bold text-xs sm:text-sm line-clamp-2 drop-shadow-lg">
                            {image.eventName}
                          </h4>
                          <div className="flex items-center text-white/90 text-xs">
                            <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />
                            <span className="drop-shadow font-medium truncate">
                              {new Date(image.eventDate || 0).toLocaleDateString('en-GB', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* View indicator - smaller for tetris layout */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-75 group-hover:scale-100">
                        <div className="bg-white/95 backdrop-blur-sm rounded-full p-2 shadow-md">
                          <ImageIcon size={12} className="text-gray-900" />
                        </div>
                      </div>
                      
                                      {/* AI Fun Mode button */}
                {aiFunModeActive && (
                        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-75 group-hover:scale-100">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAIFunModeOpen(image.url, `Photo from ${image.eventName}`);
                            }}
                            className="bg-blue-800 hover:bg-blue-900 backdrop-blur-sm rounded-full p-2 shadow-md hover:scale-110 transition-transform duration-200"
                            title="Try AI Fun Mode"
                          >
                            <Sparkles size={12} className="text-white" />
                          </button>
                        </div>
                      )}
                      
                      {/* Shimmer effect */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-25 transition-opacity duration-500">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
                                              </div>
                      </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Community Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8 sm:mt-10 pt-6 sm:pt-8 border-t border-gray-200"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              <div className="text-center group">
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="bg-gradient-to-br from-zurich/10 to-zurich/20 rounded-2xl p-4 sm:p-6 mb-3 group-hover:shadow-lg transition-all duration-300"
                >
                  <Camera className="w-8 h-8 sm:w-10 sm:h-10 text-zurich mx-auto mb-2" />
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                  {allMedia.filter(item => item.type === 'photo').length}
                  </div>
                  <div className="text-sm sm:text-base text-gray-600 font-medium">
                    Photos Captured
                  </div>
                </motion.div>
              </div>
              
              <div className="text-center group">
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="bg-gradient-to-br from-js/20 to-js/30 rounded-2xl p-4 sm:p-6 mb-3 group-hover:shadow-lg transition-all duration-300"
                >
                  <Video className="w-8 h-8 sm:w-10 sm:h-10 text-js-darker mx-auto mb-2" />
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                  {allMedia.filter(item => item.type === 'video').length}
            </div>
                  <div className="text-sm sm:text-base text-gray-600 font-medium">
                    Videos Recorded
                  </div>
                </motion.div>
              </div>
              
              <div className="text-center group">
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="bg-gradient-to-br from-zurich/10 to-zurich/20 rounded-2xl p-4 sm:p-6 mb-3 group-hover:shadow-lg transition-all duration-300"
                >
                  <Calendar className="w-8 h-8 sm:w-10 sm:h-10 text-zurich mx-auto mb-2" />
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                    {eventMedias.length}
                  </div>
                  <div className="text-sm sm:text-base text-gray-600 font-medium">
                    Events Documented
                  </div>
                </motion.div>
              </div>
              
              <div className="text-center group">
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="bg-gradient-to-br from-js/20 to-js/30 rounded-2xl p-4 sm:p-6 mb-3 group-hover:shadow-lg transition-all duration-300"
                >
                  <TrendingUp className="w-8 h-8 sm:w-10 sm:h-10 text-js-darker mx-auto mb-2" />
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                    {Math.round(allMedia.length / Math.max(eventMedias.length, 1))}
                  </div>
                  <div className="text-sm sm:text-base text-gray-600 font-medium">
                    Avg per Event
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* Media Gallery */}
      <Section variant="white" padding="lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Event Gallery
            </h2>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="space-y-8">
              {/* Enhanced loading header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full animate-pulse"></div>
                  <div className="w-32 h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
                </div>
                <div className="w-24 h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
              </div>

              {/* Enhanced loading grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
                {Array.from({ length: 6 }).map((_, index) => (
                  <motion.div
                    key={`loading-${index}`}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="bg-gradient-to-br from-white via-gray-50/50 to-white rounded-2xl sm:rounded-3xl shadow-lg overflow-hidden border border-gray-100"
                  >
                    {/* Loading image area */}
                    <div className="relative h-64 sm:h-72 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200 animate-pulse overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer"></div>
                      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 space-y-2">
                        <div className="w-12 h-6 bg-gradient-to-r from-blue-200 to-blue-300 rounded-full"></div>
                        <div className="w-10 h-6 bg-gradient-to-r from-red-200 to-red-300 rounded-full"></div>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 bg-white/30 rounded-full flex items-center justify-center">
                          <div className="w-6 h-6 bg-gray-400 rounded-sm"></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Loading content */}
                    <div className="p-6 sm:p-8 space-y-4">
                      <div className="space-y-3">
                        <div className="w-4/5 h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
                        <div className="w-2/3 h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
                        <div className="w-1/2 h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
                      </div>
                      <div className="w-full h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
                      <div className="w-3/4 h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
                      <div className="bg-gray-100 rounded-xl p-3 sm:p-4">
                        <div className="w-24 h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse"></div>
                      </div>
                      <div className="flex gap-3 sm:gap-4 pt-2">
                        <div className="flex-1 h-10 bg-gradient-to-r from-blue-200 to-blue-300 rounded-lg animate-pulse"></div>
                        <div className="flex-1 h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse"></div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

                     {/* Event Gallery - Unified (sorted by most recent first) */}
           {!loading && eventMedias.length > 0 && (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
               {eventMedias
                 .sort((a, b) => {
                   const dateA = new Date(a.event?.datetime || 0).getTime();
                   const dateB = new Date(b.event?.datetime || 0).getTime();
                   return dateB - dateA; // Most recent first
                 })
                 .map((item, index) => {
                const photos = item.media.filter(media => media.type === 'photo');
                const videos = item.media.filter(media => media.type === 'video');
                const hasPhotos = photos.length > 0;
                const hasVideos = videos.length > 0;
                 const previewPhotos = photos.slice(0, 4);
                
                return (
                  <motion.div
                    key={item.folderId}
                     initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                     transition={{ duration: 0.6, delay: (index % 6) * 0.1 }}
                     className="bg-gradient-to-br from-white via-js/5 to-white rounded-2xl sm:rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 group overflow-hidden border border-js/20 hover:border-zurich/40 flex flex-col h-full"
                  >
                     <div 
                       className="relative h-64 sm:h-72 w-full overflow-hidden cursor-pointer"
                       onClick={() => {
                         const thumbnailMedia = getThumbnailMedia(item.media);
                         if (thumbnailMedia) {
                           handleCardClick(item, thumbnailMedia);
                         }
                       }}
                     >
                       {previewPhotos.length > 1 ? (
                         <div className="grid grid-cols-2 gap-1 h-full">
                           {previewPhotos.slice(0, 4).map((photo, photoIndex) => (
                             <div 
                               key={photoIndex} 
                               className={`relative overflow-hidden aspect-square ${
                                 previewPhotos.length === 3 && photoIndex === 0 ? 'row-span-2' : ''
                               }`}
                             >
                                                       <OptimizedImage
                          src={photo.url}
                          alt={`${item.event?.title || "Event"} - Photo ${photoIndex + 1}`}
                          fill
                          className="object-cover transition-all duration-700 group-hover:scale-110"
                          sizes="(max-width: 1024px) 50vw, 33vw"
                          context="gallery"
                          lazy={false}
                          thumbnailUrl={photo.thumbnailUrl}
                        />
                               {photoIndex === 3 && photos.length > 4 && (
                                 <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                   <span className="text-white font-bold text-lg">+{photos.length - 4}</span>
                                 </div>
                               )}
                             </div>
                           ))}
                         </div>
                       ) : (
                         (() => {
                           const thumbnailMedia = getThumbnailMedia(item.media);
                           return thumbnailMedia ? (
                                                                                 <OptimizedImage
                           src={thumbnailMedia.url}
                           alt={item.event?.title || "Event " + item.folderId}
                           fill
                           className="object-cover transition-all duration-700 group-hover:scale-110"
                           sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                           isVideo={thumbnailMedia.type === 'video'}
                           lazy={false}
                           thumbnailUrl={thumbnailMedia.thumbnailUrl}
                         />
                           ) : (
                             <div className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                              <div className="flex flex-col items-center justify-center text-white">
                                 <Video className="w-12 h-12 mb-3" />
                                 <span className="text-sm font-medium">Video Content</span>
                              </div>
                            </div>
                          );
                         })()
                       )}
                      
                       <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
                      
                       <div className="absolute top-4 left-4 sm:top-6 sm:left-6 flex flex-col gap-2 sm:gap-3">
                        {hasPhotos && (
                           <motion.div className="bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-bold text-gray-900 flex items-center gap-1.5 shadow-lg">
                             <Camera size={14} className="text-zurich" />
                            <span>{photos.length}</span>
                           </motion.div>
                        )}
                        {hasVideos && (
                           <motion.div className="bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-bold text-gray-900 flex items-center gap-1.5 shadow-lg">
                             <Video size={14} className="text-js-darker" />
                            <span>{videos.length}</span>
                           </motion.div>
                        )}
                        {aiFunModeActive && hasPhotos && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-blue-800 hover:bg-blue-900 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-bold text-white flex items-center gap-1.5 shadow-lg hover:scale-105 transition-transform duration-200 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              const firstPhoto = photos[0];
                              if (firstPhoto) {
                                handleAIFunModeOpen(firstPhoto.url, `${item.event?.title || "Event"} - Photo`);
                              }
                            }}
                            title="Try AI Fun Mode"
                          >
                            <Sparkles size={14} />
                            <span>AI</span>
                          </motion.div>
                        )}
                      </div>
                      
                       <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                         <motion.div className="bg-white/95 backdrop-blur-sm rounded-full p-4 sm:p-5 shadow-2xl transform scale-90 group-hover:scale-100 transition-all duration-500">
                           <Play size={24} className="text-gray-900 ml-0.5" />
                         </motion.div>
                      </div>
                    </div>
                    
                     <div className="p-6 sm:p-8 flex flex-col flex-grow">
                       <div className="space-y-4 sm:space-y-5 flex-grow">
                         <div>
                           <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-zurich transition-colors duration-300">
                          {item.event?.title || `Event ${item.folderId}`}
                        </h3>
                        
                           <div className="space-y-2 sm:space-y-3">
                             <div className="flex items-center text-gray-700 text-sm sm:text-base">
                               <Calendar className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 text-zurich flex-shrink-0" />
                               <span className="font-medium">{item.event?.datetime ? formatDate(item.event.datetime) : 'Date not available'}</span>
                        </div>
                             {item.event?.location && (
                               <div className="flex items-center text-gray-700 text-sm sm:text-base">
                                 <MapPin className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 text-js-dark flex-shrink-0" />
                                 <span className="font-medium truncate">{item.event.location}</span>
                               </div>
                             )}
                           </div>
                        </div>
                        
                         {item.event?.description && (
                           <p className="text-gray-600 text-sm sm:text-base line-clamp-2 leading-relaxed">
                             {item.event.description}
                           </p>
                         )}
                       </div>
                       
                       <div className="flex flex-col sm:flex-row gap-2 mt-auto pt-4">
                        {hasPhotos && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                               setSelectedEventMedia(item);
                               setGalleryInitialIndex(0);
                               setGalleryOpen(true);
                            }}
                            variant="primary"
                            size="sm"
                             className="flex-1 justify-center group/btn hover:shadow-lg transition-all duration-300 bg-yellow-500 hover:bg-yellow-600 text-black text-xs sm:text-sm"
                          >
                             <Camera size={14} className="mr-1.5 group-hover/btn:scale-110 transition-transform duration-200" />
                             Gallery ({photos.length})
                          </Button>
                        )}
                        <Button
                          href={`/events/${item.event?.id || item.folderId}`}
                          variant="outline"
                          size="sm"
                          className="flex-1 justify-center hover:shadow-lg transition-all duration-300 border-2 border-js bg-js text-black hover:bg-js-darker hover:border-js-darker hover:text-white text-xs sm:text-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={14} className="mr-1.5" />
                          Details
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
           )}

          {/* No events state */}
          {!loading && eventMedias.length === 0 && (
            <div className="text-center py-12 sm:py-16">
              <div className="mb-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                  <Camera className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                No media found
              </h3>
              <p className="text-sm sm:text-base text-gray-800">
                No media available at the moment.
              </p>
            </div>
          )}
        </div>
      </Section>

      {/* Image Gallery Modal */}
      {selectedEventMedia && (
        <ImageGallery
          isOpen={galleryOpen}
          onClose={handleGalleryClose}
          media={selectedEventMedia.media}
          eventTitle={selectedEventMedia.event?.title || "Event"}
          initialIndex={galleryInitialIndex}
                          onAIFunMode={aiFunModeActive ? handleAIFunModeOpen : undefined}
                isAIFunModeEnabled={aiFunModeActive}
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

      {/* AI Fun Mode Modal */}
      {selectedImageForAI && (
        <AIFunMode
          isOpen={aiFunModeOpen}
          onClose={handleAIFunModeClose}
          imageUrl={selectedImageForAI.url}
          imageAlt={selectedImageForAI.alt}
          eventTitle="ZurichJS Event"
        />
      )}
    </Layout>
  );
}

export async function getStaticProps() {
  return {
    props: {
      pastEvents: await getPastEvents(),
    },
  };
}