/**
 * Sizes a logo to about the same visual weight as its neighbours: equal area, capped in height, so a
 * square mark and a long wordmark read as the same size. `ratio` is width / height.
 */
export function logoSize(ratio: number | undefined, area = 3600, maxH = 46): { w: number; h: number } | undefined {
  if (!ratio || !Number.isFinite(ratio) || ratio <= 0) return undefined;
  const h = Math.min(maxH, Math.sqrt(area / ratio));
  return { w: Math.round(h * ratio), h: Math.round(h) };
}

/** Links to partners keep the referrer only for sponsors who asked to see referrals. */
export const partnerRel = (p: { allowReferrer?: boolean }) => (p.allowReferrer ? 'noopener' : 'noopener noreferrer');
