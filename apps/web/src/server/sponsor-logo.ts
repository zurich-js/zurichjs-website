/**
 * Files kept with a sponsorship, in the private Netlify Blobs store `sponsors` (never public;
 * the site streams them to the sponsor's contacts and the board):
 *
 *   logos       uploaded on the sponsorship page (SVG, PNG or WebP, up to 2 MB)
 *   contracts   a contract signed outside the site, attached by the board (PDF, up to 10 MB)
 *
 * Files are recognised by their content, not the name or the browser's type. SVGs are checked
 * strictly, because the board puts them on the public site as partner logos (partner-admin.ts): no scripts, animation, embedded or external content (in attributes or CSS),
 * namespaced elements, event handlers or doctypes, after decoding character references. Styles
 * and internal references (`url(#gradient)`, `<use href="#shape">`) are fine. Anything unusual is refused
 * with a request for a plain SVG or a PNG. Files are only ever served with a sandboxing CSP.
 */
import { getStore } from '@netlify/blobs';

export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
export const MAX_CONTRACT_BYTES = 10 * 1024 * 1024;

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

/** Character references decoded (&#106; &#x6a; and the usual named ones), so checks see what a parser sees. */
const decode = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);?/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);?/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&(colon|tab|newline|lpar|rpar|sol);/gi, (_, n: string) => ({ colon: ':', tab: '\t', newline: '\n', lpar: '(', rpar: ')', sol: '/' })[n.toLowerCase()]!);

/** Elements a logo never needs and that can run, load or hide things. */
const FORBIDDEN_ELEMENTS =
  /<\s*(script|foreignObject|iframe|embed|object|image|feImage|animate|animateMotion|animateTransform|set|handler|listener|a|audio|video|canvas|link|meta|base)\b/i;

/** Why an SVG is refused, or null when it is a plain drawing. */
export function svgProblem(raw: string): string | null {
  const svg = decode(raw.replace(/<!--[\s\S]*?-->/g, ''));
  if (/<!DOCTYPE|<!ENTITY|<!\[CDATA\[|<\?xml-stylesheet/i.test(svg)) return 'doctype';
  if (/<\s*[a-z_][\w.-]*:[\w.-]+/i.test(svg)) return 'namespaced element';
  if (FORBIDDEN_ELEMENTS.test(svg)) return 'scripts, animation or embedded content';
  if (/[\s/"']on[a-z]+\s*=/i.test(svg)) return 'event handlers';
  if (/javascript:|vbscript:|data:|@import|expression\s*\(/i.test(svg)) return 'scripts or embedded data';
  if (/url\(\s*["']?\s*(?!#)/i.test(svg)) return 'external references';
  // CSS can load a file without a literal url(: an escaped one (\75 rl), image-set("…") or an escaped
  // @import. A logo needs none of it, so CSS with an escape, image-set or an @import is refused.
  const css = [...svg.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>|\bstyle\s*=\s*("[^"]*"|'[^']*')/gi)].map((m) => m[1] ?? m[2] ?? '').join('\n');
  if (/\\|image-set\s*\(|@\s*(import|font-face)/i.test(css)) return 'escaped or external CSS';
  if (/(?:xlink:)?href\s*=\s*["']?\s*(?!#)[^"'\s>]/i.test(svg)) return 'links to other files';
  return null;
}

/** What the bytes are, or why they are refused. */
export function checkLogo(bytes: Uint8Array): { ok: true; type: LogoType } | { ok: false; error: string } {
  if (bytes.length === 0) return { ok: false, error: 'The file is empty.' };
  if (bytes.length > MAX_LOGO_BYTES) return { ok: false, error: 'Keep the logo under 2 MB.' };
  const head = (n: number) => [...bytes.subarray(0, n)];
  if (head(8).join() === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].join()) return { ok: true, type: 'image/png' };
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return { ok: true, type: 'image/webp' };
  if ((bytes[0] === 0xfe && bytes[1] === 0xff) || (bytes[0] === 0xff && bytes[1] === 0xfe)) return { ok: false, error: 'Save the SVG as UTF-8, or upload a PNG.' };
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes).replace(/^﻿/, '');
  if (/^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(text)) {
    const problem = svgProblem(text);
    if (problem) return { ok: false, error: `This SVG contains ${problem}. Export a plain SVG (for example "SVG 1.1, presentation attributes"), or upload a PNG.` };
    return { ok: true, type: 'image/svg+xml' };
  }
  return { ok: false, error: 'Upload the logo as SVG, PNG or WebP.' };
}

/** A PDF, by its signature. */
export function checkContract(bytes: Uint8Array): { ok: true } | { ok: false; error: string } {
  if (bytes.length === 0) return { ok: false, error: 'The file is empty.' };
  if (bytes.length > MAX_CONTRACT_BYTES) return { ok: false, error: 'Keep the contract under 10 MB.' };
  if (String.fromCharCode(...bytes.subarray(0, 5)) !== '%PDF-') return { ok: false, error: 'Upload the signed contract as a PDF.' };
  return { ok: true };
}

/** Headers for sending a stored file: never run as a page, even if opened directly. */
export const fileHeaders = (type: string, filename: string, disposition: 'inline' | 'attachment' = 'inline') => ({
  'content-type': type,
  'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  'x-content-type-options': 'nosniff',
  'cache-control': 'private, no-store',
  'content-disposition': `${disposition}; filename="${filename.replace(/[^\w.-]/g, '_')}"`,
});
