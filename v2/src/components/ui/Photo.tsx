import Image from 'next/image';
import type { Photo as PhotoType } from '@/data/types';
import { cx } from '@/lib/cx';

interface Props {
  photo: PhotoType;
  className?: string;
  sizes?: string;
  priority?: boolean;
}

/** A cover-cropped photo with rounded corners. Fills its parent, so give the parent an aspect ratio. */
export function Photo({ photo, className, sizes = '(min-width: 800px) 50vw, 100vw', priority }: Props) {
  return (
    <span className={cx('relative block overflow-hidden rounded-card bg-grey', className)}>
      <Image src={photo.src} alt={photo.alt} fill sizes={sizes} priority={priority} className="object-cover" style={{ objectPosition: photo.position ?? 'center' }} />
    </span>
  );
}
