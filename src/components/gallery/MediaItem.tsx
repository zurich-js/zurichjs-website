import { motion } from 'framer-motion';
import { Camera, Video, Clock } from 'lucide-react';

import { useResponsiveThumbnail } from '../../hooks/useResponsiveThumbnail';
import { MediaItem as MediaItemType, MediaType } from '../../types/gallery';
import { formatEventDate } from '../../utils/galleryFormatters';
import VideoPlayer from '../ui/VideoPlayer';

interface MediaItemProps {
  media: MediaItemType;
  onClick: (media: MediaItemType) => void;
}

export default function MediaItem({ media, onClick }: MediaItemProps) {
  const isVideo = media.type === MediaType.VIDEO;
  const eventDate = new Date(media.eventDate);

  // Use responsive thumbnail hook for optimal image loading
  const {
    thumbnailUrl,
    srcSet,
    sizes,
    imageLoaded,
    imageError,
    handleImageLoad,
    handleImageError,
  } = useResponsiveThumbnail({
    originalUrl: media.url,
    isVideo,
    fallbackUrl: media.thumbnailUrl
  });

  const handleClick = () => {
    onClick(media);
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="break-inside-avoid mb-4"
    >
      <div 
        className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
        onClick={handleClick}
      >
        <div className="relative">
          {/* Video Player for videos, Image for photos */}
          {isVideo ? (
            <div className="relative">
              <VideoPlayer
                src={media.url}
                thumbnail={thumbnailUrl}
                title={media.eventName}
                className="w-full h-auto"
              />
              {/* Video duration overlay */}
              {media.duration && (
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                  <Clock size={12} />
                  <span>{formatDuration(media.duration)}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="relative">
              <img
                src={thumbnailUrl}
                srcSet={srcSet}
                sizes={sizes}
                alt={media.description}
                width={800}
                height={600}
                loading="lazy"
                onLoad={handleImageLoad}
                onError={handleImageError}
                className={`w-full h-auto object-cover transition-opacity duration-300 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                style={{
                  aspectRatio: `${media.width}/${media.height}`,
                }}
              />
              
              {/* Loading placeholder for images */}
              {!imageLoaded && !imageError && (
                <div
                  className="absolute inset-0 bg-gray-200 flex items-center justify-center"
                  style={{
                    aspectRatio: `${media.width}/${media.height}`,
                  }}
                >
                  <div className="text-center text-gray-500">
                    <Camera size={40} />
                    <p className="text-xs mt-2">Loading...</p>
                  </div>
                </div>
              )}

              {/* Error placeholder for images */}
              {imageError && (
                <div
                  className="absolute inset-0 bg-gray-100 flex items-center justify-center"
                  style={{
                    aspectRatio: `${media.width}/${media.height}`,
                  }}
                >
                  <div className="text-center text-gray-500">
                    <Camera size={40} />
                    <p className="text-xs mt-2">Failed to load</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Media type indicator */}
          <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
            {isVideo ? <Video size={12} /> : <Camera size={12} />}
            <span className="hidden sm:inline">{isVideo ? 'Video' : 'Photo'}</span>
          </div>
        </div>

        {/* Media info */}
        <div className="p-3 sm:p-4">
          <h3 className="font-semibold text-gray-900 truncate mb-1 text-sm sm:text-base">
            {media.eventName}
          </h3>
          <p className="text-xs text-gray-500 mb-2">
            {formatEventDate(eventDate)} &nbsp;•&nbsp; {media.photographer}
          </p>
          <p className="text-sm text-gray-800 line-clamp-2 leading-tight">
            {media.description}
          </p>
          
          {/* Tags */}
          {media.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {media.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-block bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs font-medium"
                >
                  {tag}
                </span>
              ))}
              {media.tags.length > 3 && (
                <span className="inline-block bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs font-medium">
                  +{media.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}