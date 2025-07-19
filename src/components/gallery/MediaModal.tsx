import { X, ChevronLeft, ChevronRight, Download, Share2, Camera, Video, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';

import { MediaItem, MediaType } from '../../types/gallery';
import { formatEventDate } from '../../utils/galleryFormatters';

interface MediaModalProps {
  media: MediaItem | null;
  allMedia: MediaItem[];
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
}

export default function MediaModal({ media, allMedia, onClose, onNavigate }: MediaModalProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    setImageLoaded(false);
  }, [media]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!media) return;
      
      switch (event.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          onNavigate('prev');
          break;
        case 'ArrowRight':
          onNavigate('next');
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [media, onClose, onNavigate]);

  if (!media) return null;

  const currentIndex = allMedia.findIndex(item => item.id === media.id);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === allMedia.length - 1;
  const isVideo = media.type === MediaType.VIDEO;
  const eventDate = new Date(media.eventDate);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = media.url;
    link.download = `${media.eventName}-${media.id}`;
    link.click();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: media.eventName,
          text: media.description,
          url: window.location.href
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback to copying URL
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center">
      <div className="w-full h-full flex flex-col lg:flex-row">
        {/* Close button */}
        <button
          onClick={onClose}
          className="modal-nav-button absolute top-4 right-4 z-20"
          aria-label="Close modal"
        >
          <X size={24} />
        </button>

        {/* Navigation buttons */}
        {!isFirst && (
          <button
            onClick={() => onNavigate('prev')}
            className="modal-nav-button absolute left-4 top-1/2 transform -translate-y-1/2 z-20"
            aria-label="Previous image"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {!isLast && (
          <button
            onClick={() => onNavigate('next')}
            className="modal-nav-button absolute right-4 top-1/2 transform -translate-y-1/2 z-20 lg:right-[25rem]"
            aria-label="Next image"
          >
            <ChevronRight size={24} />
          </button>
        )}

          {/* Media display */}
        <div className="flex-1 flex items-center justify-center relative min-h-0 p-4">
            {isVideo ? (
              <video
                src={media.url}
                controls
                autoPlay
              className="max-w-full max-h-full object-contain"
              onLoadStart={() => setImageLoaded(true)}
              />
            ) : (
            <div className="relative max-w-full max-h-full">
              <img
                src={media.url}
                alt={media.description}
                className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setImageLoaded(true)}
              />
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center text-white">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                </div>
              )}
            </div>
            )}
        </div>

          {/* Media info sidebar */}
        <div className="w-full lg:w-96 bg-white p-4 sm:p-6 overflow-y-auto max-h-96 lg:max-h-full">
            {/* Media type and actions */}
          <div className="flex justify-between items-center mb-4">
            <div className="filter-chip filter-chip-active">
              {isVideo ? <Video size={16} /> : <Camera size={16} />}
              <span>{isVideo ? 'Video' : 'Photo'}</span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleDownload}
                className="icon-button"
                aria-label="Download media"
              >
                <Download size={20} />
              </button>
              <button 
                onClick={handleShare}
                className="icon-button"
                aria-label="Share media"
              >
                <Share2 size={20} />
              </button>
            </div>
          </div>

            {/* Event info */}
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">
              {media.eventName}
          </h2>
            
          <div className="space-y-2 mb-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">Date:</span> {formatEventDate(eventDate)}
            </div>
            <div>
              <span className="font-medium">Photographer:</span> {media.photographer}
            </div>
            {isVideo && media.duration && (
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span className="font-medium">Duration:</span> {formatDuration(media.duration)}
              </div>
            )}
          </div>

          <div className="border-t pt-4 mb-4">
            <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
              {media.description}
            </p>
          </div>

            {/* Tags */}
            {media.tags.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Tags:</h3>
              <div className="flex flex-wrap gap-2">
                  {media.tags.map((tag) => (
                  <span
                      key={tag}
                    className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm font-medium"
                  >
                    {tag}
                  </span>
                  ))}
              </div>
            </div>
            )}

            {/* Navigation info */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center text-sm text-gray-500">
              <span>{currentIndex + 1} of {allMedia.length} items</span>
              <span className="text-xs">Use ← → keys to navigate</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}