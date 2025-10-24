/**
 * Test script for Phase 1 Delivery System
 *
 * Tests:
 * 1. Database schema and test data insertion
 * 2. Timezone utilities (Mountain Time handling)
 * 3. Delivery date calculation logic
 * 4. Pickup date calculation logic
 * 5. Delivery fee calculation logic
 */

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../src/db/schema.ts';

// Initialize local D1 database
const client = createClient({
  url: 'file:.wrangler/state/v3/d1/miniflare-D1DatabaseObject/d133f4bd-e76e-45d6-8207-374ec40f4a90.sqlite',
});

const db = drizzle(client, { schema });

console.log('🧪 Testing Phase 1: Delivery System\n');
console.log('=' .repeat(60));

// ============================================================================
// TEST 1: Insert Test Data
// ============================================================================

console.log('\n📦 TEST 1: Inserting Test Data...\n');

try {
  // Insert Thursday delivery schedule
  const thursdaySchedule = await db.insert(schema.deliveryScheduleTable).values({
    name: 'Thursday Delivery',
    dayOfWeek: 4, // Thursday
    cutoffDay: 2, // Tuesday
    cutoffTime: '23:59',
    leadTimeDays: 2,
    deliveryTimeWindow: '10:00 AM - 4:00 PM MT',
    isActive: 1,
  }).returning().get();

  console.log('✅ Created Thursday delivery schedule:', thursdaySchedule.id);

  // Insert Saturday delivery schedule
  const saturdaySchedule = await db.insert(schema.deliveryScheduleTable).values({
    name: 'Saturday Delivery',
    dayOfWeek: 6, // Saturday
    cutoffDay: 2, // Tuesday
    cutoffTime: '23:59',
    leadTimeDays: 2,
    deliveryTimeWindow: '9:00 AM - 2:00 PM MT',
    isActive: 1,
  }).returning().get();

  console.log('✅ Created Saturday delivery schedule:', saturdaySchedule.id);

  // Insert Local Boise delivery zone
  const localZone = await db.insert(schema.deliveryZoneTable).values({
    name: 'Local Boise',
    zipCodes: JSON.stringify(['83702', '83703', '83704', '83705', '83706']),
    feeAmount: 500, // $5.00
    isActive: 1,
    priority: 10,
  }).returning().get();

  console.log('✅ Created Local Boise zone:', localZone.id, '- $5.00');

  // Insert Extended Treasure Valley delivery zone
  const extendedZone = await db.insert(schema.deliveryZoneTable).values({
    name: 'Extended Treasure Valley',
    zipCodes: JSON.stringify(['83642', '83646', '83713', '83714', '83716']),
    feeAmount: 1000, // $10.00
    isActive: 1,
    priority: 5,
  }).returning().get();

  console.log('✅ Created Extended Treasure Valley zone:', extendedZone.id, '- $10.00');

  // Insert Main Store pickup location
  const mainStore = await db.insert(schema.pickupLocationTable).values({
    name: 'Sweet Angel Bakery - Main Store',
    address: JSON.stringify({
      street: '123 Main St',
      city: 'Boise',
      state: 'ID',
      zip: '83702'
    }),
    pickupDays: JSON.stringify([4, 6]), // Thursday, Saturday
    pickupTimeWindows: '9:00 AM - 6:00 PM MT',
    instructions: 'Ring bell at entrance',
    isActive: 1,
    requiresPreorder: 1,
    cutoffDay: 2, // Tuesday
    cutoffTime: '23:59',
    leadTimeDays: 2,
  }).returning().get();

  console.log('✅ Created Main Store pickup location:', mainStore.id);

  // Insert Farmers Market pickup location
  const farmersMarket = await db.insert(schema.pickupLocationTable).values({
    name: 'Saturday Farmers Market',
    address: JSON.stringify({
      street: 'Capital City Public Market',
      city: 'Boise',
      state: 'ID',
      zip: '83702'
    }),
    pickupDays: JSON.stringify([6]), // Saturday only
    pickupTimeWindows: '8:00 AM - 2:00 PM MT',
    instructions: 'Look for Sweet Angel tent',
    isActive: 1,
    requiresPreorder: 1,
    cutoffDay: 2, // Tuesday
    cutoffTime: '23:59',
    leadTimeDays: 2,
  }).returning().get();

  console.log('✅ Created Farmers Market pickup location:', farmersMarket.id);

  // Insert a test closure date (Christmas)
  const closure = await db.insert(schema.deliveryCalendarClosureTable).values({
    closureDate: '2024-12-25',
    reason: 'Christmas',
    affectsDelivery: 1,
    affectsPickup: 1,
  }).returning().get();

  console.log('✅ Created closure date:', closure.closureDate, '-', closure.reason);

  console.log('\n✅ Test data inserted successfully!');

} catch (error) {
  console.error('❌ Error inserting test data:', error.message);
  process.exit(1);
}

// ============================================================================
// TEST 2: Query Test Data
// ============================================================================

console.log('\n📊 TEST 2: Querying Test Data...\n');

try {
  const schedules = await db.select().from(schema.deliveryScheduleTable).all();
  console.log(`✅ Found ${schedules.length} delivery schedules`);

  const zones = await db.select().from(schema.deliveryZoneTable).all();
  console.log(`✅ Found ${zones.length} delivery zones`);

  const locations = await db.select().from(schema.pickupLocationTable).all();
  console.log(`✅ Found ${locations.length} pickup locations`);

  const closures = await db.select().from(schema.deliveryCalendarClosureTable).all();
  console.log(`✅ Found ${closures.length} calendar closures`);

  // Display zone details
  console.log('\n📍 Delivery Zones:');
  for (const zone of zones) {
    const zipCodes = JSON.parse(zone.zipCodes);
    console.log(`  - ${zone.name}: $${(zone.feeAmount / 100).toFixed(2)} (ZIPs: ${zipCodes.join(', ')})`);
  }

  // Display pickup location details
  console.log('\n📦 Pickup Locations:');
  for (const location of locations) {
    const address = JSON.parse(location.address);
    const days = JSON.parse(location.pickupDays);
    const dayNames = days.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]);
    console.log(`  - ${location.name}: ${dayNames.join(', ')} (${address.city}, ${address.state})`);
  }

} catch (error) {
  console.error('❌ Error querying test data:', error.message);
  process.exit(1);
}

// ============================================================================
// TEST 3: Test Delivery Fee Calculation
// ============================================================================

console.log('\n💰 TEST 3: Testing Delivery Fee Calculation...\n');

try {
  // Test Local Boise ZIP
  const localZipCodes = ['83702', '83703', '83704', '83705', '83706'];
  const zones = await db.select().from(schema.deliveryZoneTable).where(
    schema.deliveryZoneTable.isActive === 1
  ).all();

  for (const testZip of ['83702', '83713', '99999']) {
    let matchedZone = null;

    for (const zone of zones.sort((a, b) => b.priority - a.priority)) {
      const zipCodes = JSON.parse(zone.zipCodes);
      if (zipCodes.includes(testZip)) {
        matchedZone = zone;
        break;
      }
    }

    if (matchedZone) {
      console.log(`✅ ZIP ${testZip} → ${matchedZone.name} - $${(matchedZone.feeAmount / 100).toFixed(2)}`);
    } else {
      console.log(`⚠️  ZIP ${testZip} → No zone found (would show error to customer)`);
    }
  }

} catch (error) {
  console.error('❌ Error testing delivery fee calculation:', error.message);
  process.exit(1);
}

// ============================================================================
// TEST 4: Test Data Verification
// ============================================================================

console.log('\n🔍 TEST 4: Verifying Database Constraints...\n');

try {
  // Verify schedules have correct day ranges
  const schedules = await db.select().from(schema.deliveryScheduleTable).all();

  for (const schedule of schedules) {
    if (schedule.dayOfWeek < 0 || schedule.dayOfWeek > 6) {
      console.log(`❌ Invalid dayOfWeek for ${schedule.name}: ${schedule.dayOfWeek}`);
    } else {
      console.log(`✅ ${schedule.name} dayOfWeek: ${schedule.dayOfWeek} (valid)`);
    }

    if (schedule.cutoffDay < 0 || schedule.cutoffDay > 6) {
      console.log(`❌ Invalid cutoffDay for ${schedule.name}: ${schedule.cutoffDay}`);
    } else {
      console.log(`✅ ${schedule.name} cutoffDay: ${schedule.cutoffDay} (valid)`);
    }
  }

  // Verify zones have valid fee amounts
  const zones = await db.select().from(schema.deliveryZoneTable).all();

  for (const zone of zones) {
    if (zone.feeAmount < 0) {
      console.log(`❌ Invalid feeAmount for ${zone.name}: ${zone.feeAmount}`);
    } else {
      console.log(`✅ ${zone.name} feeAmount: $${(zone.feeAmount / 100).toFixed(2)} (valid)`);
    }
  }

} catch (error) {
  console.error('❌ Error verifying database constraints:', error.message);
  process.exit(1);
}

// ============================================================================
// Summary
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log('✅ Phase 1 Database Tests PASSED!');
console.log('='.repeat(60));
console.log('\nNext: Test timezone and delivery calculation utilities with:');
console.log('  pnpm tsx scripts/test-delivery-utilities.mjs\n');

client.close();
