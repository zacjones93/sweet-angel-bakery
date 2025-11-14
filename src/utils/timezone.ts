/**
 * Timezone Utility for Sweet Angel Bakery
 *
 * Business timezone: America/Boise (Mountain Time)
 *
 * CRITICAL: All delivery/pickup calculations must use Mountain Time, regardless of user's location.
 * - Store all dates in UTC in the database
 * - Convert to MT for all business logic calculations
 * - Display dates to customers/admin in MT
 */

export const BUSINESS_TIMEZONE = 'America/Boise' as const;

/**
 * Get current date/time in Mountain Time
 */
export function getCurrentMountainTime(): Date {
  // Get the current time in MT as a string
  const now = new Date();
  const mtString = now.toLocaleString('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  // Parse the MT string back to a Date object
  // Format will be: "MM/DD/YYYY, HH:mm:ss"
  const [datePart, timePart] = mtString.split(', ');
  const [month, day, year] = datePart.split('/');
  const [hour, minute, second] = timePart.split(':');

  return new Date(
    parseInt(year),
    parseInt(month) - 1, // JS months are 0-indexed
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second)
  );
}

/**
 * Convert a Date to Mountain Time
 */
export function toMountainTime(date: Date): Date {
  const mtString = date.toLocaleString('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  // Parse the MT string back to a Date object
  // Format will be: "MM/DD/YYYY, HH:mm:ss"
  const [datePart, timePart] = mtString.split(', ');
  const [month, day, year] = datePart.split('/');
  const [hour, minute, second] = timePart.split(':');

  return new Date(
    parseInt(year),
    parseInt(month) - 1, // JS months are 0-indexed
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second)
  );
}

/**
 * Get day of week (0-6, 0=Sunday) in Mountain Time
 */
export function getMountainDayOfWeek(date: Date = new Date()): number {
  const mtDate = toMountainTime(date);
  return mtDate.getDay();
}

/**
 * Get ISO date string (YYYY-MM-DD) in Mountain Time
 */
export function getMountainISODate(date: Date = new Date()): string {
  const mtDate = toMountainTime(date);
  return mtDate.toISOString().split('T')[0];
}

/**
 * Parse ISO date string as Mountain Time and return Date
 * @param isoDate - ISO date string (YYYY-MM-DD)
 * @returns Date object representing midnight MT on that date
 */
export function parseMountainISODate(isoDate: string): Date {
  // Create date at midnight MT
  return new Date(`${isoDate}T00:00:00-07:00`); // MT is UTC-7 (or UTC-6 during DST)
}

/**
 * Check if current time in Mountain Time is before a cutoff time
 * @param cutoffDay - Day of week (0-6, 0=Sunday)
 * @param cutoffTime - Time in HH:MM format (e.g., "23:59")
 * @returns true if current MT time is before the cutoff
 */
export function isBeforeMountainCutoff({
  cutoffDay,
  cutoffTime,
}: {
  cutoffDay: number;
  cutoffTime: string;
}): boolean {
  const now = getCurrentMountainTime();
  const currentDay = now.getDay();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const [cutoffHour, cutoffMinute] = cutoffTime.split(':').map(Number);

  // If we're before the cutoff day in the week
  if (currentDay < cutoffDay) {
    return true;
  }

  // If we're after the cutoff day in the week
  if (currentDay > cutoffDay) {
    return false;
  }

  // We're on the cutoff day - check the time
  if (currentHour < cutoffHour) {
    return true;
  }

  if (currentHour === cutoffHour && currentMinute <= cutoffMinute) {
    return true;
  }

  return false;
}

/**
 * Add days to a date in Mountain Time
 * @param date - Starting date
 * @param days - Number of days to add
 * @returns New date with days added
 */
export function addDaysMountainTime(date: Date, days: number): Date {
  const mtDate = toMountainTime(date);
  mtDate.setDate(mtDate.getDate() + days);
  return mtDate;
}

/**
 * Get next occurrence of a specific day of week in Mountain Time
 * @param dayOfWeek - Target day (0-6, 0=Sunday)
 * @param fromDate - Starting date (defaults to current MT time)
 * @returns Next occurrence of that day
 */
export function getNextDayOfWeek(dayOfWeek: number, fromDate: Date = getCurrentMountainTime()): Date {
  const mtDate = toMountainTime(fromDate);
  const currentDay = mtDate.getDay();

  // Calculate days until next occurrence
  let daysUntil = dayOfWeek - currentDay;
  if (daysUntil <= 0) {
    daysUntil += 7; // Move to next week
  }

  return addDaysMountainTime(mtDate, daysUntil);
}

/**
 * Get the week after next occurrence of a specific day of week
 * @param dayOfWeek - Target day (0-6, 0=Sunday)
 * @param fromDate - Starting date (defaults to current MT time)
 * @returns Next week's occurrence of that day
 */
export function getWeekAfterNextDayOfWeek(dayOfWeek: number, fromDate: Date = getCurrentMountainTime()): Date {
  const nextOccurrence = getNextDayOfWeek(dayOfWeek, fromDate);
  return addDaysMountainTime(nextOccurrence, 7);
}

/**
 * Format date for display in Mountain Time
 * @param date - Date to format
 * @param format - Display format ('full' | 'date' | 'time' | 'datetime')
 * @returns Formatted string
 */
export function formatMountainTime(
  date: Date,
  format: 'full' | 'date' | 'time' | 'datetime' = 'datetime'
): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: BUSINESS_TIMEZONE,
  };

  switch (format) {
    case 'full':
      return date.toLocaleString('en-US', {
        ...options,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      });
    case 'date':
      return date.toLocaleString('en-US', {
        ...options,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    case 'time':
      return date.toLocaleString('en-US', {
        ...options,
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      });
    case 'datetime':
    default:
      return date.toLocaleString('en-US', {
        ...options,
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
  }
}

/**
 * Check if a date is a closure date (closed for delivery/pickup)
 * @param date - Date to check
 * @param closureDates - Array of ISO date strings (YYYY-MM-DD) in MT
 * @returns true if the date is a closure date
 */
export function isClosureDate(date: Date, closureDates: string[]): boolean {
  const isoDate = getMountainISODate(date);
  return closureDates.includes(isoDate);
}

/**
 * Calculate days between two dates in Mountain Time
 * @param from - Start date
 * @param to - End date
 * @returns Number of days between the dates
 */
export function getDaysBetween(from: Date, to: Date): number {
  const fromMT = toMountainTime(from);
  const toMT = toMountainTime(to);

  // Reset to midnight for accurate day calculation
  fromMT.setHours(0, 0, 0, 0);
  toMT.setHours(0, 0, 0, 0);

  const diffTime = toMT.getTime() - fromMT.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
