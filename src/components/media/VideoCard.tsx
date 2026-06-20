import { ExternalLink, Play, Video } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import type { MediaAsset } from "@/types/media";

type VideoCardProps = {
  video: MediaAsset;
  title: string;
  href?: string;
  allowInlinePlay?: boolean;
};

export default function VideoCard({ video, title, href, allowInlinePlay = false }: VideoCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const poster = video.thumbnailUrl || undefined;

  if (allowInlinePlay && isPlaying) {
    return (
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-black shadow-sm">
        <video
          src={video.url}
          poster={poster}
          controls
          preload="none"
          className="aspect-video w-full object-contain"
        />
      </div>
    );
  }

  const content = (
    <div className="group overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-video bg-gray-900">
        {poster ? (
          <Image
            src={poster}
            alt={title}
            fill
            className="object-cover opacity-90 transition group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
            quality={75}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-white">
            <Video size={36} />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-lg transition group-hover:scale-105">
            <Play size={22} className="ml-0.5" />
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">{title}</p>
          <p className="text-xs text-gray-500">Video</p>
        </div>
        {href && <ExternalLink size={16} className="flex-shrink-0 text-gray-400" />}
      </div>
    </div>
  );

  if (allowInlinePlay) {
    return (
      <button type="button" className="block w-full text-left" onClick={() => setIsPlaying(true)}>
        {content}
      </button>
    );
  }

  if (href) {
    return (
      <a href={href} className="block">
        {content}
      </a>
    );
  }

  return content;
}
