# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**For additional project information, features, and setup instructions, refer to the README.md file in the project root.**

## Project Overview

This is a comprehensive, production-ready Next.js SaaS template designed to run on Cloudflare Workers with OpenNext. It includes authentication, team management, billing, and other common SaaS features needed to launch a modern web application.

**Live Demo**: [nextjs-saas-template.lubomirgeorgiev.com](https://nextjs-saas-template.lubomirgeorgiev.com/sign-up)

**GitHub Repository**: [cloudflare-workers-nextjs-saas-template](https://github.com/LubomirGeorgiev/cloudflare-workers-nextjs-saas-template)

## Key Capabilities

- **Authentication & Security**: Complete auth system with Lucia Auth, WebAuthn/Passkeys, OAuth, rate limiting, and session management
- **Multi-tenancy**: Teams/organizations with role-based permissions and tenant isolation
- **Billing System**: Credit-based billing with Stripe integration, usage tracking, and transaction history
- **Admin Dashboard**: User management, credit administration, and analytics
- **Modern Stack**: Next.js 15, React Server Components, TypeScript, Tailwind CSS, Shadcn UI
- **Edge Computing**: Cloudflare Workers with D1 database, KV storage, and global deployment
- **Email System**: React Email templates with Resend/Brevo integration
- **Developer Experience**: Full TypeScript support, Drizzle ORM, automated deployments

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

### Authentication & Authorization

- Lucia Auth (User Management)
- KV-based session management
- CUID2 for ID generation
- Team-based multi-tenancy

## Key Architecture Patterns

### Route Organization (App Router)

- Route groups use `(groupName)` for layout organization without affecting URLs
- `(auth)/` - Authentication flows (sign-in, sign-up, OAuth, passkeys)
- `(dashboard)/` - Main application features
- `(admin)/` - Admin-only routes with special guards
- `(settings)/` - User settings and preferences
- `(legal)/` - Terms, privacy policy
- `(marketing)/` - Public landing pages
- `teams/[teamSlug]/` - Dynamic team-scoped routes

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

### Team Authorization Flow

1. User's team memberships fetched via `getUserTeamsWithPermissions(userId)`
2. Permissions resolved from either system roles or custom roles
3. Check permissions with constants from `TEAM_PERMISSIONS` enum
4. Team context passed through server actions and components

## Development Status

### Completed Features

- Infrastructure setup (Next.js, Cloudflare Workers, D1, KV)
- Authentication system (Lucia Auth)
- User management and settings
- Session management with KV storage
- Dashboard layout with navigation
- Password reset flow
- Email system with templates
- Security enhancements (rate limiting, input sanitization)
- Credit-based billing system
- Stripe payment processing
- Multi-tenancy implementation
- Team management with roles and permissions
- Admin dashboard

### In Progress

- Real-time updates
- Analytics dashboard
- File upload system with R2
- Audit logging

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
