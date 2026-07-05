import { describe, it, expect } from 'vitest';
import { ambientEventsForDay, ambientEventsBetween, type AmbientContext } from './ambient';
import { toOrdinal } from './calendar';
import type { CellClimate } from './weather';

function makeCtx(): AmbientContext {
  const burgs = Array.from({ length: 40 }, (_, i) => ({
    i: i + 1,
    name: `City${i + 1}`,
    cell: i * 100,
    population: 10000,
    hasPortal: i < 12,
  }));
  const markers = Array.from({ length: 30 }, (_, i) => ({
    i,
    type: i % 2 ? 'brigands' : 'ruins',
    icon: '📍',
    cell: i * 50,
    name: `Place${i}`,
    legend: 'Old legend.',
  }));
  const religions = Array.from({ length: 20 }, (_, i) => ({
    i: i + 1,
    name: `Faith${i + 1}`,
    type: i % 3 ? 'Organized' : 'Folk',
    deity: `God${i + 1}`,
    centerBurg: (i % 40) + 1,
  }));
  const climateOf = (cellId: number): CellClimate => ({
    id: cellId,
    temp: 8,
    prec: 30,
    lat: 45 - (cellId % 90),
    coastRank: 3,
    isWater: false,
  });
  return { burgs, markers, religions, climateOf };
}

const ctx = makeCtx();
const start = toOrdinal({ year: 1181, month: 1, day: 1 });

describe('ambient events', () => {
  it('is deterministic per day', () => {
    for (let ord = start; ord < start + 30; ord++) {
      expect(ambientEventsForDay(ord, ctx)).toEqual(ambientEventsForDay(ord, ctx));
    }
  });

  it('produces a sane world-wide rate (~0.5–4 per week over a year)', () => {
    let count = 0;
    for (let ord = start; ord < start + 365; ord++) count += ambientEventsForDay(ord, ctx).length;
    expect(count).toBeGreaterThan(26); // > 0.5/week
    expect(count).toBeLessThan(210); // < 4/week
  });

  it('fires each faith festival once a year', () => {
    const festivals: string[] = [];
    for (let ord = start; ord < start + 365; ord++) {
      for (const e of ambientEventsForDay(ord, ctx)) if (e.kind === 'festival') festivals.push(e.id);
    }
    expect(new Set(festivals).size).toBe(festivals.length);
    expect(festivals.length).toBeGreaterThanOrEqual(10); // most of 20 faiths
  });

  it('caps huge jumps to a trailing window', () => {
    const events = ambientEventsBetween(start, start + 365 * 10, ctx, 100);
    const minOrd = Math.min(...events.map((e) => e.ord));
    expect(minOrd).toBeGreaterThan(start + 365 * 10 - 101);
  });

  it('every event has a location and description', () => {
    for (let ord = start; ord < start + 200; ord++) {
      for (const e of ambientEventsForDay(ord, ctx)) {
        expect(e.location).toBeDefined();
        expect(e.description!.length).toBeGreaterThan(10);
        expect(e.title.length).toBeGreaterThan(3);
      }
    }
  });
});
