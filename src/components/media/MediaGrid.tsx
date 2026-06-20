import { Camera } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { MediaAsset } from "@/types/media";

type MediaGridProps = {
  photos: MediaAsset[];
  getHref?: (photo: MediaAsset) => string;
  onPhotoClick?: (photo: MediaAsset, index: number) => void;
};

export default function MediaGrid({ photos, getHref, onPhotoClick }: MediaGridProps) {
  if (photos.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {photos.map((photo, index) => {
        const image = (
          <div className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-gray-100">
            {photo.thumbnailUrl ? (
              <Image
                src={photo.thumbnailUrl}
                alt={photo.name}
                fill
                className="object-cover transition duration-300 group-hover:scale-105"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                quality={75}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">
                <Camera size={28} />
              </div>
            )}
          </div>
        );

        if (onPhotoClick) {
          return (
            <button
              key={photo.id}
              type="button"
              className="block text-left"
              onClick={() => onPhotoClick(photo, index)}
            >
              {image}
            </button>
          );
        }

        if (!getHref) return <div key={photo.id}>{image}</div>;

        return (
          <Link key={photo.id} href={getHref(photo)} className="block">
            {image}
          </Link>
        );
      })}
    </div>
  );
}
