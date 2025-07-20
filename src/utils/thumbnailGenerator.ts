// Utility functions for generating ImageKit thumbnails with different sizes

export type ThumbnailSize = 'small' | 'medium' | 'large' | 'xl';

interface ThumbnailConfig {
  width: number;
  height: number;
  quality: number;
  format: string;
}

// Enhanced size configurations with WebP support and optimized parameters
const sizeConfigs: Record<ThumbnailSize, ThumbnailConfig> = {
  small: { width: 300, height: 300, quality: 75, format: 'webp' },    // For small thumbnails, navigation
  medium: { width: 600, height: 600, quality: 80, format: 'webp' },   // For main gallery grid
  large: { width: 900, height: 900, quality: 85, format: 'webp' },    // For modal previews
  xl: { width: 1200, height: 1200, quality: 90, format: 'webp' }      // For featured images
};

/**
 * Generate an optimized thumbnail URL for images with enhanced performance
 * @param imageUrl Original image URL
 * @param size Thumbnail size (small, medium, large, xl)
 * @returns Optimized thumbnail URL
 */
export function generateImageThumbnail(imageUrl: string, size: ThumbnailSize = 'medium'): string {
  if (!imageUrl.includes('ik.imagekit.io')) {
    return imageUrl;
  }

  try {
    const url = new URL(imageUrl);
    const pathname = url.pathname;
    
    // Properly encode the filename while preserving path structure
    const pathSegments = pathname.split('/').map(segment => {
      return segment ? encodeURIComponent(decodeURIComponent(segment)) : segment;
    });
    const encodedPath = pathSegments.join('/');
    const baseUrl = `${url.protocol}//${url.host}${encodedPath}`;
    
    const config = sizeConfigs[size];
    
    // Enhanced optimization parameters without cropping:
    // - f-webp: use WebP format for better compression
    // - q-{quality}: quality setting
    // - dpr-2: high DPI support
    // - pr-true: progressive loading
    // - fo-auto: automatic format optimization
    // No width/height constraints to prevent cropping
    return `${baseUrl}?tr=f-${config.format},q-${config.quality},dpr-2,pr-true,fo-auto`;
  } catch (error) {
    console.error('Error generating image thumbnail:', error);
    return imageUrl;
  }
}

/**
 * Generate an optimized thumbnail URL for videos
 * @param videoUrl Original video URL
 * @param size Thumbnail size (small, medium, large, xl)
 * @returns Optimized video thumbnail URL
 */
export function generateVideoThumbnail(videoUrl: string, size: ThumbnailSize = 'medium'): string {
  if (!videoUrl.includes('ik.imagekit.io')) {
    return videoUrl;
  }

  try {
    const url = new URL(videoUrl);
    const pathname = url.pathname;
    
    // Check if it's a video file
    const isVideo = /\.(mp4|mov|avi|mkv|webm|wmv|flv|m4v)$/i.test(pathname);
    
    if (isVideo) {
      // Properly encode the filename while preserving path structure
      const pathSegments = pathname.split('/').map(segment => {
        return segment ? encodeURIComponent(decodeURIComponent(segment)) : segment;
      });
      const encodedPath = pathSegments.join('/');
      const baseUrl = `${url.protocol}//${url.host}${encodedPath}`;
      
      const config = sizeConfigs[size];
      
      // Enhanced video thumbnail optimization without cropping:
      // - t-1: extract first frame
      // - f-jpg: JPEG format for video thumbnails
      // - fo-auto: automatic format optimization
      return `${baseUrl}?tr=f-jpg,t-1,q-${config.quality},dpr-2,pr-true,fo-auto`;
    }
  } catch (error) {
    console.error('Error generating video thumbnail:', error);
  }
  
  return videoUrl;
}

/**
 * Generate appropriate thumbnail based on media type
 * @param mediaUrl Original media URL
 * @param isVideo Whether the media is a video
 * @param size Thumbnail size (small, medium, large, xl)
 * @returns Optimized thumbnail URL
 */
export function generateThumbnail(mediaUrl: string, isVideo: boolean, size: ThumbnailSize = 'medium'): string {
  return isVideo 
    ? generateVideoThumbnail(mediaUrl, size)
    : generateImageThumbnail(mediaUrl, size);
}

/**
 * Get all thumbnail sizes for a given media URL
 * @param mediaUrl Original media URL
 * @param isVideo Whether the media is a video
 * @returns Object with all thumbnail sizes
 */
export function getAllThumbnailSizes(mediaUrl: string, isVideo: boolean) {
  return {
    small: generateThumbnail(mediaUrl, isVideo, 'small'),
    medium: generateThumbnail(mediaUrl, isVideo, 'medium'),
    large: generateThumbnail(mediaUrl, isVideo, 'large'),
    xl: generateThumbnail(mediaUrl, isVideo, 'xl')
  };
}

/**
 * Generate optimized image URL for different contexts
 * @param imageUrl Original image URL
 * @param context Context for optimization (gallery, featured, modal, etc.)
 * @returns Optimized image URL
 */
export function generateOptimizedImage(imageUrl: string, context: 'gallery' | 'featured' | 'modal' | 'hero' = 'gallery'): string {
  if (!imageUrl.includes('ik.imagekit.io')) {
    return imageUrl;
  }

  try {
    const url = new URL(imageUrl);
    const pathname = url.pathname;
    
    const pathSegments = pathname.split('/').map(segment => {
      return segment ? encodeURIComponent(decodeURIComponent(segment)) : segment;
    });
    const encodedPath = pathSegments.join('/');
    const baseUrl = `${url.protocol}//${url.host}${encodedPath}`;
    
    // Context-specific optimizations without cropping
    const optimizations = {
      gallery: 'f-webp,q-80,dpr-2,pr-true,fo-auto',
      featured: 'f-webp,q-85,dpr-2,pr-true,fo-auto',
      modal: 'f-webp,q-90,dpr-2,pr-true,fo-auto',
      hero: 'f-webp,q-85,dpr-2,pr-true,fo-auto'
    };
    
    return `${baseUrl}?tr=${optimizations[context]}`;
  } catch (error) {
    console.error('Error generating optimized image:', error);
    return imageUrl;
  }
}

/**
 * Generate srcSet for responsive images
 * @param imageUrl Original image URL
 * @param isVideo Whether the media is a video
 * @returns srcSet string for responsive images
 */
export function generateSrcSet(imageUrl: string, isVideo: boolean): string {
  const sizes = getAllThumbnailSizes(imageUrl, isVideo);
  return [
    `${sizes.small} 300w`,
    `${sizes.medium} 600w`,
    `${sizes.large} 900w`,
    `${sizes.xl} 1200w`
  ].join(', ');
}

/**
 * Generate sizes attribute for responsive images
 * @returns sizes string for responsive images
 */
export function generateSizes(): string {
  return [
    '(max-width: 640px) 300px',
    '(max-width: 768px) 600px',
    '(max-width: 1024px) 900px',
    '1200px'
  ].join(', ');
}

/**
 * Check if a URL is a video file
 * @param url URL to check
 * @returns True if the URL is a video file
 */
export function isVideoFile(url: string): boolean {
  const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv', 'flv', 'm4v'];
  const ext = url.toLowerCase().split('.').pop();
  return videoExtensions.includes(ext || '');
} 