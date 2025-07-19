import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';
import Image from 'next/image';
import React, { useState, useRef, useEffect, useCallback } from 'react';

interface VideoPlayerProps {
  src: string;
  thumbnail?: string;
  title?: string;
  className?: string;
  autoplay?: boolean;
  muted?: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  src, 
  thumbnail, 
  title = "Video", 
  className = "",
  autoplay = false,
  muted = false
}) => {
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(muted ? 0 : 1);
  const [isMuted, setIsMuted] = useState(muted);
  const [showControls, setShowControls] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showThumbnail, setShowThumbnail] = useState(true);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const togglePlay = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      setShowThumbnail(false);
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !progressRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleLoadStart = () => {
    setIsLoading(true);
  };

  const handleCanPlay = () => {
    setIsLoading(false);
  };

  const handlePlayClick = () => {
    setShowThumbnail(false);
    togglePlay();
  };

  const handleThumbnailError = useCallback(() => {
    if (!thumbnailError) {
      setThumbnailError(true);
      setShowThumbnail(false);
    }
  }, [thumbnailError]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, []);

  // Reset thumbnail error state when thumbnail changes
  useEffect(() => {
    setThumbnailError(false);
    setShowThumbnail(!!thumbnail);
  }, [thumbnail]);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || '';
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
  }, []);

  // Handle autoplay initialization
  useEffect(() => {
    if (videoRef.current) {
      // Enable autoplay on mobile, use original autoplay setting for desktop
      const shouldAutoplay = isMobile || autoplay;
      
      if (shouldAutoplay) {
        videoRef.current.muted = true; // Must be muted for autoplay to work on mobile
        setShowThumbnail(false); // Hide thumbnail when autoplay starts
        setIsPlaying(true);
        videoRef.current.play().catch((error) => {
          console.log('Autoplay failed:', error);
          setIsPlaying(false);
          setShowThumbnail(true);
        });
      } else {
        setShowThumbnail(!!thumbnail); // Show thumbnail if not autoplaying
      }
    }
  }, [autoplay, muted, isMobile, thumbnail]);



  return (
    <div 
      ref={containerRef}
      className={`relative bg-black rounded-lg overflow-hidden group ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
            {/* Thumbnail overlay */}
      {showThumbnail && thumbnail && !thumbnailError && (
        <div className="absolute inset-0 cursor-pointer" onClick={handlePlayClick}>
          <Image
            src={thumbnail}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
            onError={handleThumbnailError}
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <button className="bg-white/90 hover:bg-white text-gray-900 rounded-full p-4 transition-all duration-200 hover:scale-110">
              <Play size={32} className="ml-1" />
            </button>
          </div>
        </div>
      )}

      {/* Video placeholder when no thumbnail */}
      {(showThumbnail && !thumbnail) || (showThumbnail && thumbnailError) ? (
        <div className="absolute inset-0 cursor-pointer bg-gray-900 flex items-center justify-center touch-manipulation" onClick={handlePlayClick}>
          <div className="flex flex-col items-center justify-center text-white">
            <Play size={40} className="sm:w-12 sm:h-12 mb-2 sm:mb-3" />
            <span className="text-base sm:text-lg font-medium">Play Video</span>
          </div>
        </div>
      ) : null}

      {/* Video element */}
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        preload="metadata"
        autoPlay={isMobile || autoplay}
        muted={isMobile || muted}
        playsInline
        controls={false}
        onClick={togglePlay}
      />

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
        </div>
      )}



      {/* Controls */}
      <div 
        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 z-20"
        style={{
          opacity: showControls || isPlaying ? 1 : 0.3,
          pointerEvents: 'auto'
        }}
      >
        {/* Progress bar */}
        <div 
          ref={progressRef}
          className="w-full h-1 bg-white/30 rounded-full cursor-pointer mb-3"
          onClick={handleProgressClick}
        >
          <div 
            className="h-full bg-white rounded-full transition-all duration-150"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={togglePlay}
              className="text-white hover:text-gray-300 transition-colors p-1 touch-manipulation"
            >
              {isPlaying ? <Pause size={18} className="sm:w-5 sm:h-5" /> : <Play size={18} className="sm:w-5 sm:h-5" />}
            </button>
            
            <button
              onClick={toggleMute}
              className="text-white hover:text-gray-300 transition-colors p-1 touch-manipulation"
            >
              {isMuted ? <VolumeX size={18} className="sm:w-5 sm:h-5" /> : <Volume2 size={18} className="sm:w-5 sm:h-5" />}
            </button>
            
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="w-12 sm:w-16 h-1 bg-white/30 rounded-full appearance-none cursor-pointer touch-manipulation"
            />
            
            <span className="text-white text-xs sm:text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="text-white hover:text-gray-300 transition-colors p-1 touch-manipulation"
          >
            <Maximize size={18} className="sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer; 