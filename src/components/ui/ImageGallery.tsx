import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Download, Share2, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';

import { generateOptimizedImage, generateSizes } from '../../utils/thumbnailGenerator';

interface ImageGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  media: Array<{
    type: 'photo' | 'video';
    url: string;
    thumbnailUrl?: string;
    duration?: number;
  }>;
  eventTitle: string;
  initialIndex?: number;
  onAIFunMode?: (imageUrl: string, imageAlt: string) => void;
  isAIFunModeEnabled?: boolean;
}

export default function ImageGallery({ 
  isOpen, 
  onClose, 
  media, 
  eventTitle, 
  initialIndex = 0,
  onAIFunMode,
  isAIFunModeEnabled = false
}: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLoading, setIsLoading] = useState(true);

  // Filter only photos for the gallery
  const photos = media.filter(item => item.type === 'photo');

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  // Scroll to thumbnail when current index changes
  useEffect(() => {
    if (isOpen && photos.length > 1) {
      scrollToThumbnail(currentIndex);
    }
  }, [currentIndex, isOpen, photos.length]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isOpen) return;

    switch (event.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowLeft':
        goToPrevious();
        break;
      case 'ArrowRight':
        goToNext();
        break;
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const goToPrevious = () => {
    const newIndex = currentIndex === 0 ? photos.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
    scrollToThumbnail(newIndex);
  };

  const goToNext = () => {
    const newIndex = currentIndex === photos.length - 1 ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
    scrollToThumbnail(newIndex);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
  };

  const handleDownload = () => {
    const photo = photos[currentIndex];
    if (photo) {
      const link = document.createElement('a');
      link.href = photo.url;
      link.download = `${eventTitle}-photo-${currentIndex + 1}.jpg`;
      link.click();
    }
  };

  const handleShare = async () => {
    const photo = photos[currentIndex];
    if (photo && navigator.share) {
      try {
        await navigator.share({
          title: `${eventTitle} - Photo ${currentIndex + 1}`,
          url: photo.url,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(photo?.url || '');
    }
  };

  const scrollToThumbnail = (index: number) => {
    const thumbnailElement = document.getElementById(`thumbnail-${index}`);
    if (thumbnailElement) {
      thumbnailElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  };

  if (!isOpen || photos.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 text-white hover:text-gray-300 transition-colors"
      >
        <X size={24} />
      </button>

      {/* Navigation buttons */}
      {photos.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 text-white hover:text-gray-300 transition-colors"
          >
            <ChevronLeft size={32} />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 text-white hover:text-gray-300 transition-colors"
          >
            <ChevronRight size={32} />
          </button>
        </>
      )}

      {/* Top controls */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-4">
        <div className="text-white text-sm">
          {currentIndex + 1} / {photos.length}
        </div>
        
        {isAIFunModeEnabled && onAIFunMode && (
          <button
            onClick={() => onAIFunMode(photos[currentIndex].url, `${eventTitle} - Photo ${currentIndex + 1}`)}
            className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 backdrop-blur-sm rounded-full text-white hover:from-purple-600 hover:to-pink-600 transition-colors"
            title="Try AI Fun Mode"
          >
            <Sparkles size={20} />
          </button>
        )}
      </div>

      {/* Action buttons */}
      <div className="absolute bottom-4 right-4 z-10 flex gap-2">
        <button
          onClick={handleDownload}
          className="p-2 bg-white/10 backdrop-blur-sm rounded-full text-white hover:bg-white/20 transition-colors"
        >
          <Download size={20} />
        </button>
        <button
          onClick={handleShare}
          className="p-2 bg-white/10 backdrop-blur-sm rounded-full text-white hover:bg-white/20 transition-colors"
        >
          <Share2 size={20} />
        </button>
      </div>

      {/* Main image area */}
      <div className="relative flex items-center justify-center h-full pb-40">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="relative max-w-full max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800 rounded-lg">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
              </div>
            )}
            <Image
              src={generateOptimizedImage(photos[currentIndex].url, 'modal')}
              alt={`${eventTitle} - Photo ${currentIndex + 1}`}
              width={1200}
              height={800}
              className="max-w-full max-h-[calc(100vh-240px)] object-contain rounded-lg"
              sizes={generateSizes()}
              onLoad={handleImageLoad}
              onError={handleImageError}
              priority
              quality={90}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Horizontal scrollable thumbnail strip */}
      {photos.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4">
          <div className="bg-black/30 backdrop-blur-sm rounded-lg p-2">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
              {photos.map((photo, index) => (
                <button
                  key={index}
                  id={`thumbnail-${index}`}
                  onClick={() => setCurrentIndex(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-all hover:scale-105 ${
                    index === currentIndex
                      ? 'border-white scale-110'
                      : 'border-transparent hover:border-white/50'
                  }`}
                >
                  <Image
                    src={generateOptimizedImage(photo.url, 'gallery')}
                    alt={`Thumbnail ${index + 1}`}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                    sizes="64px"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}


    </div>
  );
} 