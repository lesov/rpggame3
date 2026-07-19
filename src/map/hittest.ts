/**
 * Point -> cell lookup: uniform spatial bins over cell bounding boxes, then
 * exact point-in-polygon; falls back to the nearest cell center among
 * candidates so clicks on polygon seams still resolve.
 */

export interface HitCell {
  i: number;
  p: [number, number];
  poly: [number, number][];
}

export function pointInPolygon(x: number, y: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export class CellIndex {
  private bins: Int32Array[];
  private cols: number;
  private rows: number;

  constructor(
    private cells: HitCell[],
    private binSize = 32,
    width = 2560,
    height = 1305,
  ) {
    this.cols = Math.ceil(width / binSize) + 1;
    this.rows = Math.ceil(height / binSize) + 1;
    const lists: number[][] = Array.from({ length: this.cols * this.rows }, () => []);
    for (const cell of cells) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const [px, py] of cell.poly) {
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
      const c0 = Math.max(0, Math.floor(minX / binSize));
      const c1 = Math.min(this.cols - 1, Math.floor(maxX / binSize));
      const r0 = Math.max(0, Math.floor(minY / binSize));
      const r1 = Math.min(this.rows - 1, Math.floor(maxY / binSize));
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) lists[r * this.cols + c].push(cell.i);
      }
    }
    this.bins = lists.map((l) => Int32Array.from(l));
  }

  /** Cell id containing (x, y), or the nearest candidate, or null off-map. */
  cellAt(x: number, y: number): number | null {
    const c = Math.floor(x / this.binSize);
    const r = Math.floor(y / this.binSize);
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return null;
    const candidates = this.bins[r * this.cols + c];
    let nearest: number | null = null;
    let nearestD = Infinity;
    for (const id of candidates) {
      const cell = this.cells[id];
      if (pointInPolygon(x, y, cell.poly)) return id;
      const dx = cell.p[0] - x;
      const dy = cell.p[1] - y;
      const d = dx * dx + dy * dy;
      if (d < nearestD) {
        nearestD = d;
        nearest = id;
      }
    }
    return nearest;
  }

  /**
   * Nearest cell (by center) accepted by the predicate, searching outward in
   * expanding rings of bins from (x, y). Null if none within maxRadius.
   */
  nearestMatchingCell(x: number, y: number, accept: (cellId: number) => boolean, maxRadius = 320): number | null {
    const c = Math.floor(x / this.binSize);
    const r = Math.floor(y / this.binSize);
    const maxRing = Math.ceil(maxRadius / this.binSize);
    let best: number | null = null;
    let bestD = Infinity;
    const seen = new Set<number>();
    for (let ring = 0; ring <= maxRing; ring++) {
      for (let dr = -ring; dr <= ring; dr++) {
        for (let dc = -ring; dc <= ring; dc++) {
          if (Math.max(Math.abs(dr), Math.abs(dc)) !== ring) continue; // ring perimeter only
          const rr = r + dr;
          const cc = c + dc;
          if (rr < 0 || cc < 0 || rr >= this.rows || cc >= this.cols) continue;
          for (const id of this.bins[rr * this.cols + cc]) {
            if (seen.has(id)) continue;
            seen.add(id);
            if (!accept(id)) continue;
            const cell = this.cells[id];
            const dx = cell.p[0] - x;
            const dy = cell.p[1] - y;
            const d = dx * dx + dy * dy;
            if (d < bestD) {
              bestD = d;
              best = id;
            }
          }
        }
      }
      // A hit this ring can't be beaten by anything farther than one more ring.
      if (best !== null && Math.sqrt(bestD) <= ring * this.binSize) break;
    }
    return best;
  }

  /** Cell ids whose bins intersect the given world-space rectangle. */
  cellsInRect(x0: number, y0: number, x1: number, y1: number): Set<number> {
    const out = new Set<number>();
    const c0 = Math.max(0, Math.floor(x0 / this.binSize));
    const c1 = Math.min(this.cols - 1, Math.floor(x1 / this.binSize));
    const r0 = Math.max(0, Math.floor(y0 / this.binSize));
    const r1 = Math.min(this.rows - 1, Math.floor(y1 / this.binSize));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        for (const id of this.bins[r * this.cols + c]) out.add(id);
      }
    }
    return out;
  }
}
