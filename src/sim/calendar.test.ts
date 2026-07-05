import { describe, it, expect } from 'vitest';
import {
  addDays, addMonths, addYears, dayOfYear, formatDate, fromOrdinal,
  season, toOrdinal, START_DATE, DAYS_PER_YEAR,
} from './calendar';

describe('calendar', () => {
  it('starts on 1 January 1181 SE', () => {
    expect(formatDate(START_DATE)).toBe('1 January 1181 SE');
    expect(dayOfYear(START_DATE)).toBe(1);
  });

  it('roundtrips ordinal <-> date for every day of several years', () => {
    for (let ord = toOrdinal({ year: 1181, month: 1, day: 1 }), end = ord + DAYS_PER_YEAR * 3; ord < end; ord++) {
      expect(toOrdinal(fromOrdinal(ord))).toBe(ord);
    }
  });

  it('adds days across month and year boundaries', () => {
    expect(addDays({ year: 1181, month: 1, day: 31 }, 1)).toEqual({ year: 1181, month: 2, day: 1 });
    expect(addDays({ year: 1181, month: 12, day: 31 }, 1)).toEqual({ year: 1182, month: 1, day: 1 });
    expect(addDays({ year: 1181, month: 2, day: 28 }, 1)).toEqual({ year: 1181, month: 3, day: 1 });
    expect(addDays({ year: 1181, month: 1, day: 1 }, 365)).toEqual({ year: 1182, month: 1, day: 1 });
  });

  it('adds months with day clamping', () => {
    expect(addMonths({ year: 1181, month: 1, day: 31 }, 1)).toEqual({ year: 1181, month: 2, day: 28 });
    expect(addMonths({ year: 1181, month: 12, day: 15 }, 1)).toEqual({ year: 1182, month: 1, day: 15 });
    expect(addYears({ year: 1181, month: 6, day: 10 }, 100)).toEqual({ year: 1281, month: 6, day: 10 });
  });

  it('derives seasons per hemisphere', () => {
    const jan = { year: 1181, month: 1, day: 15 };
    const jul = { year: 1181, month: 7, day: 15 };
    expect(season(jan, 50)).toBe('Winter');
    expect(season(jul, 50)).toBe('Summer');
    expect(season(jan, -50)).toBe('Summer');
    expect(season(jul, -50)).toBe('Winter');
  });
});
