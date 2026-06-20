import { motion } from "framer-motion";
import { Calendar, Camera, Loader2, Video } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import Layout from "@/components/layout/Layout";
import MediaCollectionCard from "@/components/media/MediaCollectionCard";
import MediaGrid from "@/components/media/MediaGrid";
import Section from "@/components/Section";
import SEO from "@/components/SEO";
import ImageGallery from "@/components/ui/ImageGallery";
import type { MediaAsset, MediaOverviewResponse } from "@/types/media";
import { generateOptimizedImage } from "@/utils/thumbnailGenerator";

function getEmptyOverview(): MediaOverviewResponse {
  return {
    summary: {
      photoCount: 0,
      videoCount: 0,
      collectionCount: 0,
    },
    recentPhotos: [],
    collections: [],
  };
}

export default function Media() {
  const [overview, setOverview] = useState<MediaOverviewResponse>(getEmptyOverview);
  const [loading, setLoading] = useState(true);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  useEffect(() => {
    let isActive = true;

    async function loadOverview() {
      try {
        const response = await fetch("/api/media/overview");
        if (!response.ok) throw new Error(`Media overview failed: ${response.status}`);

        const data = (await response.json()) as MediaOverviewResponse;
        if (isActive) setOverview(data);
      } catch (error) {
        console.error("Error loading media overview:", error);
      } finally {
        if (isActive) setLoading(false);
      }
    }

    loadOverview();

    return () => {
      isActive = false;
    };
  }, []);

  const previewPhotos = useMemo(() => overview.recentPhotos.slice(0, 8), [overview.recentPhotos]);
  const previewCollections = overview.collections;

  const selectedPhoto = previewPhotos[galleryIndex];
  const selectedPhotoCollection = selectedPhoto
    ? overview.collections.find((collection) => collection.eventId === selectedPhoto.eventId)
    : null;
  const galleryMedia = useMemo(
    () =>
      previewPhotos.map((photo) => ({
        type: "photo" as const,
        url: photo.url,
        thumbnailUrl: photo.thumbnailUrl || undefined,
        eventId: photo.eventId,
      })),
    [previewPhotos],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    previewPhotos.slice(0, 4).forEach((photo) => {
      const image = new window.Image();
      image.src = generateOptimizedImage(photo.url, "modal");
    });
  }, [previewPhotos]);

  function openGallery(_photo: MediaAsset, index: number) {
    setGalleryIndex(index);
    setGalleryOpen(true);
  }

  return (
    <Layout>
      <SEO
        title="Media - ZurichJS"
        description="Photos and videos from ZurichJS meetups, workshops, and community gatherings."
      />

      <Section variant="gradient" padding="lg">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="max-w-4xl"
        >
          <p className="mb-3 text-sm font-bold uppercase tracking-wide text-black/70">
            Capturing our JS community
          </p>
          <h1 className="text-4xl font-bold text-gray-950 md:text-6xl">Media gallery</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-gray-800 md:text-lg">
            Dive into the stories of learning, networking, and community building told through
            photos and videos from meetups, workshops, and special events.
          </p>
        </motion.div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-white/65 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Camera size={18} />
              Photos
            </div>
            <p className="mt-2 text-3xl font-bold">{overview.summary.photoCount}</p>
          </div>
          <div className="rounded-lg bg-white/65 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Video size={18} />
              Videos
            </div>
            <p className="mt-2 text-3xl font-bold">{overview.summary.videoCount}</p>
          </div>
          <div className="rounded-lg bg-white/65 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Calendar size={18} />
              Events
            </div>
            <p className="mt-2 text-3xl font-bold">{overview.summary.collectionCount}</p>
          </div>
        </div>
      </Section>

      <Section variant="white" padding="lg">
        {loading ? (
          <div className="flex min-h-72 items-center justify-center text-gray-500">
            <Loader2 className="mr-2 animate-spin" size={22} />
            Loading media
          </div>
        ) : (
          <div className="space-y-14">
            {previewPhotos.length > 0 && (
              <section>
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Latest Photos</h2>
                    <p className="mt-1 text-sm text-gray-600">
                      Faces, talks, venues, and the bits in between.
                    </p>
                  </div>
                </div>
                <MediaGrid photos={previewPhotos} onPhotoClick={openGallery} />
              </section>
            )}

            {previewCollections.length > 0 && (
              <section>
                <div className="mb-5">
                  <h2 className="text-2xl font-bold text-gray-900">Event Collections</h2>
                </div>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {previewCollections.map((collection) => (
                    <MediaCollectionCard key={collection.eventId} collection={collection} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </Section>

      <ImageGallery
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        media={galleryMedia}
        eventTitle={selectedPhotoCollection?.eventTitle || "ZurichJS"}
        initialIndex={galleryIndex}
        viewAllHref={(photo) => (photo.eventId ? `/events/${photo.eventId}#media` : undefined)}
        viewAllLabel="See all event photos"
      />
    </Layout>
  );
}
