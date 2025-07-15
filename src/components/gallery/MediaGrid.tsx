import { useEffect, useRef, useCallback } from 'react';

import { MediaItem as MediaItemType } from '../../types/gallery';
import { formatMediaCount } from '../../utils/galleryFormatters';

import MediaItem from './MediaItem';

interface MediaGridProps {
  media: MediaItemType[];
  loading: boolean;
  hasMore: boolean;
  totalCount: number;
  onLoadMore: () => void;
  onMediaClick: (media: MediaItemType) => void;
}

export default function MediaGrid({ 
  media, 
  loading, 
  hasMore, 
  totalCount,
  onLoadMore, 
  onMediaClick 
}: MediaGridProps) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const lastMediaElementRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        onLoadMore();
      }
    });
    
    if (node) observerRef.current.observe(node);
  }, [loading, hasMore, onLoadMore]);

  if (media.length === 0 && !loading) {
    return (
      <div className="text-center py-16 text-gray-500">
        <div className="mb-4">
          <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2">No media found</h3>
        <p className="text-sm">Try adjusting your filters or search terms</p>
      </div>
    );
  }

  return (
    <div>
      {/* Results count */}
      <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <p className="text-sm text-gray-600">
          {loading && media.length === 0 ? (
            <div className="bg-gray-200 rounded h-4 w-48 animate-pulse"></div>
          ) : (
            `Showing ${media.length} of ${formatMediaCount(totalCount)} items`
          )}
        </p>
        {loading && media.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            Loading more...
          </div>
        )}
      </div>

      {/* Masonry Grid */}
      <div className="masonry-grid columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
        {loading && media.length === 0 ? (
          // Loading skeleton grid
          Array.from({ length: 12 }).map((_, index) => (
            <div key={`skeleton-${index}`} className="break-inside-avoid mb-4">
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200 animate-pulse" style={{ height: `${200 + (index % 3) * 50}px` }}>
                  <div className="w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                </div>
                <div className="p-3 sm:p-4">
                  <div className="bg-gray-200 rounded h-4 w-3/4 mb-2 animate-pulse"></div>
                  <div className="bg-gray-200 rounded h-3 w-1/2 mb-2 animate-pulse"></div>
                  <div className="bg-gray-200 rounded h-3 w-full mb-1 animate-pulse"></div>
                  <div className="bg-gray-200 rounded h-3 w-2/3 animate-pulse"></div>
                </div>
              </div>
            </div>
          ))
        ) : (
          // Actual media items
          media.map((item, index) => {
            const isLast = index === media.length - 1;
            return (
              <div
                key={item.id}
                ref={isLast ? lastMediaElementRef : undefined}
                className="break-inside-avoid mb-4"
              >
                <MediaItem
                  media={item}
                  onClick={onMediaClick}
                />
              </div>
            );
          })
        )}
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Loading...</span>
        </div>
      )}

      {/* Load more button (fallback for infinite scroll) */}
      {!loading && hasMore && (
        <div className="flex justify-center pt-8">
          <button
            onClick={onLoadMore}
            className="btn-outline px-6 py-3 text-base font-medium"
          >
            Load More
          </button>
        </div>
      )}

      {/* End of results */}
      {!loading && !hasMore && media.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="mb-2">
            <svg className="w-8 h-8 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm">You've reached the end of the gallery</p>
        </div>
      )}

      <div ref={loadMoreRef} />
    </div>
  );
}