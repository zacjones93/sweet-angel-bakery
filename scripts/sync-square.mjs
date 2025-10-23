#!/usr/bin/env node

/**
 * Sync products from database to Square Catalog
 *
 * Usage:
 *   pnpm tsx scripts/sync-square.mjs
 *
 * Environment variables required:
 *   - SQUARE_ACCESS_TOKEN
 *   - SQUARE_LOCATION_ID
 *   - SQUARE_ENVIRONMENT (sandbox or production)
 */

import { Client } from 'square';
import { getDB } from '../src/db/index.js';
import { productTable } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

// Get Square credentials from environment
const accessToken = process.env.SQUARE_ACCESS_TOKEN;
const locationId = process.env.SQUARE_LOCATION_ID;
const environment = process.env.SQUARE_ENVIRONMENT === 'production'
  ? 'production'
  : 'sandbox';

if (!accessToken) {
  console.error('❌ Missing SQUARE_ACCESS_TOKEN environment variable');
  console.error('   Set it in .dev.vars or export it in your shell');
  process.exit(1);
}

if (!locationId) {
  console.error('❌ Missing SQUARE_LOCATION_ID environment variable');
  console.error('   Get it from Square Dashboard > Locations');
  process.exit(1);
}

console.log(`🔧 Environment: ${process.env.SQUARE_ENVIRONMENT || 'sandbox'}`);
console.log(`📍 Location ID: ${locationId}`);
console.log('');

// Initialize Square client
const client = new Client({ accessToken, environment });
const db = getDB();

async function syncProducts() {
  console.log('🔍 Fetching products from database...');

  // Get all products
  const products = await db.select().from(productTable);
  console.log(`   Found ${products.length} total products`);

  // Filter products that don't have Square IDs yet
  const productsToSync = products.filter(p => !p.merchantProductId || p.merchantProvider !== 'square');
  console.log(`   ${productsToSync.length} products need syncing to Square`);
  console.log('');

  if (productsToSync.length === 0) {
    console.log('✅ All products already synced!');
    return;
  }

  let successCount = 0;
  let errorCount = 0;

  for (const product of productsToSync) {
    try {
      console.log(`📦 Syncing: ${product.name}`);

      // Parse customizations to check for variants
      const customizations = product.customizations
        ? JSON.parse(product.customizations)
        : null;

      // Build variations array
      const variations = [];

      if (customizations?.type === 'size_variants') {
        // Create a variation for each size
        for (const variant of customizations.variants) {
          variations.push({
            type: 'ITEM_VARIATION',
            id: `#variant-${variant.id}`,
            itemVariationData: {
              name: variant.name,
              pricingType: 'FIXED_PRICING',
              priceMoney: {
                amount: BigInt(variant.priceInCents),
                currency: 'USD',
              },
              itemId: '#product',
            },
          });
        }
      } else {
        // Single default variation
        variations.push({
          type: 'ITEM_VARIATION',
          id: '#default-variation',
          itemVariationData: {
            name: 'Regular',
            pricingType: 'FIXED_PRICING',
            priceMoney: {
              amount: BigInt(product.price),
              currency: 'USD',
            },
            itemId: '#product',
          },
        });
      }

      // Create catalog item in Square
      const { result } = await client.catalogApi.batchUpsertCatalogObjects({
        idempotencyKey: crypto.randomUUID(),
        batches: [{
          objects: [{
            type: 'ITEM',
            id: '#product',
            itemData: {
              name: product.name,
              description: product.description || undefined,
              variations,
              // Note: Square requires images to be uploaded separately via Images API
              // For now, we'll skip images. Add image upload logic here if needed.
            },
          }],
        }],
      });

      // Extract created IDs
      const createdItem = result.objects.find(obj => obj.type === 'ITEM');
      const defaultVariation = result.objects.find(obj =>
        obj.type === 'ITEM_VARIATION' &&
        (obj.itemVariationData?.name === 'Regular' ||
         customizations?.variants?.[0]?.name === obj.itemVariationData?.name)
      );

      if (!createdItem) {
        throw new Error('Failed to create item in Square');
      }

      // Build variant ID mapping for size variants
      let variantMapping = null;
      if (customizations?.type === 'size_variants') {
        variantMapping = {};
        for (const variant of customizations.variants) {
          const squareVariation = result.objects.find(obj =>
            obj.type === 'ITEM_VARIATION' &&
            obj.itemVariationData?.name === variant.name
          );
          if (squareVariation) {
            variant.squarePriceId = squareVariation.id;
            variantMapping[variant.id] = squareVariation.id;
          }
        }

        // Update customizations with Square variant IDs
        await db.update(productTable)
          .set({
            customizations: JSON.stringify(customizations),
          })
          .where(eq(productTable.id, product.id));
      }

      // Update product in database with Square IDs
      await db.update(productTable)
        .set({
          merchantProvider: 'square',
          merchantProductId: createdItem.id,
          merchantPriceId: defaultVariation?.id || null,
        })
        .where(eq(productTable.id, product.id));

      console.log(`   ✅ Synced successfully`);
      console.log(`      Square Product ID: ${createdItem.id}`);
      console.log(`      Square Price ID: ${defaultVariation?.id || 'N/A'}`);
      if (variantMapping) {
        console.log(`      Variants: ${Object.keys(variantMapping).length} mapped`);
      }
      console.log('');

      successCount++;
    } catch (error) {
      console.error(`   ❌ Failed to sync: ${error.message}`);
      if (error.errors) {
        console.error('      Square API errors:', JSON.stringify(error.errors, null, 2));
      }
      console.log('');
      errorCount++;
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Sync Summary:');
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log(`   📦 Total: ${productsToSync.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (successCount > 0) {
    console.log('');
    console.log('✨ Products are now available in Square!');
    console.log(`   View them at: https://squareup.com/dashboard/items/library`);
  }
}

// Run the sync
syncProducts()
  .then(() => {
    console.log('');
    console.log('✅ Sync complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('');
    console.error('❌ Sync failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
