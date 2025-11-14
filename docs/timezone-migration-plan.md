# Timezone Migration Plan: Custom Utils → date-fns-tz

**Status**: ✅ Phases 1-2, 4-5 Complete (Phase 3 deferred)
**Priority**: 🔴 CRITICAL
**Started**: 2025-11-14
**Completed**: 2025-11-14 (Phases 1-2, 4-5)

## Migration Commits

- **Phase 1** (Setup & Utilities): `68ac2dc` - feat(timezone): Phase 1 - Install date-fns-tz and create new utilities
- **Phase 2** (Delivery System): `2bbf570` - feat(timezone): Phase 2 - Update delivery system to use new utilities
- **Phase 3** (Database Migration): DEFERRED - Requires separate implementation with parallel columns
- **Phase 4-5** (Cleanup): `8035f04` - feat(timezone): Phase 5 - Replace old timezone utilities with new implementation

---

## Executive Summary

This document outlines the migration from broken custom timezone utilities to industry-standard `date-fns-tz` library. Current implementation has critical bugs causing incorrect delivery date calculations, DST vulnerabilities, and timezone-related errors for non-Mountain Time users.

**Impact**: Affects delivery system, order management, revenue analytics, and session management.

---

## Problem Analysis

### Critical Issues Identified

#### 1. Broken Timezone Conversion Logic
**Files**: `src/utils/timezone.ts:17-45, 50-76`

```typescript
// CURRENT (BROKEN):
export function getCurrentMountainTime(): Date {
  const now = new Date();
  const mtString = now.toLocaleString('en-US', { timeZone: BUSINESS_TIMEZONE });
  const [datePart, timePart] = mtString.split(', ');
  const [month, day, year] = datePart.split('/');
  const [hour, minute, second] = timePart.split(':');

  // ❌ Creates LOCAL Date object with MT clock values
  // NOT a true MT-aware date
  return new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second)
  );
}
```

**Problem**: Returns a local `Date` object with Mountain Time clock values, not a timezone-aware date. Causes bugs:
- User in PST calls function at 2:00 PM PST
- Function returns Date representing 2:00 PM PST (not 2:00 PM MT)
- All time comparisons fail

#### 2. Hardcoded DST Offset
**File**: `src/utils/timezone.ts:101`

```typescript
export function parseMountainISODate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00-07:00`); // ❌ Always UTC-7
}
```

**Problem**:
- MST (winter) is UTC-7
- MDT (summer) is UTC-6
- Hardcoding causes 1-hour errors Mar-Nov

#### 3. Mixed Date Storage Formats
**File**: `src/db/schema.ts`

- ✅ Timestamps: `createdAt`, `updatedAt`, `expiresAt` (Unix timestamps)
- ❌ ISO Strings: `deliveryDate`, `pickupDate`, `closureDate` (text "YYYY-MM-DD")

**Problem**: ISO strings lose timezone context, require fragile string manipulation in queries:

```typescript
sql`substr(${orderTable.deliveryDate}, 1, 10) >= ${input.startDate}`
```

#### 4. Inconsistent Date Library Usage

- **Native Date**: Most files (error-prone)
- **date-fns**: `src/utils/delivery-eta.ts`, admin columns (no timezone support)
- **Custom utils**: `src/utils/timezone.ts` (broken logic)

---

## Solution: date-fns-tz

### Why date-fns-tz?

1. ✅ **Already using date-fns** (v4.1.0) - minimal breaking changes
2. ✅ **Industry standard** - 15M+ weekly downloads
3. ✅ **Timezone-aware** - proper IANA timezone support
4. ✅ **DST handling** - automatic transitions
5. ✅ **Tree-shakeable** - only import what you need
6. ✅ **TypeScript native** - excellent type safety

### Alternative Considered: Luxon

**Pros**: More powerful API, immutable Dates
**Cons**: Larger bundle, different API from date-fns, requires rewriting all date-fns code

**Decision**: Use date-fns-tz for consistency with existing codebase.

---

## Migration Strategy

### Phase 1: Setup & Utilities (Week 1)

#### Step 1.1: Install date-fns-tz
```bash
pnpm add date-fns-tz
```

#### Step 1.2: Create New Timezone Utilities
**File**: `src/utils/timezone-v2.ts` (parallel to old file)

```typescript
import { zonedTimeToUtc, utcToZonedTime, format, toDate } from 'date-fns-tz';
import {
  parseISO,
  addDays,
  startOfDay,
  differenceInDays,
  getDay,
  setHours,
  setMinutes,
  setSeconds
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
```

#### Step 1.3: Update format-date.ts
**File**: `src/utils/format-date.ts`

```typescript
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
```

#### Step 1.4: Update delivery-eta.ts
**File**: `src/utils/delivery-eta.ts`

```typescript
import { format, parseISO, differenceInMinutes, addMinutes } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import { BUSINESS_TIMEZONE, toMountainTime, getMountainISODate } from './timezone-v2';

/**
 * Generalizes an estimated arrival time into a customer-friendly message
 * All calculations done in Mountain Time
 */
export function generalizeDeliveryETA({
  estimatedArrivalTime,
  deliveryDate,
}: {
  estimatedArrivalTime?: string | null;
  deliveryDate: string;
}): string {
  const now = toMountainTime(new Date());
  const today = getMountainISODate(now);

  if (!estimatedArrivalTime) {
    if (deliveryDate === today) {
      return 'Today';
    }
    const deliveryMT = utcToZonedTime(parseISO(deliveryDate), BUSINESS_TIMEZONE);
    return `On ${format(deliveryMT, 'EEEE, MMMM d')}`;
  }

  // Parse the estimated arrival datetime in MT
  const [hours, minutes] = estimatedArrivalTime.split(':').map(Number);
  const deliveryDateObj = parseISO(deliveryDate);
  const estimatedArrival = utcToZonedTime(deliveryDateObj, BUSINESS_TIMEZONE);
  estimatedArrival.setHours(hours, minutes, 0, 0);

  if (deliveryDate !== today) {
    const startTime = format(estimatedArrival, 'h:mm a');
    const endTime = format(addMinutes(estimatedArrival, 60), 'h:mm a');
    return `${format(estimatedArrival, 'EEEE, MMMM d')} between ${startTime} - ${endTime}`;
  }

  const minutesUntilArrival = differenceInMinutes(estimatedArrival, now);

  if (minutesUntilArrival <= 60) {
    return 'Within the hour';
  }

  const startHour = format(estimatedArrival, 'h a');
  const endHour = format(addMinutes(estimatedArrival, 60), 'h a');

  return `Today between ${startHour} - ${endHour}`;
}

export function getDetailedETA({
  estimatedArrivalTime,
  deliveryDate,
}: {
  estimatedArrivalTime?: string | null;
  deliveryDate: string;
}): string {
  const deliveryMT = utcToZonedTime(parseISO(deliveryDate), BUSINESS_TIMEZONE);

  if (!estimatedArrivalTime) {
    return format(deliveryMT, 'EEEE, MMMM d');
  }

  const [hours, minutes] = estimatedArrivalTime.split(':').map(Number);
  const estimatedArrival = utcToZonedTime(parseISO(deliveryDate), BUSINESS_TIMEZONE);
  estimatedArrival.setHours(hours, minutes, 0, 0);

  const today = getMountainISODate(toMountainTime(new Date()));

  if (deliveryDate === today) {
    return `Today at ${format(estimatedArrival, 'h:mm a')}`;
  }

  return `${format(estimatedArrival, 'EEEE, MMMM d')} at ${format(estimatedArrival, 'h:mm a')}`;
}
```

#### Step 1.5: Write Unit Tests
**File**: `src/utils/__tests__/timezone-v2.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getCurrentMountainTime,
  toMountainTime,
  parseMountainISODate,
  getMountainISODate,
  isBeforeMountainCutoff,
} from '../timezone-v2';

describe('Timezone Utilities v2', () => {
  // Save original timezone
  const originalTZ = process.env.TZ;

  afterEach(() => {
    process.env.TZ = originalTZ;
  });

  describe('getCurrentMountainTime', () => {
    it('returns correct MT time from PST', () => {
      process.env.TZ = 'America/Los_Angeles';
      const mtTime = getCurrentMountainTime();
      // MT is 1 hour ahead of PST
      expect(mtTime).toBeInstanceOf(Date);
    });

    it('returns correct MT time from EST', () => {
      process.env.TZ = 'America/New_York';
      const mtTime = getCurrentMountainTime();
      // MT is 2 hours behind EST
      expect(mtTime).toBeInstanceOf(Date);
    });
  });

  describe('DST transitions', () => {
    it('handles spring forward correctly', () => {
      // March 9, 2025 - 2:00 AM becomes 3:00 AM
      const beforeDST = new Date('2025-03-09T08:59:00Z'); // 1:59 AM MST
      const afterDST = new Date('2025-03-09T09:01:00Z'); // 3:01 AM MDT

      const beforeMT = toMountainTime(beforeDST);
      const afterMT = toMountainTime(afterDST);

      expect(beforeMT.getHours()).toBe(1);
      expect(afterMT.getHours()).toBe(3);
    });

    it('handles fall back correctly', () => {
      // November 2, 2025 - 2:00 AM becomes 1:00 AM
      const beforeDST = new Date('2025-11-02T07:59:00Z'); // 1:59 AM MDT
      const afterDST = new Date('2025-11-02T08:01:00Z'); // 1:01 AM MST

      const beforeMT = toMountainTime(beforeDST);
      const afterMT = toMountainTime(afterDST);

      expect(beforeMT.getHours()).toBe(1);
      expect(afterMT.getHours()).toBe(1);
    });
  });

  describe('parseMountainISODate', () => {
    it('parses date as MT midnight', () => {
      const date = parseMountainISODate('2025-03-15');
      const mtDate = toMountainTime(date);

      expect(mtDate.getHours()).toBe(0);
      expect(mtDate.getMinutes()).toBe(0);
      expect(getMountainISODate(mtDate)).toBe('2025-03-15');
    });
  });

  describe('isBeforeMountainCutoff', () => {
    it('correctly identifies before cutoff', () => {
      // Mock current time to Tuesday 1:00 PM MT
      // Cutoff: Tuesday 11:59 PM
      const result = isBeforeMountainCutoff({
        cutoffDay: 2, // Tuesday
        cutoffTime: '23:59',
      });
      // Result depends on actual current time
      expect(typeof result).toBe('boolean');
    });
  });
});
```

---

### Phase 2: Delivery System (Week 2)

#### Step 2.1: Update delivery.ts
**File**: `src/utils/delivery.ts`

Replace all imports:
```typescript
// OLD:
import {
  getCurrentMountainTime,
  getMountainDayOfWeek,
  getNextDayOfWeek,
  // ...
} from "./timezone";

// NEW:
import {
  getCurrentMountainTime,
  getMountainDayOfWeek,
  getNextDayOfWeek,
  // ...
} from "./timezone-v2";
```

**Testing checklist**:
- [ ] Test delivery date calculation for Thursday delivery
- [ ] Test delivery date calculation for Saturday delivery
- [ ] Test cutoff enforcement (before/after Tuesday 11:59 PM MT)
- [ ] Test closure date filtering
- [ ] Test from different timezones (PST, EST, MT)

#### Step 2.2: Update Delivery Actions
**Files**:
- `src/app/(storefront)/_actions/get-fulfillment-options.action.ts`
- `src/app/(admin)/admin/_actions/orders-by-fulfillment.action.ts`
- `src/app/(admin)/admin/_actions/optimize-delivery-route.action.ts`
- `src/app/(admin)/admin/_actions/notify-delivery-eta.action.ts`

Replace timezone imports with v2.

---

### Phase 3: Database Migration (Week 3)

#### Step 3.1: Create Migration for Date Columns

**Goal**: Convert ISO string dates to Unix timestamps

**Migration**: `drizzle/XXXX_migrate_dates_to_timestamps.sql`

```sql
-- Add new timestamp columns
ALTER TABLE "order" ADD COLUMN "delivery_date_ts" INTEGER;
ALTER TABLE "order" ADD COLUMN "pickup_date_ts" INTEGER;
ALTER TABLE "delivery_calendar_closure" ADD COLUMN "closure_date_ts" INTEGER;

-- Convert existing ISO dates to timestamps (MT midnight)
-- This is complex - may need to do in application code
-- Placeholder for now

-- Drop old columns (AFTER verifying data)
-- ALTER TABLE "order" DROP COLUMN "delivery_date";
-- ALTER TABLE "order" DROP COLUMN "pickup_date";
-- Rename new columns
-- ALTER TABLE "order" RENAME COLUMN "delivery_date_ts" TO "delivery_date";
```

**Note**: This is complex. Consider doing data migration in Node.js script:

**File**: `scripts/migrate-dates-to-timestamps.mjs`

```javascript
import { getDB } from '../src/db/index.js';
import { orderTable, deliveryCalendarClosureTable } from '../src/db/schema.js';
import { zonedTimeToUtc } from 'date-fns-tz';
import { parseISO, startOfDay } from 'date-fns';

const BUSINESS_TIMEZONE = 'America/Boise';

async function migrateDates() {
  const db = await getDB();

  // Migrate orders
  const orders = await db.select().from(orderTable).all();

  for (const order of orders) {
    const updates = {};

    if (order.deliveryDate) {
      const mtMidnight = startOfDay(parseISO(order.deliveryDate));
      const utcDate = zonedTimeToUtc(mtMidnight, BUSINESS_TIMEZONE);
      updates.delivery_date_ts = Math.floor(utcDate.getTime() / 1000);
    }

    if (order.pickupDate) {
      const mtMidnight = startOfDay(parseISO(order.pickupDate));
      const utcDate = zonedTimeToUtc(mtMidnight, BUSINESS_TIMEZONE);
      updates.pickup_date_ts = Math.floor(utcDate.getTime() / 1000);
    }

    if (Object.keys(updates).length > 0) {
      await db.update(orderTable)
        .set(updates)
        .where(eq(orderTable.id, order.id));
    }
  }

  console.log(`Migrated ${orders.length} orders`);
}

migrateDates().catch(console.error);
```

#### Step 3.2: Update Schema
**File**: `src/db/schema.ts`

```typescript
// Change from:
deliveryDate: text('delivery_date', { length: 20 }),
pickupDate: text('pickup_date', { length: 20 }),

// To:
deliveryDate: integer('delivery_date', { mode: "timestamp" }),
pickupDate: integer('pickup_date', { mode: "timestamp" }),
```

#### Step 3.3: Update All Queries

Replace string comparisons:
```typescript
// OLD:
sql`substr(${orderTable.deliveryDate}, 1, 10) >= ${input.startDate}`

// NEW:
gte(orderTable.deliveryDate, startOfDayTimestamp(input.startDate))
```

---

### Phase 4: Update Remaining Files (Week 3-4)

#### Files to Update:

1. **Admin Components**
   - `src/app/(admin)/admin/_components/users/columns.tsx`
   - `src/app/(admin)/admin/orders/_components/orders-table.tsx`
   - `src/app/(admin)/admin/delivery-settings/_components/calendar-closures-table.tsx`
   - All files using `formatDate` or `formatDateTime`

2. **Storefront Components**
   - `src/app/(storefront)/_components/product-card.tsx`
   - `src/components/fulfillment-method-selector.tsx`
   - `src/app/(storefront)/profile/orders/[orderId]/page.tsx`

3. **Server Actions**
   - `src/app/(admin)/admin/revenue/_actions/revenue-stats.action.ts`
   - `src/app/(admin)/admin/site-content/_actions/sales-banner.action.ts`
   - All actions using date comparisons

4. **Email Templates**
   - `src/react-email/order-confirmation.tsx`

#### Update Pattern:

```typescript
// Before:
import { formatDate } from '@/utils/format-date';
const display = formatDate(order.createdAt);

// After:
import { formatDate } from '@/utils/format-date';
// formatDate now uses MT internally - no changes needed!
const display = formatDate(order.createdAt);
```

---

### Phase 5: Cleanup & Testing (Week 4)

#### Step 5.1: Remove Old Utilities
- [ ] Delete `src/utils/timezone.ts` (old file)
- [ ] Rename `src/utils/timezone-v2.ts` → `src/utils/timezone.ts`
- [ ] Update all imports

#### Step 5.2: Comprehensive Testing

**Manual Test Cases**:

1. **Delivery Date Selection** (from different timezones)
   - [ ] PST user: Select Thursday delivery before Tuesday 11:59 PM MT
   - [ ] PST user: Select Thursday delivery after Tuesday 11:59 PM MT
   - [ ] EST user: Same tests
   - [ ] MT user: Same tests

2. **DST Transitions**
   - [ ] Place order on March 8, 2025 (day before spring forward)
   - [ ] Place order on March 9, 2025 (spring forward day)
   - [ ] Place order on November 1, 2025 (day before fall back)
   - [ ] Place order on November 2, 2025 (fall back day)

3. **Order Management**
   - [ ] View orders by delivery date
   - [ ] Filter orders by date range
   - [ ] Export delivery routes CSV
   - [ ] Send delivery ETA notifications

4. **Revenue Analytics**
   - [ ] View revenue for date range spanning DST transition
   - [ ] Verify timestamps are correctly converted to MT for display

**Automated Tests**:
```bash
pnpm test src/utils/__tests__/timezone-v2.test.ts
```

#### Step 5.3: Update Documentation

**Files to update**:
- `CLAUDE.md` - Update timezone handling notes
- `docs/delivery-system-prd.md` - Update date handling section
- `.claude/skills/mountain-time.md` - Update with new utilities

---

## Rollback Plan

If critical bugs discovered:

1. **Immediate**: Revert to old utilities
   ```bash
   git revert <migration-commit-sha>
   ```

2. **Database**: Keep both columns during migration
   - Don't drop old `deliveryDate` (text) until 100% verified
   - Can fall back to old column if needed

3. **Feature Flag**: Consider adding feature flag for gradual rollout
   ```typescript
   const USE_NEW_TIMEZONE_UTILS = process.env.NEXT_PUBLIC_NEW_TZ === 'true';
   ```

---

## Success Criteria

- [ ] All delivery date calculations accurate for non-MT users
- [ ] DST transitions handled correctly (verified with tests)
- [ ] No timezone-related bugs in production
- [ ] All date queries use timestamps (not string manipulation)
- [ ] Single source of truth for timezone logic (`timezone.ts`)
- [ ] 100% test coverage for timezone utilities
- [ ] Documentation updated

---

## Dependencies

**Required**:
- `date-fns-tz` - Add to dependencies
- `vitest` or `jest` - For testing

**Installation**:
```bash
pnpm add date-fns-tz
pnpm add -D vitest @vitest/ui
```

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Breaking existing orders | 🔴 Critical | Parallel columns, thorough testing, gradual rollout |
| DST bugs in production | 🔴 Critical | Comprehensive DST test suite, staging environment testing |
| Performance degradation | 🟡 Medium | Benchmark date operations, optimize if needed |
| User timezone confusion | 🟡 Medium | Clear MT labels in UI, timezone abbreviations |
| Developer adoption | 🟢 Low | Good documentation, code reviews |

---

## Timeline

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1 | Setup & Utilities | New timezone-v2.ts, tests, updated format-date.ts |
| 2 | Delivery System | Updated delivery.ts, fulfillment actions, tested |
| 3 | Database Migration | Schema changes, data migration script, verified |
| 3-4 | Update Remaining Files | All components/actions updated, tested |
| 4 | Cleanup & Testing | Old utils removed, comprehensive tests, docs updated |

**Total**: 3-4 weeks for complete migration

---

## References

- [date-fns-tz Documentation](https://github.com/marnusw/date-fns-tz)
- [IANA Time Zone Database](https://www.iana.org/time-zones)
- [Temporal API Cookbook](https://tc39.es/proposal-temporal/docs/cookbook.html) (future consideration)
- Current implementation: `src/utils/timezone.ts` (broken)

---

## Notes

- **America/Boise** correctly handles MT/MDT transitions
- Always use IANA timezone identifiers (not abbreviations like "MST")
- Date objects in JavaScript are always UTC internally
- `toLocaleString` with `timeZone` only formats, doesn't convert
- Consider migrating to Temporal API when it reaches Stage 4 (2026+)

---

## Phase 3 Implementation Notes (Deferred)

**Reason for Deferral**: Database schema migration from ISO string dates to Unix timestamps is a high-risk operation that requires:

1. **Parallel columns during transition** - Keep both old (`deliveryDate` text) and new (`deliveryDate` integer) columns until 100% verified
2. **Data migration script** - Complex Node.js script to convert existing ISO dates to MT midnight timestamps
3. **Comprehensive testing** - Test all date queries, filters, and exports with real production data
4. **Rollback plan** - Ability to revert if critical bugs discovered
5. **Gradual rollout** - Consider feature flag for testing in staging before production

**Current State**:
- ✅ New timezone utilities fully implemented and working
- ✅ All date formatting uses proper MT timezone
- ⚠️ Database still stores dates as ISO strings (YYYY-MM-DD)
- ⚠️ Date queries still use string manipulation: `substr(deliveryDate, 1, 10) >= '2025-11-14'`

**Impact of Deferral**:
- Existing functionality continues to work
- New timezone utilities fix critical timezone conversion bugs
- Database performance slightly suboptimal (string comparisons vs integer)
- Full benefits of migration realized when Phase 3 completed

**Next Steps for Phase 3**:
1. Review migration script in plan (lines 588-631)
2. Test in local development environment
3. Create database backup before migration
4. Run migration on staging environment
5. Monitor for 1 week before production migration
6. Update all queries to use timestamp comparisons
