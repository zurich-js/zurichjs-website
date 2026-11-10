import { readFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { bundledAssets, renderCertificate } from '../src/server/certificate.ts';
import { lastDay, longDate } from '../src/server/dates.ts';

const cert = {
  number: 'ZJS-2026-0001',
  name: 'Ada Lovelace',
  organisationName: null,
  levelName: 'Supporter',
  periodStart: '2026-11-10',
  periodEnd: '2027-11-10',
  issuedAt: '2026-11-10T10:00:00Z',
};

describe('certificate of membership', () => {
  it('states the term up to the day before the paid period ends', () => {
    expect(lastDay('2027-11-10')).toBe('2027-11-09');
    expect(lastDay('2027-03-01')).toBe('2027-02-28');
    expect(longDate('2026-11-10')).toBe('10 November 2026');
  });

  it('renders a one-page A4 landscape PDF, with and without the signature', async () => {
    for (const signature of [null, new Uint8Array(readFileSync(new URL('../src/assets/certificate/wordmark.png', import.meta.url)))]) {
      const bytes = await renderCertificate({ ...cert, organisationName: signature ? 'Acme AG' : null }, bundledAssets(signature));
      expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe('%PDF-');
      const doc = await PDFDocument.load(bytes);
      expect(doc.getPageCount()).toBe(1);
      expect(doc.getPage(0).getSize()).toEqual({ width: 841.89, height: 595.28 });
      expect(doc.getTitle()).toBe('Certificate of membership ZJS-2026-0001');
      expect(bytes.length).toBeLessThan(200_000);
    }
  });

  it('fits a very long name on the page', async () => {
    const bytes = await renderCertificate({ ...cert, name: 'Maximiliane Alexandra Theodora von Hohenberg-Schwarzenstein-Lichtenfeld' }, bundledAssets());
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });
});
