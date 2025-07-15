import { useState, useEffect, useMemo } from 'react';

import { generateThumbnail, ThumbnailSize } from '../utils/thumbnailGenerator';

interface UseResponsiveThumbnailProps {
  originalUrl: string;
  isVideo: boolean;
  fallbackUrl?: string;
}

interface ThumbnailBreakpoints {
  small: number;
  medium: number;
  large: number;
}

// Define breakpoints for different thumbnail sizes (in pixels)
const BREAKPOINTS: ThumbnailBreakpoints = {
  small: 640,   // Mobile
  medium: 1024, // Tablet
  large: 1920   // Desktop
};

/**
 * Custom hook for responsive thumbnail loading
 * Automatically selects the appropriate thumbnail size based on viewport and device pixel ratio
 */
export function useResponsiveThumbnail({ 
  originalUrl, 
  isVideo, 
  fallbackUrl 
}: UseResponsiveThumbnailProps) {
  const [windowWidth, setWindowWidth] = useState<number>(0);
  const [devicePixelRatio, setDevicePixelRatio] = useState<number>(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Update window width and pixel ratio on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      setWindowWidth(window.innerWidth);
      setDevicePixelRatio(window.devicePixelRatio || 1);
    };

    // Set initial values
    updateDimensions();

    // Listen for resize events
    window.addEventListener('resize', updateDimensions);
    
    // Listen for pixel ratio changes (e.g., when moving between different DPI screens)
    const mediaQuery = window.matchMedia('(resolution: 2dppx)');
    mediaQuery.addEventListener('change', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
      mediaQuery.removeEventListener('change', updateDimensions);
    };
  }, []);

  // Determine the optimal thumbnail size based on viewport and device pixel ratio
  const optimalThumbnailSize = useMemo((): ThumbnailSize => {
    if (windowWidth === 0) return 'medium'; // Default during SSR

    const effectiveWidth = windowWidth * devicePixelRatio;

    if (effectiveWidth <= BREAKPOINTS.small) {
      return 'small';
    } else if (effectiveWidth <= BREAKPOINTS.medium) {
      return 'medium';
    } else {
      return 'large';
    }
  }, [windowWidth, devicePixelRatio]);

  // Generate the appropriate thumbnail URL
  const thumbnailUrl = useMemo(() => {
    return generateThumbnail(originalUrl, isVideo, optimalThumbnailSize);
  }, [originalUrl, isVideo, optimalThumbnailSize]);

  // Generate all thumbnail sizes for responsive loading
  const thumbnailSizes = useMemo(() => {
    return {
      small: generateThumbnail(originalUrl, isVideo, 'small'),
      medium: generateThumbnail(originalUrl, isVideo, 'medium'),
      large: generateThumbnail(originalUrl, isVideo, 'large')
    };
  }, [originalUrl, isVideo]);

  // Generate srcSet for responsive images
  const srcSet = useMemo(() => {
    return [
      `${thumbnailSizes.small} 400w`,
      `${thumbnailSizes.medium} 800w`,
      `${thumbnailSizes.large} 1200w`
    ].join(', ');
  }, [thumbnailSizes]);

  // Generate sizes attribute for responsive images
  const sizes = useMemo(() => {
    return [
      `(max-width: ${BREAKPOINTS.small}px) 400px`,
      `(max-width: ${BREAKPOINTS.medium}px) 800px`,
      '1200px'
    ].join(', ');
  }, []);

  // Handle image loading states
  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    if (!imageError) {
      setImageError(true);
      setImageLoaded(false);
    }
  };

  // Reset loading states when URL changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [thumbnailUrl]);

  return {
    thumbnailUrl,
    thumbnailSizes,
    srcSet,
    sizes,
    optimalThumbnailSize,
    imageLoaded,
    imageError,
    handleImageLoad,
    handleImageError,
    fallbackUrl: fallbackUrl || originalUrl
  };
}

/**
 * Hook for getting thumbnail URL with specific size (without responsiveness)
 */
export function useThumbnail(originalUrl: string, isVideo: boolean, size: ThumbnailSize = 'medium') {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const thumbnailUrl = useMemo(() => {
    return generateThumbnail(originalUrl, isVideo, size);
  }, [originalUrl, isVideo, size]);

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    if (!imageError) {
      setImageError(true);
      setImageLoaded(false);
    }
  };

  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [thumbnailUrl]);

  return {
    thumbnailUrl,
    imageLoaded,
    imageError,
    handleImageLoad,
    handleImageError
  };
} 