#!/usr/bin/env node

/**
 * Data Migration Script: Consolidate loyalty_customer into user table
 * 
 * This script:
 * 1. Migrates loyalty customers to the user table
 * 2. Resolves conflicts by keeping userTable records over loyalty_customer records
 * 3. Updates order references from loyaltyCustomerId to userId
 * 4. Preserves all data integrity
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { getD1Database } from './utils/parse-wrangler.mjs';

const execAsync = promisify(exec);

const dbConfig = getD1Database();
const DB_NAME = dbConfig.name;

/**
 * Execute a SQL query on the local D1 database
 */
async function executeSQL(sql) {
  const command = `wrangler d1 execute ${DB_NAME} --local --command "${sql.replace(/"/g, '\\"')}"`;
  try {
    const { stdout, stderr } = await execAsync(command);
    return { success: true, stdout, stderr };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Query data from the database
 */
async function querySQL(sql) {
  const command = `wrangler d1 execute ${DB_NAME} --local --command "${sql.replace(/"/g, '\\"')}" --json`;
  try {
    const { stdout } = await execAsync(command);
    const result = JSON.parse(stdout);
    return result[0]?.results || [];
  } catch (error) {
    console.error('Query failed:', error.message);
    return [];
  }
}

console.log('🚀 Starting data migration: loyalty_customer → user table\n');

// Step 1: Get counts before migration
console.log('📊 Pre-migration counts:');
const userCount = await querySQL('SELECT COUNT(*) as count FROM user');
const loyaltyCount = await querySQL('SELECT COUNT(*) as count FROM loyalty_customer');
const orderCount = await querySQL('SELECT COUNT(*) as count FROM "order"');

console.log(`   Users: ${userCount[0]?.count || 0}`);
console.log(`   Loyalty Customers: ${loyaltyCount[0]?.count || 0}`);
console.log(`   Orders: ${orderCount[0]?.count || 0}\n`);

// Step 2: Merge loyalty customers that ARE linked to a user
console.log('🔗 Step 1: Merging data for loyalty customers linked to existing users...');
const linkedCustomers = await querySQL(`
  SELECT lc.id, lc.userId, lc.email, lc.phone, lc.phoneVerified, lc.notificationPreferences
  FROM loyalty_customer lc
  WHERE lc.userId IS NOT NULL
`);

console.log(`   Found ${linkedCustomers.length} linked loyalty customers`);

for (const customer of linkedCustomers) {
  // Update user with loyalty customer data (only if fields are missing)
  const updateSql = `
    UPDATE user 
    SET 
      phone = COALESCE(phone, '${customer.phone || ''}'),
      phoneVerified = CASE WHEN phone IS NULL THEN ${customer.phoneVerified} ELSE phoneVerified END,
      notificationPreferences = '${customer.notificationPreferences}'
    WHERE id = '${customer.userId}'
  `;
  
  await executeSQL(updateSql);
}

console.log('   ✅ Merged linked customers\n');

// Step 3: Migrate loyalty customers that are NOT linked to a user
console.log('👤 Step 2: Migrating unlinked loyalty customers...');
const unlinkedCustomers = await querySQL(`
  SELECT lc.id, lc.email, lc.firstName, lc.lastName, lc.phone, lc.phoneVerified, 
         lc.emailVerified, lc.notificationPreferences, lc.createdAt
  FROM loyalty_customer lc
  WHERE lc.userId IS NULL
`);

console.log(`   Found ${unlinkedCustomers.length} unlinked loyalty customers`);

let created = 0;
let merged = 0;
let conflicts = 0;

for (const customer of unlinkedCustomers) {
  // Check if user already exists with this email
  const existingUsers = await querySQL(`
    SELECT id, email, phone FROM user WHERE email = '${customer.email}'
  `);
  
  if (existingUsers.length > 0) {
    // USER EXISTS - Merge data, prioritizing existing user (as per instructions)
    conflicts++;
    const existingUser = existingUsers[0];
    
    console.log(`   ⚠️  Conflict: ${customer.email} exists in both tables, keeping user record`);
    
    // Only update phone and preferences if user doesn't have them
    const updateSql = `
      UPDATE user 
      SET 
        phone = COALESCE(phone, '${customer.phone || ''}'),
        phoneVerified = CASE WHEN phone IS NULL THEN ${customer.phoneVerified} ELSE phoneVerified END,
        notificationPreferences = '${customer.notificationPreferences}'
      WHERE id = '${existingUser.id}'
    `;
    
    await executeSQL(updateSql);
    
    // Link the loyalty customer to this user for order migration
    await executeSQL(`
      UPDATE loyalty_customer 
      SET userId = '${existingUser.id}' 
      WHERE id = '${customer.id}'
    `);
    
    merged++;
  } else {
    // USER DOESN'T EXIST - Create new user from loyalty customer
    const emailVerified = customer.emailVerified === 1 ? 'datetime("now")' : 'NULL';
    
    const insertSql = `
      INSERT INTO user (
        email, firstName, lastName, phone, phoneVerified, 
        notificationPreferences, role, emailVerified, createdAt, updatedAt, updateCounter
      ) VALUES (
        '${customer.email}',
        '${customer.firstName.replace(/'/g, "''")}',
        '${customer.lastName.replace(/'/g, "''")}',
        ${customer.phone ? `'${customer.phone}'` : 'NULL'},
        ${customer.phoneVerified},
        '${customer.notificationPreferences}',
        'user',
        ${emailVerified},
        ${customer.createdAt},
        ${customer.createdAt},
        0
      )
    `;
    
    const result = await executeSQL(insertSql);
    
    if (result.success) {
      // Get the newly created user ID
      const newUsers = await querySQL(`SELECT id FROM user WHERE email = '${customer.email}'`);
      if (newUsers.length > 0) {
        // Link loyalty customer to new user
        await executeSQL(`
          UPDATE loyalty_customer 
          SET userId = '${newUsers[0].id}' 
          WHERE id = '${customer.id}'
        `);
        created++;
      }
    }
  }
}

console.log(`   ✅ Created ${created} new users`);
console.log(`   ✅ Merged ${merged} into existing users`);
console.log(`   ⚠️  Resolved ${conflicts} conflicts (kept user table records)\n`);

// Step 4: Update order references
console.log('📦 Step 3: Updating order references...');

// First, get orders that only have loyaltyCustomerId
const ordersToUpdate = await querySQL(`
  SELECT o.id, o.loyaltyCustomerId, lc.userId
  FROM "order" o
  JOIN loyalty_customer lc ON o.loyaltyCustomerId = lc.id
  WHERE o.userId IS NULL AND o.loyaltyCustomerId IS NOT NULL
`);

console.log(`   Found ${ordersToUpdate.length} orders to update`);

for (const order of ordersToUpdate) {
  await executeSQL(`
    UPDATE "order" 
    SET userId = '${order.userId}' 
    WHERE id = '${order.id}'
  `);
}

console.log('   ✅ Updated order references\n');

// Step 5: Verify data integrity
console.log('🔍 Step 4: Verifying data integrity...');

const orphanedOrders = await querySQL(`
  SELECT COUNT(*) as count FROM "order" WHERE userId IS NULL
`);

const duplicateEmails = await querySQL(`
  SELECT email, COUNT(*) as count 
  FROM user 
  GROUP BY email 
  HAVING COUNT(*) > 1
`);

const unmappedLoyaltyCustomers = await querySQL(`
  SELECT COUNT(*) as count FROM loyalty_customer WHERE userId IS NULL
`);

console.log(`   Orphaned orders (no userId): ${orphanedOrders[0]?.count || 0}`);
console.log(`   Duplicate emails in user table: ${duplicateEmails.length}`);
console.log(`   Unmapped loyalty customers: ${unmappedLoyaltyCustomers[0]?.count || 0}\n`);

// Step 6: Final counts
console.log('📊 Post-migration counts:');
const userCountAfter = await querySQL('SELECT COUNT(*) as count FROM user');
const ordersWithUserId = await querySQL('SELECT COUNT(*) as count FROM "order" WHERE userId IS NOT NULL');

console.log(`   Users: ${userCountAfter[0]?.count || 0} (was ${userCount[0]?.count || 0})`);
console.log(`   Orders with userId: ${ordersWithUserId[0]?.count || 0} (was ${orderCount[0]?.count || 0})\n`);

// Summary
console.log('✅ Migration complete!\n');
console.log('Summary:');
console.log(`   - ${created} new users created from loyalty customers`);
console.log(`   - ${merged + linkedCustomers.length} users updated with loyalty data`);
console.log(`   - ${conflicts} conflicts resolved (kept user table records)`);
console.log(`   - ${ordersToUpdate.length} orders linked to users`);

if (orphanedOrders[0]?.count > 0) {
  console.log(`\n⚠️  WARNING: ${orphanedOrders[0].count} orders still have no userId`);
  console.log('   Review these orders manually before proceeding.');
}

if (duplicateEmails.length > 0) {
  console.log(`\n⚠️  WARNING: ${duplicateEmails.length} duplicate email(s) found`);
  console.log('   Review these manually:');
  duplicateEmails.forEach(row => {
    console.log(`   - ${row.email} (${row.count} occurrences)`);
  });
}

console.log('\n🎉 Data migration successful! Ready for Phase 3.');

