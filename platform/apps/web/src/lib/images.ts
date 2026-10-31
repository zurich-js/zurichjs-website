/**
 * Responsive sources for photos. Local photos ship as <name>.webp (≤1600px)
 * with <name>-480.webp and <name>-960.webp siblings; Sanity images use the CDN's ?w= resizing.
 */
const WIDTHS = [480, 960] as const;

export function srcsetFor(src: string): string | undefined {
  if (src.startsWith('https://cdn.sanity.io/')) return [480, 960, 1600].map((w) => `${src}?w=${w}&auto=format&fit=max ${w}w`).join(', ');
  const m = src.match(/^(\/images\/photos\/[\w-]+)\.webp$/);
  if (!m) return undefined;
  return [...WIDTHS.map((w) => `${m[1]}-${w}.webp ${w}w`), `${src} 1600w`].join(', ');
}

/** The default src: a mid-size variant, so browsers without srcset still get a sensible file. */
export function srcFor(src: string): string {
  if (src.startsWith('https://cdn.sanity.io/')) return `${src}?w=960&auto=format&fit=max`;
  const m = src.match(/^(\/images\/photos\/[\w-]+)\.webp$/);
  return m ? `${m[1]}-960.webp` : src;
}
