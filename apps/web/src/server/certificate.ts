/**
 * Certificate of membership (owner, 10th November 2026): one per paid term,
 * emailed to the member and downloadable from the portal, signed by Faris Aziz,
 * President of the Board. A4 landscape PDF with vector text (pdf-lib, Figtree).
 *
 * The signature image is not in the repository: it lives in the private Netlify
 * Blobs store `membership` under `signature.png` (pnpm membership:signature).
 * Without it the certificate shows the printed name and title only.
 */
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont } from 'pdf-lib';
import figtree400 from '../assets/fonts/figtree-400.ttf?inline';
import figtree700 from '../assets/fonts/figtree-700.ttf?inline';
import wordmarkPng from '../assets/certificate/wordmark.png?inline';
import { lastDay, longDate } from './dates.ts';

export interface CertificateData {
  number: string;
  /** The member, or the signatory for an organisation. */
  name: string;
  organisationName: string | null;
  levelName: string;
  /** YYYY-MM-DD; the term runs from periodStart up to the day before periodEnd. */
  periodStart: string;
  periodEnd: string;
  /** ISO timestamp. */
  issuedAt: string;
}

export interface CertificateAssets {
  regular: Uint8Array;
  bold: Uint8Array;
  wordmark: Uint8Array;
  /** Transparent PNG of the president's signature, or null. */
  signature: Uint8Array | null;
}

export const SIGNATORY = { name: 'Faris Aziz', title: 'President of the Board' } as const;
const ASSOCIATION = { name: 'Swiss JavaScript Group', address: 'Alderstrasse 30, 8008 Zurich', uid: 'CHE-255.581.547', bylaws: '23 May 2025' } as const;

const fromDataUrl = (s: string) => new Uint8Array(Buffer.from(s.slice(s.indexOf(',') + 1), 'base64'));

/** The bundled fonts and wordmark (inlined at build time, so they travel with the function). */
export const bundledAssets = (signature: Uint8Array | null = null): CertificateAssets => ({
  regular: fromDataUrl(figtree400),
  bold: fromDataUrl(figtree700),
  wordmark: fromDataUrl(wordmarkPng),
  signature,
});

const BLACK = rgb(0, 0, 0);
const GREY = rgb(0x5f / 255, 0x62 / 255, 0x6b / 255);

export async function renderCertificate(c: CertificateData, a: CertificateAssets): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`Certificate of membership ${c.number}`);
  doc.setAuthor(ASSOCIATION.name);
  doc.setSubject(`Membership of the ${ASSOCIATION.name}`);
  doc.setCreator('zurichjs.com');
  doc.setProducer('zurichjs.com');
  doc.setCreationDate(new Date(c.issuedAt));
  const regular = await doc.embedFont(a.regular, { subset: true });
  const bold = await doc.embedFont(a.bold, { subset: true });
  const page = doc.addPage([841.89, 595.28]);
  const { width, height } = page.getSize();
  const left = 72;
  const maxWidth = width - left * 2;

  const text = (s: string, x: number, y: number, size: number, font: PDFFont, color = BLACK) => page.drawText(s, { x, y, size, font, color });
  /** Shrinks text that would not fit (long names). */
  const fit = (s: string, size: number, font: PDFFont, max = maxWidth) => {
    let z = size;
    while (z > 12 && font.widthOfTextAtSize(s, z) > max) z -= 1;
    return z;
  };

  const logo = await doc.embedPng(a.wordmark);
  const logoW = 180;
  page.drawImage(logo, { x: left, y: height - 72 - (logoW * logo.height) / logo.width, width: logoW, height: (logoW * logo.height) / logo.width });

  let y = height - 168;
  text('Certificate of membership', left, y, 34, bold);
  y -= 50;
  text('This certifies that', left, y, 15, regular, GREY);
  y -= 40;
  const nameSize = fit(c.name, 30, bold);
  text(c.name, left, y, nameSize, bold);
  if (c.organisationName) {
    y -= 26;
    const org = `for ${c.organisationName}`;
    text(org, left, y, fit(org, 17, regular), regular);
  }
  y -= 36;
  text(`is a ${c.levelName} of the ${ASSOCIATION.name}, the association behind ZurichJS,`, left, y, 15, regular);
  y -= 22;
  text('for the term', left, y, 15, regular);
  y -= 34;
  text(`${longDate(c.periodStart)} to ${longDate(lastDay(c.periodEnd))}`, left, y, 22, bold);

  // Signature block, bottom right.
  const sigX = width - left - 240;
  const lineY = 128;
  if (a.signature) {
    const sig = await doc.embedPng(a.signature);
    // Fit inside 190 × 95 pt, keeping the signature's proportions.
    const scale = Math.min(190 / sig.width, 95 / sig.height);
    page.drawImage(sig, { x: sigX + 10, y: lineY + 4, width: sig.width * scale, height: sig.height * scale });
  }
  page.drawLine({ start: { x: sigX, y: lineY }, end: { x: sigX + 240, y: lineY }, thickness: 0.8, color: BLACK });
  text(SIGNATORY.name, sigX, lineY - 20, 14, bold);
  text(`${SIGNATORY.title}, ${ASSOCIATION.name}`, sigX, lineY - 38, 11, regular, GREY);

  // Reference, bottom left.
  text(`Certificate ${c.number}, issued ${longDate(c.issuedAt)}`, left, 110, 11, regular, GREY);
  text(`Membership under the association’s bylaws of ${ASSOCIATION.bylaws}.`, left, 94, 11, regular, GREY);
  text(`${ASSOCIATION.name}, ${ASSOCIATION.address}, ${ASSOCIATION.uid}`, left, 56, 10, regular, GREY);

  return doc.save({ useObjectStreams: true });
}
