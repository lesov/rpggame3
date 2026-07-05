/**
 * Game calendar: Earth month structure, fixed 365-day years (no leap years,
 * so every ordinal <-> date mapping is deterministic). Era suffix "SE"
 * (Sorough Era) per the world data. The game starts 1 January 1181 SE.
 */

export interface GameDate {
  year: number;
  month: number; // 1..12
  day: number; // 1..monthLength
}

export const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export const DAYS_PER_YEAR = 365;

const MONTH_START = MONTH_LENGTHS.reduce<number[]>((acc, _len, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + MONTH_LENGTHS[i - 1]);
  return acc;
}, []);

export const START_DATE: GameDate = { year: 1181, month: 1, day: 1 };

/** Day-of-year, 1..365. */
export function dayOfYear(d: GameDate): number {
  return MONTH_START[d.month - 1] + d.day;
}

/** Absolute day count. Comparable and diffable across the whole era. */
export function toOrdinal(d: GameDate): number {
  return d.year * DAYS_PER_YEAR + dayOfYear(d) - 1;
}

export function fromOrdinal(ord: number): GameDate {
  const year = Math.floor(ord / DAYS_PER_YEAR);
  let doy = ord - year * DAYS_PER_YEAR; // 0..364
  let month = 0;
  while (month < 11 && doy >= MONTH_START[month + 1]) month++;
  return { year, month: month + 1, day: doy - MONTH_START[month] + 1 };
}

export function addDays(d: GameDate, days: number): GameDate {
  return fromOrdinal(toOrdinal(d) + days);
}

export function addMonths(d: GameDate, months: number): GameDate {
  const total = (d.month - 1) + months;
  const year = d.year + Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12 + 1;
  const day = Math.min(d.day, MONTH_LENGTHS[month - 1]);
  return { year, month, day };
}

export function addYears(d: GameDate, years: number): GameDate {
  return { ...d, year: d.year + years };
}

export type Season = 'Winter' | 'Spring' | 'Summer' | 'Autumn';

/** Astronomical-ish season by month; inverted in the southern hemisphere. */
export function season(d: GameDate, latitude: number): Season {
  const north: Season[] = [
    'Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer',
    'Summer', 'Summer', 'Autumn', 'Autumn', 'Autumn', 'Winter',
  ];
  const s = north[d.month - 1];
  if (latitude >= 0) return s;
  const flip: Record<Season, Season> = {
    Winter: 'Summer', Summer: 'Winter', Spring: 'Autumn', Autumn: 'Spring',
  };
  return flip[s];
}

export function formatDate(d: GameDate): string {
  return `${d.day} ${MONTH_NAMES[d.month - 1]} ${d.year} SE`;
}

export function formatDateShort(d: GameDate): string {
  return `${d.day} ${MONTH_NAMES[d.month - 1].slice(0, 3)} ${d.year}`;
}
