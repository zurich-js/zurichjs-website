/**
 * Packs items into a grid of square cells: a port of ZurichJS Conf's `useGridPacker`
 * (zurichjs-conf `src/hooks/useGridPacker.ts`, the packing used by its sponsor grid).
 *
 * The algorithm is the same: sort by priority, then by area (largest first); fill gaps column by
 * column inside the rows already used, and only then start a new row. Here it runs at build time
 * once per breakpoint, so the page ships CSS grid positions and no script.
 */

export interface PackItem {
  id: string;
  /** Size in cells for each breakpoint name (e.g. `base`, `md`); a missing breakpoint uses the next smaller one. */
  sizes: Record<string, { cols: number; rows: number }>;
  /** Lower comes first. */
  priority?: number;
}

export interface Placement {
  id: string;
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
}

/** Breakpoints from small to large; only these two exist in the design system (one breakpoint at 800px). */
export const PACK_BREAKPOINTS = ['base', 'md'] as const;
export type PackBreakpoint = (typeof PACK_BREAKPOINTS)[number];

function sizeAt(sizes: PackItem['sizes'], bp: PackBreakpoint) {
  for (let i = PACK_BREAKPOINTS.indexOf(bp); i >= 0; i--) {
    const s = sizes[PACK_BREAKPOINTS[i]!];
    if (s) return s;
  }
  return Object.values(sizes)[0] ?? { cols: 1, rows: 1 };
}

export function packItems(items: PackItem[], columns: number, bp: PackBreakpoint): Placement[] {
  const resolved = items
    .map((it, index) => {
      const s = sizeAt(it.sizes, bp);
      return { id: it.id, cols: Math.min(s.cols, columns), rows: s.rows, priority: it.priority ?? Infinity, area: s.cols * s.rows, index };
    })
    .sort((a, b) => (a.priority !== b.priority ? a.priority - b.priority : b.area - a.area || a.index - b.index));

  const grid: boolean[][] = [];
  let maxRow = -1;
  const ensureRows = (n: number) => {
    while (grid.length < n) grid.push(Array.from({ length: columns }, () => false));
  };
  const canPlace = (c: number, r: number, w: number, h: number) => {
    if (c + w > columns) return false;
    ensureRows(r + h);
    for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) if (grid[y]![x]) return false;
    return true;
  };
  const place = (c: number, r: number, w: number, h: number) => {
    ensureRows(r + h);
    for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) grid[y]![x] = true;
    maxRow = Math.max(maxRow, r + h - 1);
  };

  const placed: Placement[] = [];
  for (const it of resolved) {
    let done = false;
    // Fill gaps inside the rows already used, column by column, before starting a new row.
    const scanRows = maxRow + 1;
    for (let c = 0; c <= columns - it.cols && !done; c++)
      for (let r = 0; r < scanRows && !done; r++)
        if (canPlace(c, r, it.cols, it.rows)) {
          place(c, r, it.cols, it.rows);
          placed.push({ id: it.id, col: c + 1, row: r + 1, colSpan: it.cols, rowSpan: it.rows });
          done = true;
        }
    if (!done) {
      const nr = maxRow + 1;
      for (let c = 0; c <= columns - it.cols; c++)
        if (canPlace(c, nr, it.cols, it.rows)) {
          place(c, nr, it.cols, it.rows);
          placed.push({ id: it.id, col: c + 1, row: nr + 1, colSpan: it.cols, rowSpan: it.rows });
          break;
        }
    }
  }
  return placed;
}
