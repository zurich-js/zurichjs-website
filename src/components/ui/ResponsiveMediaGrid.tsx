import { motion } from 'framer-motion';
import { ImageIcon } from 'lucide-react';

interface FeaturedImage {
  url: string;
  thumbnailUrl: string;
  eventName: string;
  eventDate: string;
  eventId: string;
  aspectRatio?: number;
}

interface ResponsiveMediaGridProps {
  images: FeaturedImage[];
  onImageClick?: (image: FeaturedImage) => void;
  className?: string;
  itemClassName?: string;
  forceSquare?: boolean;
  loading?: boolean;
}

export default function ResponsiveMediaGrid({ 
  images, 
  onImageClick, 
  className = "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-6",
  itemClassName = "group cursor-pointer touch-manipulation",
  forceSquare = false,
  loading = false
}: ResponsiveMediaGridProps) {
  
  const SafeImage: React.FC<{
    src: string;
    alt: string;
    fill?: boolean;
    className?: string;
    sizes?: string;
    fallbackSrc?: string;
    aspectRatio?: number;
  }> = ({ src, alt, fill = true, className, sizes, fallbackSrc, aspectRatio }) => {
    const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      if (fallbackSrc && e.currentTarget.src !== fallbackSrc) {
        e.currentTarget.src = fallbackSrc;
      }
    };

    return (
      <img
        src={src}
        alt={alt}
        className={className}
        sizes={sizes}
        onError={handleError}
        style={fill ? undefined : { 
          width: '100%', 
          height: 'auto',
          aspectRatio: aspectRatio ? aspectRatio.toString() : undefined
        }}
      />
    );
  };

  if (loading) {
    return (
      <div className={className}>
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
    );
  }

  return (
    <div className={className}>
      {images.map((image, index) => (
        <motion.div
          key={`${image.eventId}-${index}`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: index * 0.1 }}
          className={itemClassName}
          onClick={() => onImageClick?.(image)}
        >
          <div className={`relative overflow-hidden rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 ${
            forceSquare ? 'aspect-square' : ''
          }`}>
            <SafeImage
              src={image.thumbnailUrl}
              alt={`Photo from ${image.eventName}`}
              fill={forceSquare}
              className={`${forceSquare ? 'w-full h-full' : 'w-full h-auto'} object-cover group-hover:scale-105 transition-transform duration-500`}
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
              fallbackSrc={image.url}
              aspectRatio={image.aspectRatio}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-white/90 backdrop-blur-sm rounded-full p-1.5 sm:p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <ImageIcon size={14} className="sm:w-4 sm:h-4 text-gray-700" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
} 