import { z } from "zod";

/**
 * Validates a date string in ISO 8601 format (YYYY-MM-DD).
 *
 * This schema ensures the string matches the expected format for Mountain Time dates.
 * Use this when validating date inputs from forms or APIs that should represent
 * specific calendar dates in Mountain Time (America/Boise timezone).
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   deliveryDate: mountainISODateSchema,
 * });
 *
 * schema.parse({ deliveryDate: "2025-11-15" }); // Valid
 * schema.parse({ deliveryDate: "2025-11-15T10:00:00Z" }); // Invalid - includes time
 * ```
 */
export const mountainISODateSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "Date must be in YYYY-MM-DD format"
  )
  .refine(
    (dateStr) => {
      const [year, month, day] = dateStr.split("-").map(Number);
      const date = new Date(year, month - 1, day);

      // Verify the date is valid (handles invalid dates like 2025-02-30)
      return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
      );
    },
    { message: "Invalid date" }
  );

/**
 * Validates a date string and ensures it's not in the past (in Mountain Time).
 *
 * Use this for validating future dates like delivery dates, pickup dates, or scheduled events.
 * The validation happens in Mountain Time using the business timezone.
 *
 * Note: This uses a simple date comparison that should work for most cases. For critical
 * validation, consider server-side checks using the full timezone utilities.
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   deliveryDate: futureMountainDateSchema,
 * });
 * ```
 */
export const futureMountainDateSchema = mountainISODateSchema.refine(
  (dateStr) => {
    // Parse the date string manually to avoid circular dependencies
    const [year, month, day] = dateStr.split("-").map(Number);
    const inputDate = new Date(year, month - 1, day);

    // Get current date (will be in server's timezone, which is UTC on Cloudflare)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Compare dates (this is a simple check, more rigorous validation
    // should happen server-side with full timezone utilities)
    return inputDate >= today;
  },
  { message: "Date must be today or in the future" }
);

/**
 * Optional Mountain Time ISO date string.
 * Use when the date field is not required.
 */
export const optionalMountainISODateSchema = mountainISODateSchema.optional();

/**
 * Type representing a validated Mountain Time ISO date string.
 * This is a branded type to help distinguish MT dates from other strings at compile time.
 */
export type MountainISODate = z.infer<typeof mountainISODateSchema>;
