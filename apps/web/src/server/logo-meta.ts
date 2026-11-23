/**
 * What a logo wall needs to know about a logo file, read from its first bytes (no image library in
 * the functions): its ratio (width / height), so every logo gets the same visual weight, and whether
 * it is opaque (no transparency: a solid background the black filter has to threshold away).
 * Anything it cannot read answers null and false, and the logo then simply fits its cell.
 */
import type { LogoType } from './sponsor-logo.ts';

export interface LogoMeta {
  ratio: number | null;
  opaque: boolean;
}

const ratio = (w: number, h: number) => (w > 0 && h > 0 ? Math.round((w / h) * 1000) / 1000 : null);
const ascii = (b: Uint8Array, from: number, to: number) => String.fromCharCode(...b.subarray(from, to));

function png(b: Uint8Array): LogoMeta {
  if (b.length < 26) return { ratio: null, opaque: false };
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const colourType = b[25]!;
  // Transparency is an alpha channel (types 4 and 6) or a tRNS chunk before the image data.
  let transparent = colourType === 4 || colourType === 6;
  for (let at = 8; !transparent && at + 12 <= b.length;) {
    const type = ascii(b, at + 4, at + 8);
    if (type === 'tRNS') transparent = true;
    if (type === 'IDAT' || type === 'IEND') break;
    at += 12 + v.getUint32(at);
  }
  return { ratio: ratio(v.getUint32(16), v.getUint32(20)), opaque: !transparent };
}

function webp(b: Uint8Array): LogoMeta {
  if (b.length < 30) return { ratio: null, opaque: false };
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const format = ascii(b, 12, 16);
  if (format === 'VP8 ') return { ratio: ratio(v.getUint16(26, true) & 0x3fff, v.getUint16(28, true) & 0x3fff), opaque: true };
  if (format === 'VP8L') {
    const bits = v.getUint32(21, true);
    return { ratio: ratio((bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1), opaque: ((bits >>> 28) & 1) === 0 };
  }
  if (format === 'VP8X') {
    const u24 = (at: number) => b[at]! | (b[at + 1]! << 8) | (b[at + 2]! << 16);
    return { ratio: ratio(u24(24) + 1, u24(27) + 1), opaque: (b[20]! & 0x10) === 0 };
  }
  return { ratio: null, opaque: false };
}

function svg(b: Uint8Array): LogoMeta {
  const tag = /<svg\b[^>]*>/i.exec(new TextDecoder().decode(b.subarray(0, 4096)))?.[0] ?? '';
  const box = /\bviewBox\s*=\s*["']\s*[-\d.eE]+[\s,]+[-\d.eE]+[\s,]+([\d.eE]+)[\s,]+([\d.eE]+)/i.exec(tag);
  if (box) return { ratio: ratio(Number(box[1]), Number(box[2])), opaque: false };
  const size = (name: string) => Number(new RegExp(`\\s${name}\\s*=\\s*["']([\\d.]+)(px)?["']`, 'i').exec(tag)?.[1]);
  return { ratio: ratio(size('width'), size('height')), opaque: false };
}

export function logoMeta(bytes: Uint8Array, type: LogoType): LogoMeta {
  try {
    return type === 'image/png' ? png(bytes) : type === 'image/webp' ? webp(bytes) : svg(bytes);
  } catch {
    return { ratio: null, opaque: false };
  }
}
