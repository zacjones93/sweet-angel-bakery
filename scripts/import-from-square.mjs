#!/usr/bin/env node

/**
 * Import products FROM Square Catalog TO database
 *
 * This script fetches all items from your Square Catalog and creates/updates
 * them in the database using wrangler CLI.
 *
 * Usage:
 *   1. Edit the CONFIG section below with your values
 *   2. Run: pnpm tsx scripts/import-from-square.mjs [--remote] [--dry-run]
 *   3. Delete your credentials from this file when done
 *
 * Options:
 *   --remote             Update production database (default: local)
 *   --dry-run            Preview changes without writing to database
 */

import { execSync } from 'child_process';
import { createId } from '@paralleldrive/cuid2';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📝 CONFIG - Set these values, then DELETE them after running the script
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CONFIG = {
  // Your Square Access Token (get from Square Dashboard > Developer > Applications)
  accessToken: 'EAAAl-SJGxQ0eQ6xJbhNQlL5BI6g2rEYkJDtqDF3MyLSDynTM2Tjxe2_4zLL2azt',

  // Your Square Location ID (get from Square Dashboard > Locations)
  locationId: 'LD2Z6RAK16EWH',

  // Square environment: 'production' or 'sandbox'
  squareEnvironment: 'production',

  // Category ID to assign products to
  // Run this to find it: wrangler d1 execute sweet-angel-bakery --command "SELECT id, name FROM category" --local
  // (or --remote for production)
  // Leave as null to auto-detect "Cookies" category
  categoryId: null,
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Validate configuration
if (CONFIG.accessToken === 'YOUR_SQUARE_ACCESS_TOKEN_HERE') {
  console.error('❌ Please set your accessToken in the CONFIG section');
  process.exit(1);
}

if (CONFIG.locationId === 'YOUR_LOCATION_ID_HERE') {
  console.error('❌ Please set your locationId in the CONFIG section');
  process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
const isRemote = args.includes('--remote');
const isDryRun = args.includes('--dry-run');

const baseUrl = CONFIG.squareEnvironment === 'production'
  ? 'https://connect.squareup.com'
  : 'https://connect.squareupsandbox.com';

const dbFlag = isRemote ? '--remote' : '--local';
const dbName = 'sweet-angel-bakery';

console.log(`🔧 Square Environment: ${CONFIG.squareEnvironment}`);
console.log(`📍 Location ID: ${CONFIG.locationId}`);
console.log(`💾 Database: ${isRemote ? 'PRODUCTION (--remote)' : 'LOCAL (--local)'}`);
if (isDryRun) {
  console.log('🔍 DRY RUN MODE - No changes will be written to database');
}
console.log('');

if (isRemote && !isDryRun) {
  console.log('⚠️  WARNING: You are about to modify the PRODUCTION database!');
  console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...');
  console.log('');

  // Give user time to cancel
  await new Promise(resolve => setTimeout(resolve, 5000));
}

/**
 * Make a request to Square API using fetch
 */
async function squareRequest(endpoint, options = {}) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${CONFIG.accessToken}`,
      'Content-Type': 'application/json',
      'Square-Version': '2024-10-17',
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('[Square] API Error Response:', JSON.stringify(data, null, 2));
    throw new Error(`Square API error: ${data.errors?.[0]?.detail || response.statusText}`);
  }

  return data;
}

/**
 * Fetch all catalog items from Square
 */
async function fetchSquareItems() {
  console.log('🔍 Fetching items from Square Catalog...');

  const response = await squareRequest('/v2/catalog/list?types=ITEM');

  const items = response.objects || [];
  console.log(`   Found ${items.length} items in Square Catalog`);
  console.log('');

  return items;
}

/**
 * Execute SQL command via wrangler
 */
function executeSQL(sql) {
  try {
    const result = execSync(
      `wrangler d1 execute ${dbName} --command "${sql.replace(/"/g, '\\"')}" ${dbFlag} --json`,
      { encoding: 'utf8' }
    );
    return JSON.parse(result);
  } catch (error) {
    console.error('SQL Error:', error.message);
    throw error;
  }
}

/**
 * Query database via wrangler
 */
function querySQL(sql) {
  const result = executeSQL(sql);
  return result[0]?.results || [];
}

/**
 * Get or create category for products
 */
async function getCategoryId() {
  if (CONFIG.categoryId) {
    console.log(`📁 Using category ID from config: ${CONFIG.categoryId}`);
    return CONFIG.categoryId;
  }

  // Look for "Cookies" category
  console.log('🔍 Looking for "Cookies" category...');
  const categories = querySQL('SELECT id, name FROM category');
  const cookiesCategory = categories.find(c => c.name.toLowerCase() === 'cookies');

  if (cookiesCategory) {
    console.log(`📁 Using existing "Cookies" category: ${cookiesCategory.id}`);
    return cookiesCategory.id;
  }

  console.log('📁 No category specified. Available categories:');
  categories.forEach(cat => {
    console.log(`   - ${cat.name} (${cat.id})`);
  });
  console.log('');
  console.log('💡 Tip: Set categoryId in the CONFIG section');
  console.log('');

  throw new Error('No category ID provided and no "Cookies" category found');
}

/**
 * Import Square items to database
 */
async function importSquareItems() {
  const items = await fetchSquareItems();
  const categoryId = await getCategoryId();

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📦 Importing Products');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const item of items) {
    try {
      const itemData = item.item_data;
      const itemName = itemData.name;
      const itemDescription = itemData.description || null;

      // Get the first variation (most items have a single variation)
      const variations = itemData.variations || [];
      if (variations.length === 0) {
        console.log(`⚠️  ${itemName}: No variations found, skipping`);
        skippedCount++;
        continue;
      }

      const defaultVariation = variations[0];
      const priceInCents = Number(defaultVariation.item_variation_data?.price_money?.amount || 0);

      console.log(`📦 ${itemName}`);
      console.log(`   Price: $${(priceInCents / 100).toFixed(2)}`);
      console.log(`   Square Item ID: ${item.id}`);
      console.log(`   Square Variation ID: ${defaultVariation.id}`);

      if (variations.length > 1) {
        console.log(`   Variations: ${variations.length} found`);
        variations.forEach((v, idx) => {
          const vPrice = Number(v.item_variation_data?.price_money?.amount || 0);
          console.log(`      ${idx + 1}. ${v.item_variation_data?.name} - $${(vPrice / 100).toFixed(2)}`);
        });
      }

      // Check if product already exists by Square item ID
      const existingProducts = querySQL(
        `SELECT id FROM product WHERE merchantProductId = '${item.id}' LIMIT 1`
      );
      const existingProduct = existingProducts[0];

      if (isDryRun) {
        if (existingProduct) {
          console.log(`   [DRY RUN] Would update existing product: ${existingProduct.id}`);
        } else {
          console.log(`   [DRY RUN] Would create new product`);
        }
        console.log('');
        continue;
      }

      // Escape SQL strings
      const escapedName = itemName.replace(/'/g, "''");
      const escapedDescription = itemDescription ? itemDescription.replace(/'/g, "''") : null;

      if (existingProduct) {
        // Update existing product
        const updateSQL = `
          UPDATE product SET
            name = '${escapedName}',
            description = ${escapedDescription ? `'${escapedDescription}'` : 'NULL'},
            price = ${priceInCents},
            merchantProvider = 'square',
            merchantProductId = '${item.id}',
            merchantPriceId = '${defaultVariation.id}',
            updatedAt = datetime('now')
          WHERE id = '${existingProduct.id}'
        `;
        executeSQL(updateSQL);

        console.log(`   ✅ Updated existing product: ${existingProduct.id}`);
        updatedCount++;
      } else {
        // Create new product
        const productId = `prod_${createId()}`;
        const insertSQL = `
          INSERT INTO product (
            id, name, description, categoryId, price, imageUrl,
            status, quantityAvailable, merchantProvider, merchantProductId,
            merchantPriceId, customizations, createdAt, updatedAt
          ) VALUES (
            '${productId}',
            '${escapedName}',
            ${escapedDescription ? `'${escapedDescription}'` : 'NULL'},
            '${categoryId}',
            ${priceInCents},
            NULL,
            'active',
            0,
            'square',
            '${item.id}',
            '${defaultVariation.id}',
            NULL,
            datetime('now'),
            datetime('now')
          )
        `;
        executeSQL(insertSQL);

        console.log(`   ✅ Created new product: ${productId}`);
        createdCount++;
      }

      console.log('');
    } catch (error) {
      console.error(`   ❌ Failed to import: ${error.message}`);
      console.log('');
      errorCount++;
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Import Summary:');
  console.log(`   ✅ Created: ${createdCount}`);
  console.log(`   🔄 Updated: ${updatedCount}`);
  console.log(`   ⏭️  Skipped: ${skippedCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log(`   📦 Total: ${items.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (!isDryRun && createdCount > 0) {
    console.log('');
    console.log('✨ Products imported successfully!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Update product images (Square images require separate upload)');
    console.log('   2. Set inventory quantities in admin dashboard');
    console.log('   3. Add product customizations if needed');
  }
}

// Run the import
importSquareItems()
  .then(() => {
    console.log('');
    console.log('✅ Import complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('');
    console.error('❌ Import failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
