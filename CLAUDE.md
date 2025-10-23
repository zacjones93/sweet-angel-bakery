# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**For additional project information, features, and setup instructions, refer to the README.md file in the project root.**

## Project Overview

Sweet Angel Bakery e-commerce platform - a Next.js application for online bakery orders, built on Cloudflare Workers with OpenNext. Features include product catalog, shopping cart, checkout, order management, and loyalty program.

**Based on**: [cloudflare-workers-nextjs-saas-template](https://github.com/LubomirGeorgiev/cloudflare-workers-nextjs-saas-template)

## Payment Provider

**IMPORTANT**: This application currently uses **Stripe** as the payment provider.

**Square SDK Limitation**: The Square Node.js SDK is not compatible with Cloudflare Workers Edge runtime. See `docs/square-edge-runtime-limitation.md` for details and workarounds.

**Current Configuration**:
- Payment provider: **Stripe** (Edge runtime compatible)
- Merchant provider abstraction supports both Stripe and Square
- To use Square, the provider would need to be rewritten using fetch API instead of the SDK

**Switching Providers**:
Set `MERCHANT_PROVIDER` in `.dev.vars`:
- `stripe` - Works out of the box (recommended for Edge runtime)
- `square` - Requires fetch-based implementation (SDK not compatible)

## Key Capabilities

- **E-commerce**: Product catalog, shopping cart, checkout with Stripe integration
- **Payment Processing**: Stripe Checkout, webhooks, and fee tracking
- **Order Management**: Admin dashboard for order fulfillment and status tracking
- **Loyalty Program**: Customer accounts with order history and early access to product drops
- **Product Drops**: Scheduled releases with loyalty member early access
- **Authentication**: Magic link login, profile management, notification preferences
- **Modern Stack**: Next.js 15, React Server Components, TypeScript, Tailwind CSS, Shadcn UI
- **Edge Computing**: Cloudflare Workers with D1 database, KV storage, R2 file storage
- **Email/SMS**: Order confirmations and notifications via Resend/Brevo and Twilio
- **Revenue Analytics**: Admin dashboard with fee tracking and provider comparison

You are an expert in TypeScript, Node.js, Next.js App Router, React, Shadcn UI, Radix UI, Tailwind CSS and DrizzleORM.

## Tech Stack

### Frontend

- Next.js 15 (App Router)
- React Server Components
- TypeScript
- Tailwind CSS
- Shadcn UI (Built on Radix UI)
- Lucide Icons
- NUQS for URL state management
- Zustand for client state

### Backend (Cloudflare Workers with OpenNext)

- DrizzleORM
- Cloudflare D1 (SQLite Database)
- Cloudflare KV (Session/Cache Storage)
- Cloudflare R2 (File Storage)
- OpenNext for SSR/Edge deployment

### Payment Processing

- **Square SDK** (`square@43.1.1`) - Primary payment provider
- Merchant provider abstraction layer in `src/lib/merchant-provider/`
- Fee tracking for revenue analytics
- Webhook handlers for order processing

### Authentication & Authorization

- Lucia Auth (User Management)
- Magic link authentication (passwordless)
- KV-based session management
- CUID2 for ID generation

## Key Architecture Patterns

### Route Organization (App Router)

- Route groups use `(groupName)` for layout organization without affecting URLs
- `(auth)/` - Authentication flows (magic link login, password reset)
- `(storefront)/` - Customer-facing pages (products, cart, checkout, profile, orders)
- `(admin)/` - Admin-only routes (orders, products, revenue stats)
- `(legal)/` - Terms, privacy policy

**Note**: Team-related routes (`(dashboard)/`, `teams/`) are part of the original template but not actively used in the bakery application.

### Server Actions Pattern (ZSA)

All server actions use ZSA (Zod Server Actions) for type safety:

```typescript
import { createServerAction } from "zsa"
import { z } from "zod"

export const myAction = createServerAction()
  .input(z.object({ ... }))
  .handler(async ({ input }) => { ... })
```

See `src/actions/` for examples.

### Merchant Provider Pattern

**CRITICAL**: Always use the merchant provider abstraction, never import Square or Stripe directly.

**Files**:
- `src/lib/merchant-provider/factory.ts` - Provider factory (use `getMerchantProvider()`)
- `src/lib/merchant-provider/types.ts` - Shared interfaces
- `src/lib/merchant-provider/providers/square.ts` - Square implementation
- `src/lib/merchant-provider/providers/stripe.ts` - Stripe implementation (reference only)
- `src/lib/merchant-provider/fee-calculator.ts` - Fee calculation utilities

**Usage**:
```typescript
import { getMerchantProvider } from "@/lib/merchant-provider/factory";

// In server actions or API routes
const provider = await getMerchantProvider();

// Provider selected based on MERCHANT_PROVIDER env var
// Current: 'square'
// Available methods: createCheckout, handleWebhook, createProduct, refundPayment, getPayment
```

**Environment Variables**:
```bash
# Required for Square
MERCHANT_PROVIDER=square
SQUARE_ACCESS_TOKEN=EAAAl...
SQUARE_LOCATION_ID=L...
SQUARE_ENVIRONMENT=sandbox  # or production
SQUARE_WEBHOOK_SIGNATURE_KEY=...
```

**Never do**:
- ❌ `import Stripe from 'stripe'`
- ❌ `import { Client } from 'square'`

**Always do**:
- ✅ `import { getMerchantProvider } from "@/lib/merchant-provider/factory"`

## Development Status

### Completed Features (Bakery-Specific)

- Product catalog with categories
- Shopping cart with size variant support
- Square payment integration (checkout, webhooks)
- Order management system with comprehensive status workflow
- Customer loyalty program with magic link login
- Product drops with early access for loyalty members
- Admin dashboard (orders, products, revenue analytics)
- Email/SMS notifications
- Merchant fee tracking and revenue reporting
- Profile management with notification preferences
- Product image uploads to Cloudflare R2

### Key Features

#### User Management

- Authentication (Lucia Auth)
- User profiles and settings
- Session management
- Admin panel with user/credit/transaction management
- Team management with role-based permissions

#### Multi-Tenancy

- Teams and organizations with unique slugs
- Role-based access control:
  - **System Roles**: owner, admin, member, guest (always available)
  - **Custom Roles**: Team-specific roles with granular permissions
- Permissions stored as JSON arrays in `teamRoleTable`
- Permission constants in `TEAM_PERMISSIONS` (src/db/schema.ts:176)
- Team invitations via email with expiring tokens
- Team settings and management
- Per-team billing and credit tracking

#### Billing & Subscriptions

- Credit-based billing system
- Credit packages and pricing
- Credit usage tracking
- Transaction history
- Monthly credit refresh
- Stripe payment processing

## Code Style and Structure

### General Principles

- Write concise, technical TypeScript code with accurate examples.
- Use functional and declarative programming patterns; avoid classes.
- Prefer iteration and modularization over code duplication.
- Use descriptive variable names with auxiliary verbs (e.g., isLoading, hasError).
- Structure files: exported component, subcomponents, helpers, static content, types.
- Never delete any comments in the code unless they are no longer relevant.

### Function Guidelines

- When a function has more than 1 parameter, always pass them as a named object.
- Use the "function" keyword for pure functions.
- Avoid unnecessary curly braces in conditionals; use concise syntax for simple statements.

### Import Guidelines

- Add `import "server-only"` at the top of the file (ignore this rule for page.tsx files) if it's only intended to be used on the server.
  - Use for utilities, database, and API clients (e.g., `src/db/index.ts`, `src/lib/stripe.ts`)
  - **DO NOT use** `"server-only"` for server action files
- When creating React server actions:
  - Use ZSA (Zod Server Actions) library
  - Add `"use server"` directive at the top of action files (NOT `"server-only"`)
  - Import `createServerAction` from "zsa"
  - In client components, use `import { useServerAction } from "zsa-react"`
  - Define input schemas with Zod for type safety
  - `"use server"` allows actions to be called from client components while executing on the server
  - Server-only imports (like `getDB()` and `getStripe()`) are fine inside action handlers

### Package Management

- Before adding any new packages, always check if we already have them in `package.json` to avoid duplicates.
- Use `pnpm` for all package management operations.
- Always use pnpm to install dependencies.

### Type Definitions

- When you have to add a global type, add it to `custom-env.d.ts` instead of `cloudflare-env.d.ts`, because otherwise it will be overridden by `pnpm run cf-typegen`.

## TypeScript Conventions

### Type Definitions

- Use TypeScript for all code; prefer interfaces over types.
- Avoid enums; use maps instead.
- Use functional components with TypeScript interfaces.

### Naming Conventions

- Use lowercase with dashes for directories (e.g., components/auth-wizard).
- Favor named exports for components.

### Syntax and Formatting

- Use declarative JSX.
- Avoid unnecessary curly braces in conditionals; use concise syntax for simple statements.

## UI and Styling

### Component Libraries

- Use Shadcn UI, Hero-UI, and Tailwind for components and styling.
- Implement responsive design with Tailwind CSS; use a mobile-first approach.
- Optimize for light and dark mode.

### Layout Guidelines

- When using a "container" class, use the "mx-auto" class to center the content.

### Performance Optimization

- Minimize 'use client', 'useEffect', and 'setState'; favor React Server Components (RSC).
- Wrap client components in Suspense with fallback.
- Use dynamic loading for non-critical components.
- Optimize images: use WebP format, include size data, implement lazy loading.

## Next.js Patterns

### Key Conventions

- Use 'nuqs' for URL search parameter state management.
- Optimize Web Vitals (LCP, CLS, FID).
- Follow Next.js docs for Data Fetching, Rendering, and Routing.

### Client Component Usage

Limit 'use client':

- Favor server components and Next.js SSR.
- Use only for Web API access in small components.
- Avoid for data fetching or state management.

### Performance Guidelines

- Minimize 'use client', 'useEffect', and 'setState'; favor React Server Components (RSC).
- Wrap client components in Suspense with fallback.
- Use dynamic loading for non-critical components.

## Authentication Guidelines

### Authentication Architecture

**Core Files:**

- `src/utils/auth.ts` - Main auth logic (Lucia Auth-based)
- `src/utils/kv-session.ts` - KV-based session storage
- `src/utils/webauthn.ts` - WebAuthn/Passkey support
- `src/utils/auth-utils.ts` - Helper utilities
- `src/state/session.ts` - Client-side session state (Zustand)

**Session Access Patterns:**

- **Server Components**: Use `getSessionFromCookie()` from `src/utils/auth.ts`
- **Client Components**: Use `useSessionStore()` from `src/state/session.ts`
- **Server Actions**: Use ZSA with auth procedures (see `src/actions/`)

**Session Structure:**
Sessions are stored in KV with:

- userId
- authenticationType (email, passkey, google)
- passkeyCredentialId (if passkey auth)
- device metadata (user agent, IP)
- expiresAt (30 days)
- version (for migration support)

## Database Patterns

The database schema is in `src/db/schema.ts`.

### Drizzle ORM Guidelines

**CRITICAL CONSTRAINTS:**

- NEVER use Drizzle ORM Transactions - Cloudflare D1 doesn't support them
- NEVER pass `id` when inserting/updating - all IDs are auto-generated with CUID2 prefixes:
  - Users: `usr_*`
  - Teams: `team_*`
  - Team Memberships: `tmem_*`
  - Team Roles: `trole_*`
  - Team Invitations: `tinv_*`
  - Credit Transactions: `ctxn_*`
  - Purchased Items: `pitem_*`
  - Passkey Credentials: `pkey_*`

### Migration Workflow

NEVER write SQL migration files manually. After editing `src/db/schema.ts`:

1. Run `pnpm db:generate [MIGRATION_NAME]`
2. Drizzle generates SQL in `src/db/migrations/`
3. Apply with `pnpm db:migrate:dev`

## Cloudflare Stack

### Current Bindings (in wrangler.jsonc)

- **D1 Database**: `NEXT_TAG_CACHE_D1` - Main database for users, teams, billing
- **KV Storage**: `NEXT_INC_CACHE_KV` - Session storage and caching
- **Durable Objects**: `NEXT_CACHE_DO_QUEUE` - Cache invalidation queue
- **Service Binding**: `WORKER_SELF_REFERENCE` - Self-reference for internal calls

### Adding New Cloudflare Primitives

When adding new bindings to `wrangler.jsonc`:

1. Edit `wrangler.jsonc` (add R2, AI, Queue, etc.)
2. **ALWAYS run `pnpm cf-typegen`** to regenerate types
3. Types written to `cloudflare-env.d.ts` (never edit manually)
4. Never create new KV namespaces - use existing `NEXT_INC_CACHE_KV`

### Accessing Cloudflare Bindings

- Use `getCloudflareContext()` to access bindings
- Import from `@opennextjs/cloudflare`
- Available in server components, API routes, and server actions

## State Management

- Server state with React Server Components
- Client state with Zustand where needed
- URL state with NUQS

## Security & Performance

- Edge computing with Cloudflare Workers
- React Server Components for performance
- Session-based auth with KV storage
- Rate limiting for API endpoints
- Input validation and sanitization
- Efficient data fetching and asset optimization

## Development Commands

### Local Development

```bash
pnpm install                    # Install dependencies
pnpm dev                        # Start development server (http://localhost:3000)
pnpm build                      # Build for production
pnpm lint                       # Run ESLint
pnpm build:analyze              # Build with bundle analyzer
```

### Database Operations

```bash
pnpm db:generate [NAME]         # Generate migration after schema changes (REQUIRED after editing schema.ts)
pnpm db:migrate:dev             # Apply migrations to local D1 database
pnpm cf-typegen                 # Regenerate Cloudflare types (REQUIRED after wrangler.jsonc changes)
```

### Cloudflare D1 & KV Operations

```bash
pnpm d1:cache:clean             # Clear D1 cache (tags and revalidations)
pnpm list:kv                    # List all KV keys to kv.log
pnpm delete:kv                  # Bulk delete KV keys from kv.log
wrangler d1 execute [DB_NAME] --command "[SQL]" --local    # Execute SQL locally
wrangler d1 execute [DB_NAME] --command "[SQL]" --remote   # Execute SQL in production
```

### Email Development

```bash
pnpm email:dev                  # Start email preview server (http://localhost:3001)
```

### Deployment

```bash
pnpm build:prod                 # Build for Cloudflare (dry run)
pnpm deploy                     # Deploy to Cloudflare Workers
pnpm preview                    # Preview build locally
```

### Wrangler CLI (Cloudflare)

The template uses wrangler for Cloudflare operations. Common commands:

```bash
wrangler types --env-interface CloudflareEnv ./cloudflare-env.d.ts  # Generate types
wrangler d1 migrations list [DB_NAME] --local                        # List migrations
wrangler kv key list --namespace-id=[ID] --remote                   # List KV keys
```

## Critical Development Workflows

### After Schema Changes

1. Edit `src/db/schema.ts`
2. Run `pnpm db:generate [MIGRATION_NAME]` (NEVER manually write SQL)
3. Run `pnpm db:migrate:dev` to apply locally

### After wrangler.jsonc Changes

1. Edit `wrangler.jsonc`
2. Run `pnpm cf-typegen` to regenerate types
3. Types are written to `cloudflare-env.d.ts` (auto-generated, don't edit manually)

### Working with Sessions

- Sessions stored in Cloudflare KV (not D1)
- Session cookie format: `userId:token`
- Session data includes auth type, device info, permissions
- Access via `getSessionFromCookie()` in server components
- Access via `useSessionStore()` in client components

## Terminal Commands

In the terminal, you are also an expert at suggesting wrangler commands.
