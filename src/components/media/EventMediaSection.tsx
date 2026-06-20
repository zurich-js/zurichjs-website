import { Camera, Loader2, Video } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import ImageGallery from "@/components/ui/ImageGallery";
import type { EventMediaResponse, MediaAsset } from "@/types/media";
import { generateOptimizedImage } from "@/utils/thumbnailGenerator";

import MediaGrid from "./MediaGrid";
import VideoCard from "./VideoCard";

type EventMediaSectionProps = {
  eventId: string;
  eventTitle: string;
  isUpcoming: boolean;
};

export default function EventMediaSection({
  eventId,
  eventTitle,
  isUpcoming,
}: EventMediaSectionProps) {
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [summary, setSummary] = useState({ photoCount: 0, videoCount: 0 });
  const [nextSkip, setNextSkip] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const preloadedModalUrls = useRef(new Set<string>());
  const photos = useMemo(() => media.filter((asset) => asset.kind === "photo"), [media]);
  const videos = useMemo(() => media.filter((asset) => asset.kind === "video"), [media]);
  const galleryMedia = useMemo(
    () =>
      photos.map((photo) => ({
        type: "photo" as const,
        url: photo.url,
        thumbnailUrl: photo.thumbnailUrl || undefined,
      })),
    [photos],
  );

  useEffect(() => {
    if (isUpcoming) return;

    let isActive = true;

    async function loadInitialMedia() {
      setLoading(true);
      try {
        const response = await fetch(`/api/media/event/${eventId}?limit=24`);
        if (!response.ok) throw new Error(`Media request failed: ${response.status}`);

        const data = (await response.json()) as EventMediaResponse;
        if (!isActive) return;

        setMedia(data.items);
        setSummary({ photoCount: data.photoCount || 0, videoCount: data.videoCount || 0 });
        setNextSkip(data.nextSkip);
      } catch (error) {
        console.error("Error loading event media:", error);
      } finally {
        if (isActive) {
          setLoading(false);
          setLoaded(true);
        }
      }
    }

    loadInitialMedia();

    return () => {
      isActive = false;
    };
  }, [eventId, isUpcoming]);

  const loadMore = useCallback(async () => {
    if (nextSkip === null || loading) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/media/event/${eventId}?limit=24&skip=${nextSkip}&includeCounts=false`,
      );
      if (!response.ok) throw new Error(`Media request failed: ${response.status}`);

      const data = (await response.json()) as EventMediaResponse;
      setMedia((currentMedia) => [...currentMedia, ...data.items]);
      setNextSkip(data.nextSkip);
    } catch (error) {
      console.error("Error loading more event media:", error);
    } finally {
      setLoading(false);
    }
  }, [eventId, loading, nextSkip]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || nextSkip === null || loading || isUpcoming) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "600px 0px" },
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [isUpcoming, loadMore, loading, nextSkip]);

  useEffect(() => {
    if (!loaded || typeof window === "undefined") return;

    const pendingUrls = photos
      .map((photo) => generateOptimizedImage(photo.url, "modal"))
      .filter((url) => !preloadedModalUrls.current.has(url));

    if (pendingUrls.length === 0) return;

    let cancelled = false;
    let scheduledWork: { type: "idle"; id: number } | { type: "timeout"; id: number } | null = null;
    const batchSize = 4;

    const preloadBatch = (startIndex = 0) => {
      if (cancelled) return;

      pendingUrls.slice(startIndex, startIndex + batchSize).forEach((url) => {
        preloadedModalUrls.current.add(url);
        const image = new window.Image();
        image.decoding = "async";
        image.src = url;
      });

      const nextIndex = startIndex + batchSize;
      if (nextIndex >= pendingUrls.length) return;

      if (typeof window.requestIdleCallback === "function") {
        scheduledWork = {
          type: "idle",
          id: window.requestIdleCallback(() => preloadBatch(nextIndex), { timeout: 1200 }),
        };
      } else {
        scheduledWork = {
          type: "timeout",
          id: window.setTimeout(() => preloadBatch(nextIndex), 150),
        };
      }
    };

    preloadBatch();

    return () => {
      cancelled = true;
      if (scheduledWork === null) return;

      if (scheduledWork.type === "idle" && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(scheduledWork.id);
      } else {
        window.clearTimeout(scheduledWork.id);
      }
    };
  }, [loaded, photos]);

  if (isUpcoming || (loaded && media.length === 0)) return null;

  return (
    <section
      id="media"
      className="mb-10 scroll-mt-20 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Media</h2>
          <p className="mt-1 text-sm text-gray-600">Photos and videos from the event.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm font-semibold text-gray-700">
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1">
            <Camera size={15} />
            {summary.photoCount} photos
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1">
            <Video size={15} />
            {summary.videoCount} videos
          </span>
        </div>
      </div>

      {loading && !loaded ? (
        <div className="flex min-h-48 items-center justify-center text-gray-500">
          <Loader2 className="mr-2 animate-spin" size={20} />
          Loading media
        </div>
      ) : (
        <div className="space-y-8">
          {photos.length > 0 && (
            <MediaGrid
              photos={photos}
              onPhotoClick={(_photo, index) => {
                setGalleryIndex(index);
                setGalleryOpen(true);
              }}
            />
          )}

          {videos.length > 0 && (
            <div>
              <h3 className="mb-3 text-lg font-bold">Videos</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {videos.map((video) => (
                  <VideoCard key={video.id} video={video} title={video.name} allowInlinePlay />
                ))}
              </div>
            </div>
          )}

          <div
            ref={loadMoreRef}
            className="flex min-h-10 items-center justify-center text-gray-500"
          >
            {loading && loaded && (
              <>
                <Loader2 className="mr-2 animate-spin" size={18} />
                Loading more
              </>
            )}
          </div>
        </div>
      )}

      <ImageGallery
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        media={galleryMedia}
        eventTitle={eventTitle}
        initialIndex={galleryIndex}
      />
    </section>
  );
}
