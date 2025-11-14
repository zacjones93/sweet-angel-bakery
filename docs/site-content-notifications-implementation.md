# Site Content: Dynamic Notifications & Sales Banner Implementation

**Created**: 2025-11-14
**Status**: Completed
**Commit SHA**: `c6ef749`

## Overview

Implementation of two dynamic content features for the Sweet Angel Bakery storefront:
1. **Home Notification Section**: Configurable announcement/notification displayed between hero and featured products
2. **Sticky Sales Banner**: Top-of-page banner with countdown timer, scrolling message, and optional CTA

## Requirements

### Home Notification Section
- Display location: Between hero section and featured products on homepage
- Fields: Title, message, optional image
- Admin configurable with active/inactive toggle
- Support date range scheduling (optional start/end dates)
- Architecture supports future multiple notifications (currently shows single)

### Sales Banner
- Sticky positioning at top of page
- Countdown timer to configurable date/time
- Scrolling message text
- Customizable colors (background/text)
- Optional CTA button with link
- **Admin-configurable dismissibility** (can be marked as dismissible or always-visible)
- When dismissible: Uses localStorage to remember dismissed state per banner

## Architecture Decisions

### Database Design

**Single notification approach** (with future-proofing):
- Schema includes `displayOrder` field for future multi-notification support
- Currently shows highest priority active notification
- Easy to extend to carousel/stack in future

**Sales banner**:
- Single active banner at a time (latest active one)
- Dismissibility is configurable per banner (not hardcoded)
- localStorage tracks dismissed banners by ID

### Component Structure

**Server Components** (default):
- Home notification section (fetches active notification)
- Admin page layouts

**Client Components** (where needed):
- Sales banner (countdown timer, dismissible state, animations)
- Countdown timer (real-time updates)
- Admin forms (React Hook Form)
- Admin tables (interactive data tables)

## Implementation Plan

### Phase 1: Database Schema & Migrations

**File**: `src/db/schema.ts`

Add two tables:

```typescript
// Home notification table
export const homeNotificationTable = sqliteTable("home_notification", {
  ...commonColumns,
  id: text().primaryKey().$defaultFn(() => `hnot_${createId()}`),
  title: text({ length: 255 }).notNull(),
  message: text({ length: 2000 }).notNull(),
  imageUrl: text({ length: 600 }), // Optional
  isActive: integer().default(1).notNull(), // 1=active, 0=inactive
  displayOrder: integer().default(0).notNull(), // For future multi-notification
  startDate: integer({ mode: "timestamp" }), // Optional scheduling
  endDate: integer({ mode: "timestamp" }),
});

// Sales banner table
export const salesBannerTable = sqliteTable("sales_banner", {
  ...commonColumns,
  id: text().primaryKey().$defaultFn(() => `sban_${createId()}`),
  message: text({ length: 500 }).notNull(),
  backgroundColor: text({ length: 50 }).default('#ef4444').notNull(),
  textColor: text({ length: 50 }).default('#ffffff').notNull(),
  endDateTime: integer({ mode: "timestamp" }).notNull(), // Countdown target
  isActive: integer().default(1).notNull(),
  isDismissible: integer().default(1).notNull(), // Admin configurable
  ctaText: text({ length: 100 }), // Optional
  ctaLink: text({ length: 500 }), // Optional
});
```

**Migration commands**:
```bash
pnpm db:generate site-content
pnpm db:migrate:dev
```

### Phase 2: Server Actions

#### Admin Actions - Home Notifications
**File**: `src/app/(admin)/admin/site-content/_actions/home-notifications.action.ts`

```typescript
"use server"
import { createServerAction } from "zsa";
import { requireAdmin } from "@/utils/auth";
// Actions: list, create, update, delete, toggleActive
```

#### Admin Actions - Sales Banner
**File**: `src/app/(admin)/admin/site-content/_actions/sales-banner.action.ts`

```typescript
"use server"
import { createServerAction } from "zsa";
import { requireAdmin } from "@/utils/auth";
// Actions: get, upsert, delete (single banner approach)
```

#### Public Storefront Actions
**File**: `src/app/(storefront)/_actions/site-content.action.ts`

```typescript
"use server"
import { createServerAction } from "zsa";
// Actions: getActiveNotification, getActiveBanner (no auth required)
```

### Phase 3: Admin Panel UI

#### File Structure
```
src/app/(admin)/admin/site-content/
├── page.tsx                              # Main page with tabs
├── _components/
│   ├── site-content-tabs.tsx            # Tab wrapper
│   ├── notifications-table.tsx          # List/manage notifications
│   ├── notification-form-dialog.tsx     # Create/edit dialog
│   └── sales-banner-form.tsx            # Banner management form
└── _actions/
    ├── home-notifications.action.ts     # CRUD for notifications
    └── sales-banner.action.ts           # CRUD for banner
```

#### Components
- **Notifications Table**: Display all notifications, toggle active, edit/delete actions
- **Notification Form**: Title, message textarea, image upload (R2), date pickers, active toggle
- **Sales Banner Form**: Message, color pickers, datetime picker, CTA fields, dismissible toggle

#### Navigation Update
Add "Site Content" link to admin navigation (alongside Orders, Products, etc.)

### Phase 4: Storefront Components

#### Reusable Components

**File**: `src/components/countdown-timer.tsx`
- Client component
- Real-time countdown to target date
- Format: "2d 5h 23m" or "Ends in 2 hours"
- Handles timezone properly

**File**: `src/app/(storefront)/_components/home-notification-section.tsx`
- Server component
- Fetches active notification
- Displays title, message, optional image
- Matches existing section styling (`py-20`, card pattern)

**File**: `src/app/(storefront)/_components/sales-banner.tsx`
- Client component
- Sticky positioning (`fixed top-0 z-50`)
- Scrolling text animation (CSS marquee)
- Countdown timer integration
- Optional CTA button
- Dismissible logic (localStorage by banner ID)
- Smooth fade-out animation

#### Page Updates

**File**: `src/app/(storefront)/page.tsx`
- Add notification section between hero and featured products
- Fetch active notification via server action

**File**: `src/app/layout.tsx` (or storefront layout)
- Add sales banner at top
- Fetch active banner data
- Pass to banner component

### Phase 5: Styling & Polish

#### Sales Banner
- Fixed positioning: `fixed top-0 left-0 right-0 z-50`
- Animated scrolling: CSS `@keyframes marquee` or framer-motion
- Color customization: Apply admin-configured colors
- Responsive design: Stack countdown/CTA on mobile

#### Home Notification Section
- Section spacing: `py-20` (matches existing sections)
- Card styling: `bg-card border rounded-lg p-6`
- Image: Optional, displayed alongside text or above
- Gradient background option: `bg-gradient-to-b from-bakery-pink/30`

#### Countdown Timer
- Clear typography hierarchy
- Format options based on time remaining
- "Expired" state handling

## Technical Considerations

### Image Upload
- Use existing `/api/upload-image` endpoint
- Store in `PRODUCT_IMAGES` R2 bucket
- Validate: jpeg/jpg/png/webp, max 5MB
- Return relative URL: `/api/images/${key}`

### LocalStorage Pattern (Dismissible Banner)
- Key format: `dismissed-banner-${bannerId}`
- Store dismissed state with timestamp
- Clear on banner ID change
- Handle hydration properly (avoid SSR mismatch)

### Date/Time Handling
- Use timezone utilities from `src/utils/timezone.ts`
- Store as UTC timestamps
- Display in user's local timezone
- Countdown updates every second (client-side)

### Performance
- Server Components for data fetching
- Client Components only where necessary (interactivity)
- Optimize images via Next.js Image component
- Cache active notification/banner queries

## Future Enhancements

### Multiple Notifications (Future)
- Already architected with `displayOrder` field
- Implementation steps:
  1. Update query to return all active notifications
  2. Build carousel/stack component
  3. Add navigation controls
  4. Update admin UI for reordering

### Advanced Scheduling
- Recurring notifications (weekly announcements)
- Timezone-specific targeting
- User segment targeting (loyalty members only)

### Analytics
- Track notification views
- Track banner dismissal rates
- Track CTA click-through rates

## Testing Checklist

- [ ] Create notification via admin panel
- [ ] Upload image to notification
- [ ] Schedule notification with date range
- [ ] Toggle notification active/inactive
- [ ] Create sales banner with countdown
- [ ] Test dismissible vs. always-visible banner
- [ ] Verify localStorage persistence
- [ ] Test countdown timer accuracy
- [ ] Test CTA button navigation
- [ ] Test responsive design (mobile/tablet/desktop)
- [ ] Verify admin auth protection
- [ ] Test image upload edge cases
- [ ] Verify database migrations apply correctly

## Migration Path

1. Run schema migration: `pnpm db:migrate:dev`
2. Deploy admin UI (accessible to admins only)
3. Create initial content via admin panel
4. Deploy storefront components
5. Test on staging/preview
6. Deploy to production
7. Monitor for issues

## Rollback Plan

If issues occur:
1. Toggle `isActive` to 0 in database (immediate hide)
2. Revert layout changes (remove banner/notification components)
3. Remove database tables if necessary (after backing up data)

## Related Files

- `src/db/schema.ts` - Database schema
- `src/utils/upload-image.ts` - Image upload utility
- `src/utils/timezone.ts` - Timezone utilities
- `src/app/(storefront)/page.tsx` - Homepage
- `src/app/layout.tsx` - Root layout

---

## Implementation Commit

**Commit SHA**: `c6ef749`

**Changes**:
- Added database schema for notifications and sales banner (2 new tables)
- Created admin panel `/admin/site-content` with tabbed interface
- Implemented server actions for admin (CRUD) and storefront (read-only)
- Created storefront display components with responsive design
- Added countdown timer component with real-time updates
- Integrated image upload for notifications via existing R2 bucket
- Updated admin navigation to include "Site Content" menu item
- Applied database migration (0022_add_site_content_tables.sql)
- 17 files changed, 1914+ lines added
