/**
 * Sponsor logos: uploaded in the portal, reviewed by the board, stored in the private
 * Netlify Blobs store `sponsors` (never public; the admin area streams them).
 *
 * Accepted: SVG, PNG or WebP up to 2 MB, recognised by their content, not the name or
 * the browser's type. SVGs are refused if they carry scripts, event handlers, external
 * references or embedded HTML, and are only ever served with a sandboxing CSP.
 */
import { getStore } from '@netlify/blobs';

export const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export type LogoType = 'image/svg+xml' | 'image/png' | 'image/webp';

export interface LogoStore {
  set(key: string, data: ArrayBuffer): Promise<void>;
  get(key: string): Promise<ArrayBuffer | null>;
}

export const blobLogos = (): LogoStore => {
  const store = getStore('sponsors');
  return {
    set: async (key, data) => void (await store.set(key, data)),
    get: (key) => store.get(key, { type: 'arrayBuffer' }),
  };
};

const EXT: Record<LogoType, string> = { 'image/svg+xml': 'svg', 'image/png': 'png', 'image/webp': 'webp' };
export const logoExtension = (t: LogoType) => EXT[t];

/** What the bytes are, or why they are refused. */
export function checkLogo(bytes: Uint8Array): { ok: true; type: LogoType } | { ok: false; error: string } {
  if (bytes.length === 0) return { ok: false, error: 'The file is empty.' };
  if (bytes.length > MAX_LOGO_BYTES) return { ok: false, error: 'Keep the logo under 2 MB.' };
  const head = (n: number) => [...bytes.subarray(0, n)];
  if (head(8).join() === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].join()) return { ok: true, type: 'image/png' };
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return { ok: true, type: 'image/webp' };
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes).replace(/^﻿/, '');
  if (/^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/i.test(text)) {
    if (/<script|<foreignObject|<iframe|<embed|<object|\son[a-z]+\s*=|javascript:|<!ENTITY/i.test(text))
      return { ok: false, error: 'This SVG contains scripts or embedded content. Export a plain SVG, or upload a PNG.' };
    if (/(?:xlink:)?href\s*=\s*["']\s*(?!#|data:image\/)/i.test(text)) return { ok: false, error: 'This SVG links to other files. Embed everything in the SVG, or upload a PNG.' };
    return { ok: true, type: 'image/svg+xml' };
  }
  return { ok: false, error: 'Upload the logo as SVG, PNG or WebP.' };
}

/** Headers for sending a stored logo: never run as a page, even if opened directly. */
export const logoHeaders = (type: string, filename: string) => ({
  'content-type': type,
  'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  'x-content-type-options': 'nosniff',
  'cache-control': 'private, no-store',
  'content-disposition': `inline; filename="${filename.replace(/[^\w.-]/g, '_')}"`,
});
