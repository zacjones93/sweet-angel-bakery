import { zonedTimeToUtc, utcToZonedTime, format } from 'date-fns-tz';
import {
  parseISO,
  addDays,
  startOfDay,
  differenceInDays,
  getDay,
} from 'date-fns';

export const BUSINESS_TIMEZONE = 'America/Boise' as const;

/**
 * Get current date/time in Mountain Time
 * Returns a Date object representing the current MT time
 */
export function getCurrentMountainTime(): Date {
  return utcToZonedTime(new Date(), BUSINESS_TIMEZONE);
}

/**
 * Convert any Date to Mountain Time
 */
export function toMountainTime(date: Date): Date {
  return utcToZonedTime(date, BUSINESS_TIMEZONE);
}

/**
 * Get day of week (0-6, 0=Sunday) in Mountain Time
 */
export function getMountainDayOfWeek(date: Date = new Date()): number {
  const mtDate = toMountainTime(date);
  return getDay(mtDate);
}

/**
 * Get ISO date string (YYYY-MM-DD) in Mountain Time
 */
export function getMountainISODate(date: Date = new Date()): string {
  const mtDate = toMountainTime(date);
  return format(mtDate, 'yyyy-MM-dd', { timeZone: BUSINESS_TIMEZONE });
}

/**
 * Parse ISO date string as Mountain Time and return Date
 * @param isoDate - ISO date string (YYYY-MM-DD)
 * @returns Date object representing midnight MT on that date
 */
export function parseMountainISODate(isoDate: string): Date {
  // Parse as MT midnight and convert to UTC
  const mtMidnight = startOfDay(parseISO(isoDate));
  return zonedTimeToUtc(mtMidnight, BUSINESS_TIMEZONE);
}

/**
 * Check if current time in Mountain Time is before a cutoff time
 */
export function isBeforeMountainCutoff({
  cutoffDay,
  cutoffTime,
}: {
  cutoffDay: number;
  cutoffTime: string;
}): boolean {
  const now = getCurrentMountainTime();
  const currentDay = getDay(now);

  const [cutoffHour, cutoffMinute] = cutoffTime.split(':').map(Number);

  if (currentDay < cutoffDay) return true;
  if (currentDay > cutoffDay) return false;

  // Same day - check time
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  if (currentHour < cutoffHour) return true;
  if (currentHour === cutoffHour && currentMinute <= cutoffMinute) return true;

  return false;
}

/**
 * Add days to a date in Mountain Time
 */
export function addDaysMountainTime(date: Date, days: number): Date {
  const mtDate = toMountainTime(date);
  return addDays(mtDate, days);
}

/**
 * Get next occurrence of a specific day of week in Mountain Time
 */
export function getNextDayOfWeek(
  dayOfWeek: number,
  fromDate: Date = getCurrentMountainTime()
): Date {
  const mtDate = toMountainTime(fromDate);
  const currentDay = getDay(mtDate);

  let daysUntil = dayOfWeek - currentDay;
  if (daysUntil <= 0) {
    daysUntil += 7;
  }

  return addDays(mtDate, daysUntil);
}

/**
 * Get the week after next occurrence of a specific day of week
 */
export function getWeekAfterNextDayOfWeek(
  dayOfWeek: number,
  fromDate: Date = getCurrentMountainTime()
): Date {
  const nextOccurrence = getNextDayOfWeek(dayOfWeek, fromDate);
  return addDays(nextOccurrence, 7);
}

/**
 * Format date for display in Mountain Time
 */
export function formatMountainTime(
  date: Date,
  formatStr: 'full' | 'date' | 'time' | 'datetime' = 'datetime'
): string {
  const mtDate = toMountainTime(date);

  switch (formatStr) {
    case 'full':
      return format(mtDate, 'EEEE, MMMM d, yyyy h:mm a zzz', {
        timeZone: BUSINESS_TIMEZONE
      });
    case 'date':
      return format(mtDate, 'EEE, MMM d, yyyy', {
        timeZone: BUSINESS_TIMEZONE
      });
    case 'time':
      return format(mtDate, 'h:mm a zzz', {
        timeZone: BUSINESS_TIMEZONE
      });
    case 'datetime':
    default:
      return format(mtDate, 'MMM d, h:mm a', {
        timeZone: BUSINESS_TIMEZONE
      });
  }
}

/**
 * Check if a date is a closure date (closed for delivery/pickup)
 */
export function isClosureDate(date: Date, closureDates: string[]): boolean {
  const isoDate = getMountainISODate(date);
  return closureDates.includes(isoDate);
}

/**
 * Calculate days between two dates in Mountain Time
 */
export function getDaysBetween(from: Date, to: Date): number {
  const fromMT = startOfDay(toMountainTime(from));
  const toMT = startOfDay(toMountainTime(to));
  return differenceInDays(toMT, fromMT);
}

/**
 * Convert UTC timestamp (seconds) to MT Date
 */
export function timestampToMountainTime(timestamp: number): Date {
  return toMountainTime(new Date(timestamp * 1000));
}

/**
 * Convert MT Date to UTC timestamp (seconds)
 */
export function mountainTimeToTimestamp(date: Date): number {
  const utcDate = zonedTimeToUtc(date, BUSINESS_TIMEZONE);
  return Math.floor(utcDate.getTime() / 1000);
}
