# Product Scraping Scripts

This directory contains scripts for scraping products from Squarespace, syncing them to Stripe, and generating SQL migrations.

## Overview

The workflow consists of three main scripts:

1. **scrape-products.mjs** - Scrapes product data from Squarespace
2. **sync-stripe.mjs** - Creates Stripe products and prices
3. **generate-product-sql.mjs** - Generates SQL migration file

## Quick Start

### Option 1: Run All Steps

```bash
pnpm scrape:all
```

This runs all three scripts sequentially.

### Option 2: Run Individual Steps

```bash
# Step 1: Scrape products (optional - only if migrating from Squarespace)
pnpm scrape:products

# Step 2: Generate SQL migration
pnpm scrape:generate-sql

# Step 3: Apply migration to database
pnpm db:migrate:dev

# Step 4: Sync products to Stripe (requires STRIPE_SECRET_KEY)
pnpm scrape:sync-stripe
```

**Note:** The sync-stripe script now reads from the database, so run it AFTER migrating products to the database.

## Script Details

### 1. scrape-products.mjs

Scrapes product data from the Squarespace shop page.

**What it does:**
- Navigates to the shop page using Playwright
- Extracts product names, prices, descriptions, and variants
- Downloads product images to `public/assets/products/`
- Saves data to `scripts/scraped-products.json`

**Note:** Currently uses manually curated product data since the Squarespace site structure requires admin access.

### 2. sync-stripe.mjs

Syncs database products to Stripe and updates them with Stripe IDs.

**Requirements:**
- Stripe secret key (set in `.env.local`, `.dev.vars`, or as environment variable)
- Get your key from: https://dashboard.stripe.com/apikeys
- Products in the local D1 database
- Wrangler CLI configured

**What it does:**
- Queries local D1 database for products without Stripe IDs
- Creates Stripe product for each item
- Creates default Stripe price
- Updates database with `stripeProductId` and `stripePriceId`
- Smart skip: Only syncs products missing Stripe IDs (safe to run multiple times)

**Setup:**

```bash
# Create .env.local and add your Stripe key
echo "STRIPE_SECRET_KEY=sk_test_..." > .env.local
```

**See also:** [Detailed documentation](../docs/stripe-product-sync.md)

### 3. generate-product-sql.mjs

Generates SQL migration file for seeding the database.

**What it does:**
- Reads products from `scripts/products-with-stripe.json` (or falls back to `scraped-products.json`)
- Generates INSERT statements with category mappings
- Handles product variants by creating separate products
- Saves to `src/db/migrations/0011_seed_products.sql`

**Category Mapping:**
- `cookie-gift-box` → `cat_2tdLW2HVrEFaYPg1vxdKKD`
- `cookies` → `cat_2tdLW2HVrEFaYPg1vxdKKC`
- `cakes` → `cat_2tdLW2HVrEFaYPg1vxdKKE`
- `custom-cakes` → `cat_2tdLW2HVrEFaYPg1vxdKKF`

## Data Files

- `scraped-products.json` - Raw product data (with or without images)
- `src/db/migrations/0011_seed_products.sql` - Generated SQL migration
- Database: Stripe IDs stored in `product.stripeProductId` and `product.stripePriceId` columns

## Product Structure

```json
{
  "name": "Product Name",
  "description": "Product description",
  "categorySlug": "cookies",
  "price": 400,
  "imageUrl": "/assets/products/product-name.jpg",
  "variants": ["6\"", "9\""],
  "status": "active"
}
```

## Current Products

1. **Cookie Gift Box** ($18.00) - Cookie gift box category
2. **Whiskey Rye Salted Chocolate Chip Cookie** ($4.00) - Cookies
3. **Cinnamon Roll Cookie** ($4.00) - Cookies
4. **Cowboy Cookie** ($4.00) - Cookies
5. **Treasure Cookie** ($4.00) - Cookies
6. **GA Bar** ($4.00) - Cookies
7. **Banana Chocolate Chip Cake** (from $45.00) - Cakes, 2 variants (6", 9")
8. **Oreo Chocolate Cake** (from $45.00) - Cakes, 2 variants (6", 9")
9. **Custom Cake** ($0.00) - Custom cakes

## Adding Images

To add product images:

1. Place images in `public/assets/products/`
2. Update `scraped-products.json` with image paths:
   ```json
   "imageUrl": "/assets/products/cookie-gift-box.jpg"
   ```
3. Re-run `pnpm scrape:generate-sql`
4. Apply migration with `pnpm db:migrate:dev`

## Troubleshooting

### Stripe Sync Fails

Make sure you have set `STRIPE_SECRET_KEY` in one of:
- `.env.local`
- `.dev.vars`
- Environment variable

### Migration Already Exists

If you need to regenerate the migration:

```bash
# Remove old migration
rm src/db/migrations/0011_seed_products.sql

# Regenerate
pnpm scrape:generate-sql

# Apply
pnpm db:migrate:dev
```

### No Products Scraped

The scraper currently uses manually curated data. If you need to scrape fresh:

1. Make sure the Squarespace site is accessible
2. Update the `SHOP_URL` in `scrape-products.mjs`
3. Run `pnpm scrape:products`

## Future Enhancements

- [ ] Automated image downloading from Squarespace
- [ ] Support for product collections/tags
- [ ] Inventory level syncing
- [ ] Product update script (not just initial seed)
- [ ] Webhook handler for Stripe product updates
