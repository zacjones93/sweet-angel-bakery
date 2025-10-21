#!/usr/bin/env node

/**
 * Sync database products to Stripe and update with Stripe IDs
 * Usage: pnpm tsx scripts/sync-stripe.mjs
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import Stripe from 'stripe';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');

const DB_NAME = 'cloudflare-workers-nextjs-saas';

// Load Stripe key from environment or .env files
async function loadEnv() {
  // Check environment variable first
  if (process.env.STRIPE_SECRET_KEY) {
    return process.env.STRIPE_SECRET_KEY;
  }

  // Try .env.local, .dev.vars, .env
  const envFiles = ['.env.local', '.dev.vars', '.env'];

  for (const file of envFiles) {
    try {
      const envPath = path.join(ROOT_DIR, file);
      const envContent = await fs.readFile(envPath, 'utf-8');
      const lines = envContent.split('\n');

      for (const line of lines) {
        const match = line.match(/^STRIPE_SECRET_KEY=(.+)$/);
        if (match) {
          return match[1].trim().replace(/['"]/g, ''); // Remove quotes
        }
      }
    } catch (err) {
      // File doesn't exist, try next one
      continue;
    }
  }

  throw new Error(
    'STRIPE_SECRET_KEY not found. Set it in .env.local, .dev.vars, or as an environment variable.\n' +
    'Get your key from: https://dashboard.stripe.com/apikeys'
  );
}

// Execute D1 query and return results
function queryD1(sql) {
  try {
    const result = execSync(
      `wrangler d1 execute ${DB_NAME} --local --command "${sql.replace(/"/g, '\\"')}" --json`,
      { cwd: ROOT_DIR, encoding: 'utf-8' }
    );

    // Parse wrangler JSON output
    const parsed = JSON.parse(result);

    // Wrangler returns an array with one element containing results
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].results) {
      return parsed[0].results;
    }

    return [];
  } catch (error) {
    console.error('D1 query failed:', error.message);
    throw error;
  }
}

// Update D1 record
function updateD1(sql) {
  try {
    execSync(
      `wrangler d1 execute ${DB_NAME} --local --command "${sql.replace(/"/g, '\\"')}"`,
      { cwd: ROOT_DIR, encoding: 'utf-8' }
    );
    return true;
  } catch (error) {
    console.error('D1 update failed:', error.message);
    throw error;
  }
}

async function syncToStripe() {
  console.log('Starting Stripe sync from database...\n');

  const stripeKey = await loadEnv();
  const stripe = new Stripe(stripeKey, {
    apiVersion: '2025-02-24.acacia',
  });

  // Fetch products without Stripe IDs
  console.log('Fetching products without Stripe IDs...');
  const products = queryD1(
    'SELECT id, name, description, price, imageUrl, categoryId FROM product WHERE stripeProductId IS NULL OR stripeProductId = \'\' OR stripeProductId = \'null\''
  );

  if (!products || products.length === 0) {
    console.log('✓ All products already have Stripe IDs!');
    return;
  }

  console.log(`Found ${products.length} products to sync\n`);

  let synced = 0;
  let skipped = 0;
  let failed = 0;

  for (const product of products) {
    console.log(`Processing: ${product.name} (${product.id})`);

    try {
      // Create Stripe product
      const stripeProduct = await stripe.products.create({
        name: product.name,
        description: product.description || undefined,
        images: product.imageUrl ? [`https://www.sweetangelbakery.com${product.imageUrl}`] : [],
        metadata: {
          dbProductId: product.id,
          categoryId: product.categoryId,
        },
      });

      console.log(`  ✓ Stripe product created: ${stripeProduct.id}`);

      // Create default price
      const stripePrice = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: product.price,
        currency: 'usd',
      });

      console.log(`  ✓ Stripe price created: ${stripePrice.id}`);

      // Update database
      updateD1(
        `UPDATE product SET stripeProductId = '${stripeProduct.id}', stripePriceId = '${stripePrice.id}', updatedAt = ${Math.floor(Date.now() / 1000)} WHERE id = '${product.id}'`
      );

      console.log(`  ✓ Database updated\n`);
      synced++;

    } catch (error) {
      console.error(`  ✗ Failed:`, error.message);
      console.log('');
      failed++;
    }
  }

  console.log('='.repeat(50));
  console.log('Sync Summary:');
  console.log(`  Synced: ${synced}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total:  ${products.length}`);
  console.log('='.repeat(50));
}

syncToStripe().catch(console.error);
