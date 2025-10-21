/**
 * Data Migration Script: Consolidate loyalty_customer into user table
 * This uses Drizzle ORM directly to ensure proper data handling
 */

import { drizzle } from 'drizzle-orm/d1';
import { eq, isNull, sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

// This will be run with tsx which supports top-level await
const DB_PATH = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/45ebc2083f4bae24ba3009904ed6d645e48b03732183803ab493835e325b3a2b.sqlite';

async function migrate() {
  // We need to use a local D1 instance for this migration
  // For now, we'll use direct SQL since we can't easily instantiate D1 in Node
  const sqlite3 = await import('better-sqlite3');
  const sqliteDb = new sqlite3.default(DB_PATH);
  
  console.log('🚀 Starting data migration: loyalty_customer → user table\n');
  
  // Step 1: Get counts
  console.log('📊 Pre-migration counts:');
  const userCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM user').get() as { count: number };
  const loyaltyCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM loyalty_customer').get() as { count: number };
  console.log(`   Users: ${userCount.count}`);
  console.log(`   Loyalty Customers: ${loyaltyCount.count}\n`);
  
  // Step 2: Get all loyalty customers
  const loyaltyCustomers = sqliteDb.prepare(`
    SELECT * FROM loyalty_customer
  `).all() as any[];
  
  let created = 0;
  let updated = 0;
  let skipped = 0;
  
  for (const customer of loyaltyCustomers) {
    // Check if user exists with this email
    const existingUser = sqliteDb.prepare(`
      SELECT * FROM user WHERE email = ?
    `).get(customer.email) as any;
    
    if (existingUser) {
      // User exists - merge data (prioritize existing user data)
      console.log(`   📝 Merging: ${customer.email} → existing user ${existingUser.id}`);
      
      sqliteDb.prepare(`
        UPDATE user SET
          phone = COALESCE(phone, ?),
          phoneVerified = CASE WHEN phone IS NULL THEN ? ELSE phoneVerified END,
          notificationPreferences = ?
        WHERE id = ?
      `).run(
        customer.phone || null,
        customer.phoneVerified || 0,
        customer.notificationPreferences,
        existingUser.id
      );
      
      // Link loyalty customer to user
      sqliteDb.prepare(`
        UPDATE loyalty_customer SET userId = ? WHERE id = ?
      `).run(existingUser.id, customer.id);
      
      updated++;
    } else if (!customer.userId || customer.userId === 'null') {
      // No user exists - create new one
      const newUserId = `usr_${createId()}`;
      const now = Date.now();
      
      console.log(`   ✨ Creating: ${customer.email} → ${newUserId}`);
      
      sqliteDb.prepare(`
        INSERT INTO user (
          id, email, firstName, lastName, phone, phoneVerified, 
          notificationPreferences, role, emailVerified, 
          createdAt, updatedAt, updateCounter
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        newUserId,
        customer.email,
        customer.firstName,
        customer.lastName,
        customer.phone || null,
        customer.phoneVerified || 0,
        customer.notificationPreferences,
        'user', // ROLES_ENUM.USER
        customer.emailVerified === 1 ? now : null,
        customer.createdAt || now,
        customer.updatedAt || now,
        0
      );
      
      // Link loyalty customer to new user
      sqliteDb.prepare(`
        UPDATE loyalty_customer SET userId = ? WHERE id = ?
      `).run(newUserId, customer.id);
      
      created++;
    } else {
      skipped++;
    }
  }
  
  console.log(`\n   ✅ Created ${created} new users`);
  console.log(`   ✅ Updated ${updated} existing users`);
  console.log(`   ⏭️  Skipped ${skipped} already linked\n`);
  
  // Step 3: Update order references
  console.log('📦 Updating order references...');
  
  const ordersToUpdate = sqliteDb.prepare(`
    SELECT o.id, o.loyaltyCustomerId, lc.userId
    FROM "order" o
    JOIN loyalty_customer lc ON o.loyaltyCustomerId = lc.id
    WHERE (o.userId IS NULL OR o.userId = 'null')
      AND o.loyaltyCustomerId IS NOT NULL
      AND o.loyaltyCustomerId != 'null'
      AND lc.userId IS NOT NULL
      AND lc.userId != 'null'
  `).all() as any[];
  
  console.log(`   Found ${ordersToUpdate.length} orders to update`);
  
  for (const order of ordersToUpdate) {
    sqliteDb.prepare(`
      UPDATE "order" SET userId = ? WHERE id = ?
    `).run(order.userId, order.id);
  }
  
  console.log(`   ✅ Updated ${ordersToUpdate.length} order references\n`);
  
  // Step 4: Fix any "null" string values
  console.log('🔧 Fixing null string values...');
  
  sqliteDb.prepare(`UPDATE user SET phone = NULL WHERE phone = 'null'`).run();
  sqliteDb.prepare(`UPDATE loyalty_customer SET userId = NULL WHERE userId = 'null'`).run();
  sqliteDb.prepare(`UPDATE loyalty_customer SET phone = NULL WHERE phone = 'null'`).run();
  sqliteDb.prepare(`UPDATE "order" SET userId = NULL WHERE userId = 'null'`).run();
  sqliteDb.prepare(`UPDATE "order" SET loyaltyCustomerId = NULL WHERE loyaltyCustomerId = 'null'`).run();
  
  console.log('   ✅ Fixed null strings\n');
  
  // Step 5: Verify
  console.log('🔍 Verification:');
  
  const finalUserCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM user').get() as { count: number };
  const ordersWithUser = sqliteDb.prepare('SELECT COUNT(*) as count FROM "order" WHERE userId IS NOT NULL').get() as { count: number };
  const orphanedOrders = sqliteDb.prepare('SELECT COUNT(*) as count FROM "order" WHERE userId IS NULL').get() as { count: number };
  const unmappedCustomers = sqliteDb.prepare('SELECT COUNT(*) as count FROM loyalty_customer WHERE userId IS NULL').get() as { count: number };
  
  console.log(`   Users: ${finalUserCount.count} (was ${userCount.count})`);
  console.log(`   Orders with userId: ${ordersWithUser.count}`);
  console.log(`   Orphaned orders: ${orphanedOrders.count}`);
  console.log(`   Unmapped loyalty customers: ${unmappedCustomers.count}\n`);
  
  sqliteDb.close();
  
  console.log('✅ Migration complete!');
  
  if (orphanedOrders.count > 0) {
    console.log(`\n⚠️  WARNING: ${orphanedOrders.count} orders have no userId - these may be guest orders`);
  }
}

migrate().catch(console.error);

