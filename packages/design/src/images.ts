/**
 * Responsive sources for photos. Local photos ship as <name>.webp (≤1600px)
 * with <name>-480.webp and <name>-960.webp siblings; Sanity images use the CDN's ?w= resizing.
 */
const WIDTHS = [480, 960] as const;

const isImageKit = (src: string) => src.startsWith('https://ik.imagekit.io/');
const ik = (src: string, w: number) => `${src}${src.includes('?') ? '&' : '?'}tr=w-${w},q-80,f-auto`;

/** A resized URL for one width (ImageKit and Sanity CDNs; local files as they are). */
export function sizedSrc(src: string, w: number): string {
  if (isImageKit(src)) return ik(src, w);
  if (src.startsWith('https://cdn.sanity.io/')) return `${src}?w=${w}&auto=format&fit=max`;
  return srcFor(src);
}

/** First frame of an ImageKit video as a poster image. */
export const videoPoster = (src: string, w = 960) => (isImageKit(src) ? `${src.split('?')[0]}/ik-thumbnail.jpg?tr=w-${w}` : undefined);

export function srcsetFor(src: string): string | undefined {
  if (isImageKit(src)) return [480, 960, 1600].map((w) => `${ik(src, w)} ${w}w`).join(', ');
  if (src.startsWith('https://cdn.sanity.io/')) return [480, 960, 1600].map((w) => `${src}?w=${w}&auto=format&fit=max ${w}w`).join(', ');
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
