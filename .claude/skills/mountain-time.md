# Mountain Time Enforcement Skill

**Purpose**: Ensure all time-based features use Mountain Time (America/Boise) consistently throughout the Sweet Angel Bakery application.

## When to Use This Skill

Use this skill whenever implementing features that involve:
- Date/time comparisons (checking if something is active, expired, or scheduled)
- Scheduling functionality (start dates, end dates, delivery windows)
- Countdown timers
- Calendar closures or availability checks
- Any business logic that depends on "current time"

## Core Principle

**ALWAYS use Mountain Time for business operations, regardless of user location.**

The business operates in Mountain Time (America/Boise). All date/time calculations must happen in MT to ensure:
- Consistent behavior for all users
- Accurate scheduling aligned with business hours
- Proper delivery/pickup time calculations

## Implementation Guide

### 1. Import the Timezone Utility

```typescript
import { getCurrentMountainTime } from "@/utils/timezone";
```

### 2. Available Utility Functions

```typescript
// Get current date/time in Mountain Time
const now = getCurrentMountainTime();

// Convert any Date to Mountain Time
const mtDate = toMountainTime(someDate);

// Get ISO date string (YYYY-MM-DD) in Mountain Time
const isoDate = getMountainISODate(new Date());

// Parse ISO date string as Mountain Time
const date = parseMountainISODate("2025-03-15");

// Format date for display in Mountain Time
const formatted = formatMountainTime(date, 'datetime'); // 'full', 'date', 'time', 'datetime'

// Get day of week (0-6) in Mountain Time
const dayOfWeek = getMountainDayOfWeek(date);

// Check if before cutoff time in Mountain Time
const beforeCutoff = isBeforeMountainCutoff({ cutoffDay: 2, cutoffTime: "23:59" });
```

### 3. Common Patterns

#### Server-Side Date Comparisons (Actions, API Routes)

```typescript
"use server";

import { createServerAction } from "zsa";
import { getCurrentMountainTime } from "@/utils/timezone";

export const checkAvailabilityAction = createServerAction()
  .handler(async () => {
    const now = getCurrentMountainTime(); // ← ALWAYS use this, never new Date()

    const items = await db
      .select()
      .from(table)
      .where(
        and(
          lte(table.startDate, now),
          gte(table.endDate, now)
        )
      );

    return items;
  });
```

#### Admin Forms - Clarify Timezone to Users

```typescript
<DialogDescription>
  All dates and times are in Mountain Time (America/Boise).
</DialogDescription>

<Label htmlFor="endDate">End Date (MT)</Label>
<Input
  id="endDate"
  type="date"
  // ...
/>
<p className="text-xs text-muted-foreground">
  Hide after midnight Mountain Time
</p>
```

#### Countdown Timers

```typescript
/**
 * TIMEZONE NOTE: The endDateTime is in Mountain Time.
 * Countdown calculates absolute time remaining, which is timezone-agnostic.
 * All users see the same countdown regardless of their timezone.
 */
function calculateTimeRemaining(endDate: Date): TimeRemaining {
  const total = endDate.getTime() - new Date().getTime();
  // ... calculate days, hours, minutes, seconds
}
```

### 4. Database Storage

- **ALWAYS** store dates as UTC timestamps (standard SQL `integer({ mode: "timestamp" })`)
- **NEVER** store timezone-specific strings
- Convert to MT for comparisons, display to MT for admin/users

```typescript
// Schema
export const myTable = sqliteTable("my_table", {
  startDate: integer({ mode: "timestamp" }), // Stores UTC
  endDate: integer({ mode: "timestamp" }),   // Stores UTC
});

// Server action - compare in MT
const now = getCurrentMountainTime();
const active = await db.select()
  .from(myTable)
  .where(
    and(
      lte(myTable.startDate, now), // UTC stored, MT compared
      gte(myTable.endDate, now)
    )
  );
```

### 5. Code Comments

Add timezone clarity comments to time-sensitive code:

```typescript
/**
 * TIMEZONE: Uses Mountain Time (America/Boise) for all date comparisons.
 * Admin sets dates in MT, backend stores as UTC, comparisons use getCurrentMountainTime().
 */
export const myAction = createServerAction()
  .handler(async () => {
    const now = getCurrentMountainTime(); // Current time in MT
    // ...
  });
```

## Anti-Patterns (NEVER DO THIS)

❌ **DON'T use `new Date()` for business logic**
```typescript
const now = new Date(); // ← Wrong! User's timezone, not business timezone
```

✅ **DO use `getCurrentMountainTime()`**
```typescript
const now = getCurrentMountainTime(); // ← Correct! Business timezone
```

---

❌ **DON'T assume user's local time**
```typescript
const userTime = new Date().toLocaleString(); // ← Wrong! Varies by user
```

✅ **DO convert to Mountain Time for display**
```typescript
const mtTime = formatMountainTime(date, 'datetime'); // ← Correct! Consistent for all
```

---

❌ **DON'T store timezone-specific strings**
```typescript
// Schema - WRONG
endDate: text(), // "2025-03-15T14:00:00-07:00"
```

✅ **DO store UTC timestamps**
```typescript
// Schema - CORRECT
endDate: integer({ mode: "timestamp" }), // Stores as UTC timestamp
```

## Checklist

When implementing time-based features:

- [ ] Import `getCurrentMountainTime` or relevant timezone utilities
- [ ] Use MT utilities for all server-side date comparisons
- [ ] Add timezone clarification to admin UI (forms, descriptions)
- [ ] Add timezone comments to code (especially server actions)
- [ ] Store dates as UTC timestamps in database
- [ ] Convert to MT for business logic
- [ ] Test with users in different timezones to verify consistency

## Reference Files

- **Timezone utilities**: `src/utils/timezone.ts`
- **Example usage**:
  - `src/app/(storefront)/_actions/site-content.action.ts`
  - `src/app/(admin)/admin/delivery-settings/_actions/calendar-closures.action.ts`
- **Example admin UI**: `src/app/(admin)/admin/site-content/_components/`

## Summary

**Remember**: The business operates in Mountain Time. Every time-based feature must use Mountain Time utilities to ensure consistent, predictable behavior for all users regardless of their location. When in doubt, ask yourself: "Would this work correctly if the user was in Tokyo?" If the answer is no, you probably need to use Mountain Time utilities.
