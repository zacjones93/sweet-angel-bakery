import { format } from 'date-fns';
import { toMountainTime } from './timezone-v2';
import { BUSINESS_TIMEZONE } from './timezone-v2';

/**
 * Format a date into a human-readable string in Mountain Time
 */
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const mtDate = toMountainTime(dateObj);

  return format(mtDate, 'MMM d, yyyy');
}

/**
 * Format a date with time into a human-readable string in Mountain Time
 */
export function formatDateTime(date: Date | number | string): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  const mtDate = toMountainTime(dateObj);

  return format(mtDate, "MMM d, yyyy, h:mm a");
}

/**
 * Format date for user's local timezone (for client components)
 */
export function formatDateLocal(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'MMM d, yyyy');
}

/**
 * Format datetime for user's local timezone (for client components)
 */
export function formatDateTimeLocal(date: Date | number | string): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  return format(dateObj, "MMM d, yyyy, h:mm a");
}
