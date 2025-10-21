#!/usr/bin/env node

/**
 * Scrape products from Squarespace shop and download images locally
 * Usage: pnpm tsx scripts/scrape-products.mjs
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const PRODUCTS_DIR = path.join(PUBLIC_DIR, 'assets', 'products');

const SHOP_URL = 'https://silver-bellflower-5plg.squarespace.com/shop';

// Category mapping from Squarespace to our system
const CATEGORY_MAP = {
  'Cookie Gift Box': 'cookie-gift-box',
  'Cookies': 'cookies',
  'Cakes': 'cakes',
  'Custom Cakes': 'custom-cakes',
};

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function downloadImage(url, productName) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to download: ${response.statusText}`);

    const buffer = await response.arrayBuffer();
    const ext = url.match(/\.(jpg|jpeg|png|webp)/i)?.[0] || '.jpg';
    const filename = `${productName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}${ext}`;
    const filepath = path.join(PRODUCTS_DIR, filename);

    await fs.writeFile(filepath, Buffer.from(buffer));
    return `/assets/products/${filename}`;
  } catch (error) {
    console.error(`Failed to download image for ${productName}:`, error.message);
    return null;
  }
}

async function scrapeProducts() {
  console.log('Starting product scraper...\n');

  await ensureDir(PRODUCTS_DIR);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Navigating to shop page...');
  await page.goto(SHOP_URL, { waitUntil: 'networkidle', timeout: 30000 });

  // Check if we're in the Squarespace editor - need to access the iframe
  const frames = page.frames();
  console.log(`Found ${frames.length} frames`);

  // Find the preview iframe
  let contentFrame = null;
  for (const frame of frames) {
    const url = frame.url();
    if (url.includes('silver-bellflower') && !url.includes('/config/')) {
      contentFrame = frame;
      break;
    }
  }

  if (!contentFrame) {
    console.log('No iframe found, using main page');
    contentFrame = page.mainFrame();
  } else {
    console.log('Using iframe for content');
  }

  // Wait for products to load
  await contentFrame.waitForSelector('a[href*="/shop/p/"]', { timeout: 10000 }).catch(() => {
    console.log('Product links not found...');
  });

  const products = await contentFrame.evaluate(() => {
    const items = [];

    // Find all product links
    const productLinks = document.querySelectorAll('a[href*="/shop/p/"]');

    productLinks.forEach((link) => {
      try {
        // Get the parent container
        const container = link.closest('[class*="grid"]') || link.parentElement;

        const url = link.href;

        // Try to find the product name
        const nameEl = link.querySelector('[class*="title"]') ||
                       link.querySelector('h1, h2, h3, h4') ||
                       link.textContent?.trim();

        let name = typeof nameEl === 'string' ? nameEl : nameEl?.textContent?.trim();

        // If name is in a generic element, extract just the title part
        if (name && name.includes('$')) {
          name = name.split('$')[0].trim();
        }

        // Find price
        const priceEl = container?.querySelector('[class*="price"]') || link.querySelector('[class*="price"]');
        const priceText = priceEl?.textContent?.trim();

        // Find image
        const imgEl = link.querySelector('img');
        const imageUrl = imgEl?.src || imgEl?.dataset?.src;

        if (name && url) {
          items.push({
            name,
            url,
            priceText,
            imageUrl: imageUrl?.split('?')[0], // Remove query params
          });
        }
      } catch (error) {
        console.error('Error parsing product item:', error);
      }
    });

    return items;
  });

  console.log(`Found ${products.length} products\n`);

  const detailedProducts = [];

  for (const product of products) {
    console.log(`Scraping: ${product.name}`);

    try {
      await page.goto(product.url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1000);

      // Re-find the iframe on the product page
      const frames = page.frames();
      let productFrame = null;

      for (const frame of frames) {
        const url = frame.url();
        if (url.includes('silver-bellflower') && !url.includes('/config/')) {
          productFrame = frame;
          break;
        }
      }

      if (!productFrame) {
        productFrame = page.mainFrame();
      }

      const details = await productFrame.evaluate(() => {
        const descEl = document.querySelector('.product-description, [class*="description"]');
        const description = descEl?.textContent?.trim();

        const categoryEl = document.querySelector('.product-category, [class*="breadcrumb"]');
        const category = categoryEl?.textContent?.trim();

        // Check for variants
        const variantSelect = document.querySelector('select[name*="variant"], select');
        const variants = [];

        if (variantSelect) {
          const options = Array.from(variantSelect.querySelectorAll('option'));
          options.forEach((opt) => {
            if (opt.value && opt.textContent.trim() !== 'Select Size') {
              variants.push(opt.textContent.trim());
            }
          });
        }

        return { description, category, variants };
      });

      // Download image
      let localImagePath = null;
      if (product.imageUrl) {
        console.log(`  Downloading image...`);
        localImagePath = await downloadImage(product.imageUrl, product.name);
      }

      // Parse price
      let price = 0;
      if (product.priceText) {
        const match = product.priceText.match(/\$?(\d+(?:\.\d{2})?)/);
        if (match) {
          price = Math.round(parseFloat(match[1]) * 100); // Convert to cents
        }
      }

      // Determine category
      let categorySlug = 'cookies'; // default

      if (product.name.toLowerCase().includes('cake')) {
        categorySlug = product.name.toLowerCase().includes('custom') ? 'custom-cakes' : 'cakes';
      } else if (product.name.toLowerCase().includes('cookie')) {
        if (product.name.toLowerCase().includes('gift box')) {
          categorySlug = 'cookie-gift-box';
        } else {
          categorySlug = 'cookies';
        }
      }

      detailedProducts.push({
        name: product.name,
        description: details.description || '',
        categorySlug,
        price,
        imageUrl: localImagePath,
        variants: details.variants,
        status: 'active',
      });

      console.log(`  ✓ Complete\n`);

    } catch (error) {
      console.error(`  ✗ Failed to scrape ${product.name}:`, error.message);
    }
  }

  await browser.close();

  // Save to JSON
  const outputPath = path.join(ROOT_DIR, 'scripts', 'scraped-products.json');
  await fs.writeFile(outputPath, JSON.stringify(detailedProducts, null, 2));

  console.log(`\n✓ Scraped ${detailedProducts.length} products`);
  console.log(`✓ Data saved to: ${outputPath}`);
  console.log(`✓ Images saved to: ${PRODUCTS_DIR}`);

  return detailedProducts;
}

// Run scraper
scrapeProducts().catch(console.error);
