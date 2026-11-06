/**
 * Responsive sources for photos. Local photos ship as <name>.webp (≤1600px)
 * with <name>-480.webp and <name>-960.webp siblings; Sanity images use the CDN's ?w= resizing.
 */
const WIDTHS = [480, 960] as const;

const isImageKit = (src: string) => src.startsWith('https://ik.imagekit.io/');
// f-auto also turns HEIC originals (phone photos in the archive) into a format browsers show.
const ik = (src: string, w: number) => `${src}${src.includes('?') ? '&' : '?'}tr=w-${w},q-80,f-auto`;

/** A resized URL for one width (ImageKit and Sanity CDNs; local files as they are). */
export function sizedSrc(src: string, w: number): string {
  if (isImageKit(src)) return ik(src, w);
  if (src.startsWith('https://cdn.sanity.io/')) return `${src}?w=${w}&auto=format&fit=max`;
  return srcFor(src);
}

/** A square crop around the face, for speaker avatars (CSS size × 2 for sharp screens). */
export function avatarSrc(src: string, px: number): string {
  const w = px * 2;
  if (isImageKit(src)) return `${src}${src.includes('?') ? '&' : '?'}tr=w-${w},h-${w},fo-face,q-80,f-auto`;
  if (src.startsWith('https://cdn.sanity.io/')) return `${src}?w=${w}&h=${w}&fit=crop&crop=focalpoint&fp-x=0.5&fp-y=0.35&auto=format`;
  const m = src.match(/^(\/images\/photos\/[\w-]+)\.webp$/);
  return m ? `${m[1]}-480.webp` : src;
}

export function srcsetFor(src: string): string | undefined {
  if (isImageKit(src)) return [480, 960, 1600, 2400].map((w) => `${ik(src, w)} ${w}w`).join(', ');
  if (src.startsWith('https://cdn.sanity.io/')) return [480, 960, 1600, 2400].map((w) => `${src}?w=${w}&auto=format&fit=max ${w}w`).join(', ');
  const m = src.match(/^(\/images\/photos\/[\w-]+)\.webp$/);
  if (!m) return undefined;
  return [...WIDTHS.map((w) => `${m[1]}-${w}.webp ${w}w`), `${src} 1600w`].join(', ');
}

/** The default src: a mid-size variant, so browsers without srcset still get a sensible file. */
export function srcFor(src: string): string {
  if (isImageKit(src)) return ik(src, 960);
  if (src.startsWith('https://cdn.sanity.io/')) return `${src}?w=960&auto=format&fit=max`;
  const m = src.match(/^(\/images\/photos\/[\w-]+)\.webp$/);
  return m ? `${m[1]}-960.webp` : src;
}
