import { describe, it, expect } from 'vitest';
import { CellIndex, pointInPolygon, type HitCell } from './hittest';

describe('pointInPolygon', () => {
  const square: [number, number][] = [[0, 0], [10, 0], [10, 10], [0, 10]];
  it('detects inside/outside', () => {
    expect(pointInPolygon(5, 5, square)).toBe(true);
    expect(pointInPolygon(15, 5, square)).toBe(false);
    expect(pointInPolygon(-1, -1, square)).toBe(false);
  });
  it('handles concave polygons', () => {
    const concave: [number, number][] = [[0, 0], [10, 0], [10, 10], [5, 5], [0, 10]];
    expect(pointInPolygon(2, 3, concave)).toBe(true);
    expect(pointInPolygon(5, 8, concave)).toBe(false);
  });
});

describe('CellIndex', () => {
  // 4x4 grid of 20x20 hexish squares
  const cells: HitCell[] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const x = c * 20;
      const y = r * 20;
      cells.push({
        i: r * 4 + c,
        p: [x + 10, y + 10],
        poly: [[x, y], [x + 20, y], [x + 20, y + 20], [x, y + 20]],
      });
    }
  }
  const index = new CellIndex(cells, 16, 80, 80);

  it('finds the containing cell', () => {
    expect(index.cellAt(5, 5)).toBe(0);
    expect(index.cellAt(35, 5)).toBe(1);
    expect(index.cellAt(75, 75)).toBe(15);
    expect(index.cellAt(30, 50)).toBe(9);
  });

  it('returns null far off-map', () => {
    expect(index.cellAt(-50, -50)).toBeNull();
    expect(index.cellAt(500, 500)).toBeNull();
  });

  it('collects cells intersecting a rect', () => {
    const set = index.cellsInRect(0, 0, 39, 39);
    expect(set.has(0)).toBe(true);
    expect(set.has(5)).toBe(true);
    expect(set.has(15)).toBe(false);
  });
});
