# Importing Products from Square

This guide explains how to import existing products from your Square Catalog into the database.

## Overview

The `import-from-square.mjs` script fetches all items from your Square Catalog and creates/updates them in your local database. This is useful when:

- You already have products in Square and want to sync them to your app
- You've made changes in Square Dashboard and want to pull them into the app
- You're setting up the app for the first time with existing Square inventory

## Usage

### Step 1: Edit the Script Configuration

Open `scripts/import-from-square.mjs` and edit the `CONFIG` section at the top:

```javascript
const CONFIG = {
  // Your Square Access Token (get from Square Dashboard > Developer > Applications)
  accessToken: 'EAAAl...YOUR_TOKEN_HERE',

  // Your Square Location ID (get from Square Dashboard > Locations)
  locationId: 'L...YOUR_LOCATION_ID',

  // Environment: 'production' or 'sandbox'
  environment: 'production',

  // Category ID (optional - auto-detects "Cookies" if not set)
  categoryId: 'cat_abc123', // or null
};
```

**Where to find these values:**
- **Access Token**: Square Dashboard > Developer > Applications > Your App > Production/Sandbox
- **Location ID**: Square Dashboard > Locations > Click your location
- **Category ID**: Run `wrangler d1 execute sweet-angel-bakery --command "SELECT id, name FROM category" --remote`

### Step 2: Preview Changes (Dry Run)

Test the import without making changes to LOCAL database:

```bash
pnpm tsx scripts/import-from-square.mjs --dry-run
```

Or preview PRODUCTION database changes:

```bash
pnpm tsx scripts/import-from-square.mjs --remote --dry-run
```

### Step 3: Run the Import

**Import to LOCAL database:**

```bash
pnpm tsx scripts/import-from-square.mjs
```

**Import to PRODUCTION database:**

```bash
pnpm tsx scripts/import-from-square.mjs --remote
```

⚠️ **WARNING**: Using `--remote` will modify your production database! The script will give you a 5-second warning before proceeding.

### Step 4: Delete Your Credentials

**IMPORTANT**: After successfully importing, delete your credentials from the CONFIG section:

```javascript
const CONFIG = {
  accessToken: 'YOUR_SQUARE_ACCESS_TOKEN_HERE',
  locationId: 'YOUR_LOCATION_ID_HERE',
  environment: 'production',
  categoryId: null,
};
```

## What Gets Imported

For each Square item, the script imports:

- ✅ **Product name** (from Square item name)
- ✅ **Description** (from Square item description)
- ✅ **Price** (from first variation's price)
- ✅ **Square IDs** (item ID and variation ID stored in `merchantProductId` and `merchantPriceId`)
- ⚠️ **Images** - Not imported (Square requires separate API call, can be added manually)
- ⚠️ **Inventory** - Set to 0 initially (update in admin dashboard)
- ⚠️ **Multiple Variations** - Only the first variation is used as the default price

## After Import

Once products are imported, you should:

1. **Upload Product Images**
   - Go to Admin Dashboard > Products
   - Edit each product and upload an image

2. **Set Inventory Quantities**
   - In the product edit form, set the `quantityAvailable` field

3. **Add Customizations** (optional)
   - If products have size variants or custom options
   - Edit the product and configure customizations

4. **Review Product Status**
   - Products are imported as `ACTIVE` by default
   - Change to `FEATURED` or `INACTIVE` as needed

## Example Output

```
🔧 Environment: production
📍 Location ID: L1234567890

🔍 Fetching items from Square Catalog...
   Found 7 items in Square Catalog

📁 Using existing "Cookies" category: cat_xyz789

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Importing Products
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 Bundt Cakes
   Price: $6.50
   Square Item ID: ABCD1234
   Square Variation ID: WXYZ5678
   ✅ Created new product: prod_abc123

📦 Cinnamon Roll Cookie
   Price: $3.00
   Square Item ID: EFGH5678
   Square Variation ID: STUV9012
   ✅ Created new product: prod_def456

...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Import Summary:
   ✅ Created: 7
   🔄 Updated: 0
   ⏭️  Skipped: 0
   ❌ Failed: 0
   📦 Total: 7
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ Products imported successfully!

📝 Next steps:
   1. Update product images
   2. Set inventory quantities in admin dashboard
   3. Add product customizations if needed
```

## Handling Multiple Variations

If a Square item has multiple variations (e.g., different sizes with different prices), the script will:

1. Display all variations in the console output
2. Use the **first variation** as the default price
3. Store the first variation's ID in `merchantPriceId`

To properly support multiple variations with different prices, you'll need to:

1. After import, edit the product in the admin dashboard
2. Set up **Size Variants** customization
3. Create a variant for each Square variation with matching prices
4. The variant IDs will be synced back to Square when you save

## Updating Existing Products

If you run the import script again, it will:

- **Update** products that already exist (matched by `merchantProductId`)
- **Create** new products that don't exist yet
- **Skip** products without variations

This allows you to re-sync products if prices or names change in Square.

## Troubleshooting

### "No category ID provided"

You need to either:
- Create a "Cookies" category in your database, OR
- Specify a category ID with `--category-id=<id>`

### "Missing SQUARE_ACCESS_TOKEN"

Make sure your `.dev.vars` file has the Square credentials set.

### Products imported but missing images

Square images require a separate API call. For now, upload images manually through the admin dashboard.

## Related Scripts

- `pnpm sync:square` - Sync products FROM database TO Square (opposite direction)
- `pnpm scrape:products` - Scrape products from a website
