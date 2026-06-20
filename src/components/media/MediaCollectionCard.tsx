import { Calendar, Camera, Video } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { MediaCollection } from "@/types/media";

type MediaCollectionCardProps = {
  collection: MediaCollection;
};

function formatDate(date: string) {
  if (!date) return "Date unavailable";

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export default function MediaCollectionCard({ collection }: MediaCollectionCardProps) {
  return (
    <Link
      href={collection.eventHref}
      className="group grid overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] bg-gray-100">
        {collection.cover?.thumbnailUrl ? (
          <Image
            src={collection.cover.thumbnailUrl}
            alt={collection.eventTitle}
            fill
            className="object-cover transition duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 25vw"
            quality={75}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            <Camera size={36} />
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="line-clamp-2 text-base font-bold text-gray-900 group-hover:text-zurich">
          {collection.eventTitle}
        </h3>
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
          <Calendar size={15} />
          <span>{formatDate(collection.eventDate)}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-gray-700">
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1">
            <Camera size={14} />
            {collection.photoCount}
          </span>
          {collection.videoCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1">
              <Video size={14} />
              {collection.videoCount}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
