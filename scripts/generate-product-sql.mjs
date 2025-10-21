#!/usr/bin/env node

/**
 * Generate SQL migration file from scraped products with Stripe IDs
 * Usage: pnpm tsx scripts/generate-product-sql.mjs
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createId } from '@paralleldrive/cuid2';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');

// Category slug to ID mapping (from seed-categories.mjs)
const CATEGORY_IDS = {
  'cookie-gift-box': 'cat_2tdLW2HVrEFaYPg1vxdKKD',
  'cookies': 'cat_2tdLW2HVrEFaYPg1vxdKKC',
  'cakes': 'cat_2tdLW2HVrEFaYPg1vxdKKE',
  'custom-cakes': 'cat_2tdLW2HVrEFaYPg1vxdKKF',
};

function escapeSQL(str) {
  if (!str) return "''";
  return `'${str.replace(/'/g, "''")}'`;
}

async function generateSQL() {
  console.log('Generating SQL migration...\n');

  // Try to load products with Stripe IDs first, fall back to scraped products
  let productsPath = path.join(ROOT_DIR, 'scripts', 'products-with-stripe.json');
  let products;

  try {
    products = JSON.parse(await fs.readFile(productsPath, 'utf-8'));
    console.log('Using products with Stripe IDs\n');
  } catch {
    console.log('⚠ No Stripe data found, using scraped products without Stripe IDs\n');
    productsPath = path.join(ROOT_DIR, 'scripts', 'scraped-products.json');
    products = JSON.parse(await fs.readFile(productsPath, 'utf-8'));
  }

  const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
  const sqlFilename = `0011_seed_products.sql`;
  const sqlPath = path.join(ROOT_DIR, 'src', 'db', 'migrations', sqlFilename);

  let sql = `-- Seed products from Squarespace scrape
-- Generated at: ${new Date().toISOString()}

`;

  for (const product of products) {
    if (product.stripeError) {
      console.warn(`⚠ Skipping ${product.name} - Stripe error: ${product.stripeError}`);
      continue;
    }

    const productId = `prod_${createId()}`;
    const categoryId = CATEGORY_IDS[product.categorySlug] || CATEGORY_IDS.cookies;

    const createdAt = Math.floor(Date.now() / 1000);

    // Handle variants
    if (product.variants && product.variants.length > 0) {
      // Create a product for each variant
      for (let i = 0; i < product.variants.length; i++) {
        const variant = product.variants[i];
        const variantProductId = i === 0 ? productId : `prod_${createId()}`;
        const variantName = `${product.name} - ${variant}`;

        // Try to extract price from variant name or use base price
        let variantPrice = product.price;
        const priceMatch = variant.match(/\$(\d+(?:\.\d{2})?)/);
        if (priceMatch) {
          variantPrice = Math.round(parseFloat(priceMatch[1]) * 100);
        }

        // Use the corresponding price ID if available
        const stripePriceId = product.stripePriceIds?.[i] || product.stripePriceId;

        sql += `INSERT INTO product (id, name, description, categoryId, price, imageUrl, status, quantityAvailable, stripeProductId, stripePriceId, createdAt, updatedAt, updateCounter)
VALUES (
  ${escapeSQL(variantProductId)},
  ${escapeSQL(variantName)},
  ${escapeSQL(product.description)},
  ${escapeSQL(categoryId)},
  ${variantPrice},
  ${product.imageUrl ? escapeSQL(product.imageUrl) : 'NULL'},
  ${escapeSQL(product.status)},
  0,
  ${product.stripeProductId ? escapeSQL(product.stripeProductId) : 'NULL'},
  ${stripePriceId ? escapeSQL(stripePriceId) : 'NULL'},
  ${createdAt},
  ${createdAt},
  0
);

`;
      }
    } else {
      // Single product
      sql += `INSERT INTO product (id, name, description, categoryId, price, imageUrl, status, quantityAvailable, stripeProductId, stripePriceId, createdAt, updatedAt, updateCounter)
VALUES (
  ${escapeSQL(productId)},
  ${escapeSQL(product.name)},
  ${escapeSQL(product.description)},
  ${escapeSQL(categoryId)},
  ${product.price},
  ${product.imageUrl ? escapeSQL(product.imageUrl) : 'NULL'},
  ${escapeSQL(product.status)},
  0,
  ${product.stripeProductId ? escapeSQL(product.stripeProductId) : 'NULL'},
  ${product.stripePriceId ? escapeSQL(product.stripePriceId) : 'NULL'},
  ${createdAt},
  ${createdAt},
  0
);

`;
    }

    console.log(`✓ Generated SQL for: ${product.name}`);
  }

  await fs.writeFile(sqlPath, sql);

  console.log(`\n✓ SQL migration saved to: ${sqlPath}`);
  console.log(`\nTo apply this migration, run:`);
  console.log(`  pnpm db:migrate:dev`);

  return sqlPath;
}

generateSQL().catch(console.error);
