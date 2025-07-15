// Utility functions for generating ImageKit thumbnails with different sizes

export type ThumbnailSize = 'small' | 'medium' | 'large';

interface ThumbnailConfig {
  width: number;
  height: number;
  quality: number;
}

// Size configurations for different use cases (max dimensions)
const sizeConfigs: Record<ThumbnailSize, ThumbnailConfig> = {
  small: { width: 400, height: 400, quality: 80 },   // For small thumbnails, navigation
  medium: { width: 800, height: 800, quality: 85 },  // For main gallery grid
  large: { width: 1200, height: 1200, quality: 90 }   // For modal previews, featured images
};

/**
 * Generate an optimized thumbnail URL for images
 * @param imageUrl Original image URL
 * @param size Thumbnail size (small, medium, large)
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
    
    // Generate optimized thumbnail that maintains aspect ratio within max bounds
    return `${baseUrl}?tr=w-${config.width},h-${config.height},c-at_max,f-auto,q-${config.quality},dpr-2,pr-true`;
  } catch (error) {
    console.error('Error generating image thumbnail:', error);
    return imageUrl;
  }
}

/**
 * Generate an optimized thumbnail URL for videos
 * @param videoUrl Original video URL
 * @param size Thumbnail size (small, medium, large)
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
      
      // Generate optimized video thumbnail that maintains aspect ratio within max bounds
      return `${baseUrl}?tr=w-${config.width},h-${config.height},c-at_max,f-jpg,t-1,q-${config.quality},dpr-2,pr-true`;
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
 * @param size Thumbnail size (small, medium, large)
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
    large: generateThumbnail(mediaUrl, isVideo, 'large')
  };
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