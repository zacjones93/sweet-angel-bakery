-- Test Data for Delivery System (Phase 1)
-- This script inserts test data for delivery schedules, zones, pickup locations, and closures

-- Clean up any existing test data first
DELETE FROM delivery_schedule WHERE name LIKE '%Test%' OR name IN ('Thursday Delivery', 'Saturday Delivery');
DELETE FROM delivery_zone WHERE name IN ('Local Boise', 'Extended Treasure Valley');
DELETE FROM pickup_location WHERE name IN ('Sweet Angel Bakery - Main Store', 'Saturday Farmers Market');
DELETE FROM delivery_calendar_closure WHERE closure_date = '2024-12-25';

-- Insert Thursday delivery schedule
INSERT INTO delivery_schedule (
  id, name, day_of_week, cutoff_day, cutoff_time,
  lead_time_days, delivery_time_window, is_active,
  created_at, updated_at
) VALUES (
  'delsch_test_thursday',
  'Thursday Delivery',
  4, -- Thursday
  2, -- Tuesday cutoff
  '23:59',
  2, -- 2-day lead time
  '10:00 AM - 4:00 PM MT',
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Insert Saturday delivery schedule
INSERT INTO delivery_schedule (
  id, name, day_of_week, cutoff_day, cutoff_time,
  lead_time_days, delivery_time_window, is_active,
  created_at, updated_at
) VALUES (
  'delsch_test_saturday',
  'Saturday Delivery',
  6, -- Saturday
  2, -- Tuesday cutoff
  '23:59',
  2, -- 2-day lead time
  '9:00 AM - 2:00 PM MT',
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Insert Local Boise delivery zone ($5.00)
INSERT INTO delivery_zone (
  id, name, zip_codes, fee_amount, is_active, priority,
  created_at, updated_at
) VALUES (
  'delz_test_local',
  'Local Boise',
  '["83702","83703","83704","83705","83706"]',
  500, -- $5.00 in cents
  1,
  10, -- High priority
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Insert Extended Treasure Valley delivery zone ($10.00)
INSERT INTO delivery_zone (
  id, name, zip_codes, fee_amount, is_active, priority,
  created_at, updated_at
) VALUES (
  'delz_test_extended',
  'Extended Treasure Valley',
  '["83642","83646","83713","83714","83716"]',
  1000, -- $10.00 in cents
  1,
  5, -- Medium priority
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Insert Main Store pickup location
INSERT INTO pickup_location (
  id, name, address, pickup_days, pickup_time_windows,
  instructions, is_active, requires_preorder, cutoff_day,
  cutoff_time, lead_time_days,
  created_at, updated_at
) VALUES (
  'ploc_test_main',
  'Sweet Angel Bakery - Main Store',
  '{"street":"123 Main St","city":"Boise","state":"ID","zip":"83702"}',
  '[4,6]', -- Thursday, Saturday
  '9:00 AM - 6:00 PM MT',
  'Ring bell at entrance',
  1,
  1, -- Requires preorder
  2, -- Tuesday cutoff
  '23:59',
  2, -- 2-day lead time
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Insert Farmers Market pickup location
INSERT INTO pickup_location (
  id, name, address, pickup_days, pickup_time_windows,
  instructions, is_active, requires_preorder, cutoff_day,
  cutoff_time, lead_time_days,
  created_at, updated_at
) VALUES (
  'ploc_test_market',
  'Saturday Farmers Market',
  '{"street":"Capital City Public Market","city":"Boise","state":"ID","zip":"83702"}',
  '[6]', -- Saturday only
  '8:00 AM - 2:00 PM MT',
  'Look for Sweet Angel tent',
  1,
  1, -- Requires preorder
  2, -- Tuesday cutoff
  '23:59',
  2, -- 2-day lead time
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Insert a test closure date (Christmas)
INSERT INTO delivery_calendar_closure (
  id, closure_date, reason, affects_delivery, affects_pickup,
  created_at, updated_at
) VALUES (
  'delcl_test_christmas',
  '2024-12-25',
  'Christmas',
  1,
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Verify test data
SELECT '=== Delivery Schedules ===' AS section;
SELECT id, name, day_of_week, cutoff_day, cutoff_time, lead_time_days, is_active
FROM delivery_schedule
WHERE name IN ('Thursday Delivery', 'Saturday Delivery');

SELECT '=== Delivery Zones ===' AS section;
SELECT id, name, zip_codes, fee_amount, priority, is_active
FROM delivery_zone
WHERE name IN ('Local Boise', 'Extended Treasure Valley');

SELECT '=== Pickup Locations ===' AS section;
SELECT id, name, pickup_days, pickup_time_windows, is_active
FROM pickup_location
WHERE name IN ('Sweet Angel Bakery - Main Store', 'Saturday Farmers Market');

SELECT '=== Calendar Closures ===' AS section;
SELECT id, closure_date, reason, affects_delivery, affects_pickup
FROM delivery_calendar_closure
WHERE closure_date = '2024-12-25';
