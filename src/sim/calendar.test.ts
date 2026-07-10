import { describe, it, expect } from 'vitest';
import {
  addDays, addMinutes, addMonths, addYears, dayOfYear, formatDate, formatDateTime, formatTime24, fromMinuteOrdinal, fromOrdinal,
  minuteOfDay, season, toMinuteOrdinal, toOrdinal, START_DATE, START_DATE_TIME, DAYS_PER_YEAR, MINUTES_PER_DAY,
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

  it('formats and roundtrips 24-hour clock time', () => {
    expect(formatTime24({ hour: 0, minute: 5 })).toBe('00:05');
    expect(formatTime24({ hour: 23, minute: 59 })).toBe('23:59');
    expect(formatDateTime(START_DATE_TIME)).toBe('1 January 1181 SE · 08:00');
    expect(minuteOfDay({ hour: 8, minute: 30 })).toBe(510);
    expect(fromMinuteOrdinal(toMinuteOrdinal(START_DATE_TIME))).toEqual(START_DATE_TIME);
  });

  it('adds minutes across day, month, and year boundaries', () => {
    expect(addMinutes({ date: { year: 1181, month: 1, day: 1 }, time: { hour: 23, minute: 30 } }, 45)).toEqual({
      date: { year: 1181, month: 1, day: 2 },
      time: { hour: 0, minute: 15 },
    });
    expect(addMinutes({ date: { year: 1181, month: 1, day: 31 }, time: { hour: 23, minute: 0 } }, 120)).toEqual({
      date: { year: 1181, month: 2, day: 1 },
      time: { hour: 1, minute: 0 },
    });
    expect(addMinutes({ date: { year: 1181, month: 12, day: 31 }, time: { hour: 23, minute: 59 } }, 1)).toEqual({
      date: { year: 1182, month: 1, day: 1 },
      time: { hour: 0, minute: 0 },
    });
    expect(fromMinuteOrdinal(toOrdinal(START_DATE) * MINUTES_PER_DAY)).toEqual({
      date: START_DATE,
      time: { hour: 0, minute: 0 },
    });
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
