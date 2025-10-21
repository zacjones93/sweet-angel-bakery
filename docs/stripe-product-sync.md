# Stripe Product Sync Guide

This guide explains how to sync database products to Stripe using the automated sync script.

## Overview

The Stripe sync script (`scripts/sync-stripe.mjs`) automatically creates Stripe products and prices for items in your database that don't have Stripe IDs yet. It's smart enough to skip products that are already synced, making it safe to run multiple times.

## When to Use This Script

Run the sync script when:

- You've added new products to the database manually (via SQL migrations or admin panel)
- Products in the database are missing `stripeProductId` or `stripePriceId`
- You need to ensure all database products exist in Stripe
- You're setting up the application for the first time

## Prerequisites

### 1. Stripe Account Setup

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your API keys from [Dashboard > Developers > API Keys](https://dashboard.stripe.com/apikeys)
3. Use **test mode** for development, **live mode** for production

### 2. Configure Stripe Secret Key

Add your Stripe secret key to one of these files:

**`.env.local`** (recommended for local development):
```bash
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
```

**`.dev.vars`** (alternative):
```bash
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
```

**`.env`** (fallback):
```bash
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
```

⚠️ **Never commit your secret key to git!** All these files are gitignored.

### 3. Database Setup

Make sure you have:
- Applied all database migrations: `pnpm db:migrate:dev`
- Products in the database (via admin panel or SQL)
- Wrangler CLI installed and configured

## Usage

### Basic Usage

Run the sync script:

```bash
pnpm scrape:sync-stripe
```

Or directly:

```bash
pnpm tsx scripts/sync-stripe.mjs
```

### What It Does

The script performs these steps:

1. **Loads Stripe API key** from environment files
2. **Queries local D1 database** for products without Stripe IDs
3. **For each product**:
   - Creates a Stripe product with name, description, and image
   - Creates a default Stripe price (uses `price` field from database)
   - Updates the database record with `stripeProductId` and `stripePriceId`
4. **Reports summary** of synced/failed/total products

### Smart Skip Logic

The script automatically skips products that:
- Already have a `stripeProductId` set
- Have `stripeProductId` as empty string

This means you can safely run the script multiple times without creating duplicates.

## Example Output

```bash
Starting Stripe sync from database...

Fetching products without Stripe IDs...
Found 12 products to sync

Processing: Chocolate Chip Cookie (prod_abc123)
  ✓ Stripe product created: prod_Qx7y8z9ABC
  ✓ Stripe price created: price_1Px2Qy3ABC
  ✓ Database updated

Processing: Red Velvet Cake (prod_def456)
  ✓ Stripe product created: prod_Rx8z9a0DEF
  ✓ Stripe price created: price_1Qy3Rz4DEF
  ✓ Database updated

...

==================================================
Sync Summary:
  Synced: 12
  Failed: 0
  Total:  12
==================================================
```

## Database Schema

Products in the database must have:

```sql
CREATE TABLE product (
  id TEXT PRIMARY KEY,           -- e.g., "prod_abc123"
  name TEXT NOT NULL,            -- Product name
  description TEXT,              -- Optional description
  price INTEGER NOT NULL,        -- Price in cents (e.g., 2500 = $25.00)
  imageUrl TEXT,                 -- Optional image path
  categoryId TEXT NOT NULL,      -- Category reference
  stripeProductId TEXT,          -- Populated by sync script
  stripePriceId TEXT,            -- Populated by sync script
  ...
);
```

## Stripe Product Configuration

When creating Stripe products, the script sets:

- **Name**: From `product.name`
- **Description**: From `product.description` (if exists)
- **Images**: Converts `product.imageUrl` to full URL (if exists)
- **Metadata**:
  - `dbProductId`: Database product ID for reference
  - `categoryId`: Database category ID

### Price Configuration

Default prices are created with:

- **Amount**: From `product.price` (in cents)
- **Currency**: USD
- **Type**: One-time payment

## Advanced Usage

### Syncing Specific Products

To sync only specific products, modify the SQL query in the script:

```javascript
const products = queryD1(
  'SELECT ... FROM product WHERE id IN (\'prod_abc123\', \'prod_def456\')'
);
```

### Updating Existing Stripe Products

To force re-sync existing products:

1. Clear the Stripe IDs in the database:
   ```sql
   UPDATE product SET stripeProductId = NULL, stripePriceId = NULL
   WHERE id = 'prod_abc123';
   ```

2. Run the sync script:
   ```bash
   pnpm scrape:sync-stripe
   ```

⚠️ This will create new Stripe products. Old ones won't be deleted automatically.

### Remote Database Sync

To sync products in production (remote D1):

1. Modify the script to use `--remote` instead of `--local`:
   ```javascript
   // In queryD1 and updateD1 functions:
   wrangler d1 execute ${DB_NAME} --remote --command ...
   ```

2. Run the script:
   ```bash
   pnpm scrape:sync-stripe
   ```

## Complete Product Setup Workflow

### Option 1: Scrape from Squarespace

If migrating from Squarespace:

```bash
# 1. Scrape products from Squarespace
pnpm scrape:products

# 2. Sync to Stripe
pnpm scrape:sync-stripe

# 3. Generate SQL migration
pnpm scrape:generate-sql

# Or run all at once:
pnpm scrape:all
```

### Option 2: Manual Database Entry

If adding products manually:

```bash
# 1. Add products via admin panel or SQL migration
# 2. Run Stripe sync
pnpm scrape:sync-stripe
```

## Troubleshooting

### "STRIPE_SECRET_KEY not found"

**Solution**: Add your Stripe secret key to `.env.local`:
```bash
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
```

### "D1 query failed"

**Causes**:
- Database not migrated
- Wrangler not configured
- Wrong database name

**Solution**:
```bash
# Check database name in wrangler.jsonc
cat wrangler.jsonc | grep database_name

# Apply migrations
pnpm db:migrate:dev

# List databases
pnpm wrangler d1 list
```

### "Stripe API error: Invalid request"

**Causes**:
- Invalid Stripe API key
- Using test key in live mode (or vice versa)
- Missing required product fields

**Solution**:
- Verify API key in Stripe Dashboard
- Check you're using the correct mode (test/live)
- Ensure products have `name` and `price` fields

### Products Already Exist in Stripe

If you accidentally created duplicate products in Stripe:

**Option A**: Delete duplicates in Stripe Dashboard
1. Go to [Stripe Products](https://dashboard.stripe.com/products)
2. Archive or delete duplicate products
3. Clear database IDs: `UPDATE product SET stripeProductId = NULL WHERE ...`
4. Re-run sync script

**Option B**: Manually update database
1. Find the Stripe product ID you want to use
2. Update database:
   ```sql
   UPDATE product
   SET stripeProductId = 'prod_xxxxx', stripePriceId = 'price_xxxxx'
   WHERE id = 'prod_abc123';
   ```

### Script Hangs or Takes Too Long

**Cause**: Syncing many products sequentially

**Solution**: The script processes products one at a time to avoid rate limits. For 50+ products, expect 1-2 minutes.

## Code Structure

### Key Files

- **`scripts/sync-stripe.mjs`** - Main sync script
- **`src/lib/stripe.ts`** - Stripe client configuration
- **`src/db/schema.ts`** - Database schema (product table)
- **`wrangler.jsonc`** - Database configuration

### Script Functions

```javascript
// Load Stripe API key from env files
async function loadEnv()

// Execute D1 query and return results
function queryD1(sql)

// Execute D1 update command
function updateD1(sql)

// Main sync function
async function syncToStripe()
```

## Security Considerations

- **Never commit** `.env.local`, `.dev.vars`, or `.env` files
- Use **test mode keys** (`sk_test_`) for development
- Use **live mode keys** (`sk_live_`) only for production
- Restrict API key permissions in Stripe Dashboard
- Run local syncs with `--local` flag to avoid affecting production

## Stripe Dashboard

After syncing, verify in Stripe Dashboard:

1. Go to [Products](https://dashboard.stripe.com/products)
2. You should see all synced products
3. Click a product to verify:
   - Name matches database
   - Description is set
   - Image is visible
   - Price is correct
   - Metadata contains `dbProductId` and `categoryId`

## Next Steps

After syncing products to Stripe:

1. **Test checkout flow** in your application
2. **Configure Stripe webhooks** for payment events
3. **Set up tax rates** in Stripe if needed
4. **Enable payment methods** (cards, Apple Pay, etc.)
5. **Test in Stripe test mode** before going live

## Related Documentation

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Image Upload Setup](./image-upload-setup.md)
- [Product Customizations](./product-customizations.md)
- [Order Status System](./order-status-system.md)

## Support

If you encounter issues:

1. Check Stripe Dashboard for error details
2. Review database schema matches expected structure
3. Verify Wrangler CLI is properly configured
4. Check Cloudflare D1 database exists and has data
5. Review script output for specific error messages
