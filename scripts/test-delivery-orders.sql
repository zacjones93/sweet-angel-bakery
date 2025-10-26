-- Create 5 test delivery orders for Saturday 2025-11-01
-- All orders set for delivery with the Extended Treasure Valley zone ($10 delivery fee)

-- Order 1: Sarah Johnson - 790 S Progress Ave, Meridian, ID 83642
INSERT INTO "order" (
  id, customerEmail, customerName, customerPhone,
  totalAmount, subtotal, tax, delivery_fee,
  paymentStatus, status, merchantProvider,
  fulfillment_method, delivery_date, delivery_time_window,
  delivery_address_json, delivery_instructions, delivery_zone_id, delivery_status,
  createdAt, updatedAt, updateCounter
) VALUES (
  'ord_test_delivery_001',
  'sarah.johnson@example.com',
  'Sarah Johnson',
  '(208) 555-0101',
  4816, -- $48.16 total (subtotal $3600 + tax $216 + delivery $1000)
  3600, -- $36.00 (2x Cookie Gift Box @ $18.00)
  216,  -- 6% tax
  1000, -- Extended zone $10.00
  'paid',
  'confirmed',
  'square',
  'delivery',
  '2025-11-01',
  '9:00 AM - 2:00 PM',
  '{"street":"790 S Progress Ave","city":"Meridian","state":"ID","zip":"83642"}',
  'Please ring doorbell',
  'delz_test_extended',
  'confirmed',
  unixepoch(),
  unixepoch(),
  0
);

-- Order items for Order 1
INSERT INTO order_item (id, orderId, productId, quantity, priceAtPurchase, createdAt, updatedAt, updateCounter)
VALUES ('oitem_test_001_1', 'ord_test_delivery_001', 'prod_miib6ur4c97uix2f335eok6q', 2, 1800, unixepoch(), unixepoch(), 0);

-- Order 2: Mike Thompson - 210 N Highbrook Wy, Star, ID 83669
INSERT INTO "order" (
  id, customerEmail, customerName, customerPhone,
  totalAmount, subtotal, tax, delivery_fee,
  paymentStatus, status, merchantProvider,
  fulfillment_method, delivery_date, delivery_time_window,
  delivery_address_json, delivery_instructions, delivery_zone_id, delivery_status,
  createdAt, updatedAt, updateCounter
) VALUES (
  'ord_test_delivery_002',
  'mike.thompson@example.com',
  'Mike Thompson',
  '(208) 555-0102',
  2272, -- $22.72 total (subtotal $1200 + tax $72 + delivery $1000)
  1200, -- $12.00 (3x Whiskey Cookie @ $4.00)
  72,   -- 6% tax
  1000, -- Extended zone $10.00
  'paid',
  'confirmed',
  'square',
  'delivery',
  '2025-11-01',
  '9:00 AM - 2:00 PM',
  '{"street":"210 N Highbrook Wy","city":"Star","state":"ID","zip":"83669"}',
  'Please ring doorbell',
  'delz_test_extended',
  'confirmed',
  unixepoch(),
  unixepoch(),
  0
);

-- Order items for Order 2
INSERT INTO order_item (id, orderId, productId, quantity, priceAtPurchase, createdAt, updatedAt, updateCounter)
VALUES ('oitem_test_002_1', 'ord_test_delivery_002', 'prod_g4fix1glehhdsldozc8uk8y1', 3, 400, unixepoch(), unixepoch(), 0);

-- Order 3: Lisa Martinez - 137 N Campbell Ave, Middleton, ID 83644
INSERT INTO "order" (
  id, customerEmail, customerName, customerPhone,
  totalAmount, subtotal, tax, delivery_fee,
  paymentStatus, status, merchantProvider,
  fulfillment_method, delivery_date, delivery_time_window,
  delivery_address_json, delivery_instructions, delivery_zone_id, delivery_status,
  createdAt, updatedAt, updateCounter
) VALUES (
  'ord_test_delivery_003',
  'lisa.martinez@example.com',
  'Lisa Martinez',
  '(208) 555-0103',
  3332, -- $33.32 total (subtotal $2200 + tax $132 + delivery $1000)
  2200, -- $22.00 (1x Gift Box $18 + 1x Cinnamon Roll $4)
  132,  -- 6% tax
  1000, -- Extended zone $10.00
  'paid',
  'confirmed',
  'square',
  'delivery',
  '2025-11-01',
  '9:00 AM - 2:00 PM',
  '{"street":"137 N Campbell Ave","city":"Middleton","state":"ID","zip":"83644"}',
  'Please ring doorbell',
  'delz_test_extended',
  'confirmed',
  unixepoch(),
  unixepoch(),
  0
);

-- Order items for Order 3
INSERT INTO order_item (id, orderId, productId, quantity, priceAtPurchase, createdAt, updatedAt, updateCounter)
VALUES
  ('oitem_test_003_1', 'ord_test_delivery_003', 'prod_miib6ur4c97uix2f335eok6q', 1, 1800, unixepoch(), unixepoch(), 0),
  ('oitem_test_003_2', 'ord_test_delivery_003', 'prod_hkmlajg97zagaxnosypawmt3', 1, 400, unixepoch(), unixepoch(), 0);

-- Order 4: David Chen - 551 Middleton Rd, Middleton, ID 83644
INSERT INTO "order" (
  id, customerEmail, customerName, customerPhone,
  totalAmount, subtotal, tax, delivery_fee,
  paymentStatus, status, merchantProvider,
  fulfillment_method, delivery_date, delivery_time_window,
  delivery_address_json, delivery_instructions, delivery_zone_id, delivery_status,
  createdAt, updatedAt, updateCounter
) VALUES (
  'ord_test_delivery_004',
  'david.chen@example.com',
  'David Chen',
  '(208) 555-0104',
  1848, -- $18.48 total (subtotal $800 + tax $48 + delivery $1000)
  800,  -- $8.00 (2x Whiskey Cookie @ $4.00)
  48,   -- 6% tax
  1000, -- Extended zone $10.00
  'paid',
  'confirmed',
  'square',
  'delivery',
  '2025-11-01',
  '9:00 AM - 2:00 PM',
  '{"street":"551 Middleton Rd","city":"Middleton","state":"ID","zip":"83644"}',
  'Please ring doorbell',
  'delz_test_extended',
  'confirmed',
  unixepoch(),
  unixepoch(),
  0
);

-- Order items for Order 4
INSERT INTO order_item (id, orderId, productId, quantity, priceAtPurchase, createdAt, updatedAt, updateCounter)
VALUES ('oitem_test_004_1', 'ord_test_delivery_004', 'prod_g4fix1glehhdsldozc8uk8y1', 2, 400, unixepoch(), unixepoch(), 0);

-- Order 5: Emily Rodriguez - 14309 Midway Rd, Nampa, ID 83651
INSERT INTO "order" (
  id, customerEmail, customerName, customerPhone,
  totalAmount, subtotal, tax, delivery_fee,
  paymentStatus, status, merchantProvider,
  fulfillment_method, delivery_date, delivery_time_window,
  delivery_address_json, delivery_instructions, delivery_zone_id, delivery_status,
  createdAt, updatedAt, updateCounter
) VALUES (
  'ord_test_delivery_005',
  'emily.rodriguez@example.com',
  'Emily Rodriguez',
  '(208) 555-0105',
  3968, -- $39.68 total (subtotal $2800 + tax $168 + delivery $1000)
  2800, -- $28.00 (1x Gift Box $18 + 2x Cinnamon + 1x Whiskey)
  168,  -- 6% tax
  1000, -- Extended zone $10.00
  'paid',
  'confirmed',
  'square',
  'delivery',
  '2025-11-01',
  '9:00 AM - 2:00 PM',
  '{"street":"14309 Midway Rd","city":"Nampa","state":"ID","zip":"83651"}',
  'Please ring doorbell',
  'delz_test_extended',
  'confirmed',
  unixepoch(),
  unixepoch(),
  0
);

-- Order items for Order 5
INSERT INTO order_item (id, orderId, productId, quantity, priceAtPurchase, createdAt, updatedAt, updateCounter)
VALUES
  ('oitem_test_005_1', 'ord_test_delivery_005', 'prod_miib6ur4c97uix2f335eok6q', 1, 1800, unixepoch(), unixepoch(), 0),
  ('oitem_test_005_2', 'ord_test_delivery_005', 'prod_hkmlajg97zagaxnosypawmt3', 2, 400, unixepoch(), unixepoch(), 0),
  ('oitem_test_005_3', 'ord_test_delivery_005', 'prod_g4fix1glehhdsldozc8uk8y1', 1, 400, unixepoch(), unixepoch(), 0);
