# Sweet Angel Bakery

E-commerce platform for Sweet Angel Bakery built on Cloudflare Workers with Next.js 15. Features customer storefront, admin management, delivery tracking, loyalty program, and integrated payment processing.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, Shadcn UI
- **Backend**: Cloudflare Workers with OpenNext, Drizzle ORM, Cloudflare D1 (SQLite)
- **Storage**: Cloudflare KV (sessions/cache), R2 (product images), Durable Objects (cache queue)
- **Payments**: Square SDK, Stripe (fallback)
- **Auth**: Lucia Auth patterns, WebAuthn/Passkeys, Google OAuth
- **Email**: React Email with Resend/Brevo

## Features

### Customer Storefront
- 🛒 Product browsing with categories and customization options
- 🛍️ Shopping cart with product customizations
- 💳 Secure checkout with Square/Stripe payment processing
- 📧 Magic link authentication for customers
- 🎁 Loyalty program signup with phone verification
- 📦 Order tracking and history
- 🗺️ Delivery scheduling with Google Maps integration
- 📱 Responsive design for mobile and desktop

### Admin Dashboard
- 📊 Order management and fulfillment tracking
- 🍰 Product catalog management with customization options
- 📦 Inventory tracking and stock management
- 🚚 Delivery route optimization and ETA tracking
- 📈 Revenue analytics with date range filtering
- 📅 Calendar closures management
- 👥 Customer and user management
- 💰 Transaction history and reporting
- 🔄 Square product sync utilities

### Authentication & Security

- 🔐 Email/Password authentication
- 🔑 WebAuthn/Passkey support
- 🌐 Google OAuth/SSO integration
- 🗝️ Session management with Cloudflare KV
- 🤖 Turnstile CAPTCHA integration
- ⚡ Rate limiting for auth endpoints
- 🛡️ Protected admin routes
- 🔒 Anti-disposable email protection

### Developer Experience
- 📘 Full TypeScript support with type-safe queries
- 🏗️ Drizzle ORM with automatic migrations
- 💻 SQLite for local development, D1 for production
- 🚀 Automated deployment with GitHub Actions
- 📨 Email template preview server
- 🔍 ESLint and type checking
- 📚 Comprehensive documentation (CLAUDE.md)

## Local Development

1. Install dependencies:
```bash
pnpm install
```

2. Set up environment variables:
   - Copy `.dev.vars.example` to `.dev.vars` and fill in Cloudflare credentials and API keys
   - Copy `.env.example` to `.env` and fill in public keys (Turnstile, Square, Stripe, Google OAuth, email service)

3. Create and migrate local database:
```bash
pnpm db:migrate:dev
```

4. Start development server:
```bash
pnpm dev
```

5. Open http://localhost:3000

### Additional Development Commands

```bash
pnpm db:studio              # Open Drizzle Studio to visualize database
pnpm email:dev              # Preview email templates at localhost:3001
pnpm scrape:products        # Scrape products from external source
pnpm sync:square            # Sync products with Square
pnpm import:square          # Import products from Square
```

## Database Management

The project uses Drizzle ORM with Cloudflare D1 (SQLite).

### Making Schema Changes

1. Edit the schema in `src/db/schema.ts`
2. Generate a migration:
```bash
pnpm db:generate migration-name
```
3. Apply migration locally:
```bash
pnpm db:migrate:dev
```
4. Apply migration to production:
```bash
pnpm db:migrate:prod
```

### Viewing Database

Use Drizzle Studio to visually explore the database:
```bash
pnpm db:studio
```

**Important**: After making changes to `wrangler.jsonc`, run `pnpm cf-typegen` to regenerate Cloudflare types.

## Deployment

The project uses GitHub Actions for automated deployment to Cloudflare Workers. Pushes to the `main` branch trigger:

1. Type checking and linting
2. Database migration (local test)
3. OpenNext build for Cloudflare
4. Deployment to Cloudflare Workers
5. Production database migration
6. CDN cache purge

### Required Cloudflare Resources

- D1 Database: `sweet-angel-bakery`
- KV Namespace: Session and cache storage
- R2 Bucket: `product-images`
- Durable Object: Cache queue

### Required Secrets & Variables

**Cloudflare Worker Secrets:**
- `RESEND_API_KEY` or `BREVO_API_KEY` (email service)
- `TURNSTILE_SECRET_KEY` (CAPTCHA verification)
- `SQUARE_ACCESS_TOKEN`, `SQUARE_APPLICATION_ID` (payment processing)
- `STRIPE_SECRET_KEY` (optional, fallback payment)
- `GOOGLE_OAUTH_CLIENT_SECRET` (SSO)

**GitHub Actions Variables:**
- `CLOUDFLARE_API_TOKEN` (secret)
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_ZONE_ID` (optional, for cache purging)
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Authentication flows
│   ├── (storefront)/        # Customer-facing pages
│   ├── (admin)/admin/       # Admin dashboard
│   ├── (settings)/settings/ # User settings
│   └── api/                 # API routes and webhooks
├── db/
│   ├── schema.ts            # Database schema
│   └── migrations/          # SQL migrations
├── lib/
│   └── merchant-provider/   # Payment provider abstraction
├── components/
│   └── ui/                  # Shadcn UI components
├── utils/                   # Core utilities
├── actions/                 # Server actions
├── schemas/                 # Zod validation schemas
├── state/                   # Zustand stores
└── react-email/             # Email templates
```

## Key Architectural Patterns

- **Server Actions**: Type-safe with ZSA and Zod validation
- **Merchant Provider Factory**: Abstracted payment processing (Square/Stripe)
- **KV Session Storage**: Edge-optimized session management
- **Product Customizations**: Flexible addon system with price adjustments
- **Delivery System**: Timezone-aware scheduling with route optimization

For detailed development guidance, see [CLAUDE.md](./CLAUDE.md).
