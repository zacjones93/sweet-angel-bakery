/**
 * Create 5 test delivery orders for Saturday delivery
 */

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../src/db/schema.ts';
import { eq } from 'drizzle-orm';

// Initialize local D1 database
const client = createClient({
  url: 'file:.wrangler/state/v3/d1/miniflare-D1DatabaseObject/d133f4bd-e76e-45d6-8207-374ec40f4a90.sqlite',
});

const db = drizzle(client, { schema });

console.log('🚚 Creating 5 Test Delivery Orders for Saturday\n');
console.log('=' .repeat(60));

// Test addresses
const addresses = [
  {
    street: '790 S Progress Ave',
    city: 'Meridian',
    state: 'ID',
    zip: '83642',
    customerName: 'Sarah Johnson',
    customerEmail: 'sarah.johnson@example.com',
    customerPhone: '(208) 555-0101',
  },
  {
    street: '210 N Highbrook Wy',
    city: 'Star',
    state: 'ID',
    zip: '83669',
    customerName: 'Mike Thompson',
    customerEmail: 'mike.thompson@example.com',
    customerPhone: '(208) 555-0102',
  },
  {
    street: '137 N Campbell Ave',
    city: 'Middleton',
    state: 'ID',
    zip: '83644',
    customerName: 'Lisa Martinez',
    customerEmail: 'lisa.martinez@example.com',
    customerPhone: '(208) 555-0103',
  },
  {
    street: '551 Middleton Rd',
    city: 'Middleton',
    state: 'ID',
    zip: '83644',
    customerName: 'David Chen',
    customerEmail: 'david.chen@example.com',
    customerPhone: '(208) 555-0104',
  },
  {
    street: '14309 Midway Rd',
    city: 'Nampa',
    state: 'ID',
    zip: '83651',
    customerName: 'Emily Rodriguez',
    customerEmail: 'emily.rodriguez@example.com',
    customerPhone: '(208) 555-0105',
  },
];

// Calculate next Saturday
function getNextSaturday() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
  const nextSaturday = new Date(today);
  nextSaturday.setDate(today.getDate() + daysUntilSaturday);

  // If today is Saturday, get next Saturday
  if (daysUntilSaturday === 0) {
    nextSaturday.setDate(today.getDate() + 7);
  }

  return nextSaturday.toISOString().split('T')[0]; // Returns YYYY-MM-DD
}

async function main() {
  try {
    // Get active products
    const products = await db.select().from(schema.productTable).where(
      eq(schema.productTable.status, 'active')
    ).limit(3).all();

    if (products.length === 0) {
      console.error('❌ No active products found. Please ensure products exist in the database.');
      process.exit(1);
    }

    console.log(`✅ Found ${products.length} active products to use for orders\n`);

    // Get delivery zones
    const zones = await db.select().from(schema.deliveryZoneTable).where(
      eq(schema.deliveryZoneTable.isActive, 1)
    ).all();

    console.log(`✅ Found ${zones.length} active delivery zones\n`);

    const saturdayDate = getNextSaturday();
    console.log(`📅 Creating orders for Saturday: ${saturdayDate}\n`);

    // Create orders
    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i];

      // Find matching delivery zone
      let deliveryZone = null;
      let deliveryFee = 0;

      for (const zone of zones.sort((a, b) => b.priority - a.priority)) {
        const zipCodes = JSON.parse(zone.zipCodes);
        if (zipCodes.includes(address.zip)) {
          deliveryZone = zone;
          deliveryFee = zone.feeAmount;
          break;
        }
      }

      // Calculate order totals (random selection of products)
      const numItems = Math.floor(Math.random() * 2) + 1; // 1-2 items per order
      const orderItems = [];
      let subtotal = 0;

      for (let j = 0; j < numItems; j++) {
        const product = products[j % products.length];
        const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 quantity
        const itemTotal = product.price * quantity;
        subtotal += itemTotal;

        orderItems.push({
          productId: product.id,
          quantity,
          priceAtPurchase: product.price,
        });
      }

      const tax = Math.round(subtotal * 0.06); // 6% tax
      const totalAmount = subtotal + tax + deliveryFee;

      // Create order
      const order = await db.insert(schema.orderTable).values({
        customerEmail: address.customerEmail,
        customerName: address.customerName,
        customerPhone: address.customerPhone,
        totalAmount,
        subtotal,
        tax,
        paymentStatus: 'paid',
        status: 'confirmed',
        merchantProvider: 'square',
        fulfillmentMethod: 'delivery',
        deliveryDate: saturdayDate,
        deliveryTimeWindow: '9:00 AM - 2:00 PM',
        deliveryAddressJson: JSON.stringify({
          street: address.street,
          city: address.city,
          state: address.state,
          zip: address.zip,
        }),
        deliveryInstructions: 'Please ring doorbell',
        deliveryFee,
        deliveryZoneId: deliveryZone?.id || null,
        deliveryStatus: 'confirmed',
      }).returning().get();

      // Create order items
      for (const item of orderItems) {
        await db.insert(schema.orderItemTable).values({
          orderId: order.id,
          ...item,
        });
      }

      console.log(`✅ Order ${i + 1}/${addresses.length}: ${order.id}`);
      console.log(`   Customer: ${address.customerName}`);
      console.log(`   Address: ${address.street}, ${address.city}, ${address.state} ${address.zip}`);
      console.log(`   Zone: ${deliveryZone?.name || 'None'} - Delivery Fee: $${(deliveryFee / 100).toFixed(2)}`);
      console.log(`   Subtotal: $${(subtotal / 100).toFixed(2)} + Tax: $${(tax / 100).toFixed(2)} = $${(totalAmount / 100).toFixed(2)}`);
      console.log(`   Items: ${orderItems.length}\n`);
    }

    console.log('=' .repeat(60));
    console.log('✅ Successfully created 5 test delivery orders!');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('❌ Error creating test orders:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.close();
  }
}

main();
