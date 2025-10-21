-- Seed products from Squarespace scrape
-- Generated at: 2025-10-21T17:06:45.716Z

-- First, delete existing products and categories, then insert fresh data
DELETE FROM order_item;
DELETE FROM product;
DELETE FROM category;

INSERT INTO category (id, name, slug, description, displayOrder, active, createdAt, updatedAt, updateCounter)
VALUES
  ('cat_2tdLW2HVrEFaYPg1vxdKKC', 'Cookies', 'cookies', 'Handcrafted cookies made fresh daily', 1, 1, 1761066405, 1761066405, 0),
  ('cat_2tdLW2HVrEFaYPg1vxdKKD', 'Gift Boxes', 'gift-boxes', 'Curated gift boxes perfect for any occasion', 2, 1, 1761066405, 1761066405, 0),
  ('cat_2tdLW2HVrEFaYPg1vxdKKE', 'Cakes', 'cakes', 'Custom cakes for celebrations', 3, 1, 1761066405, 1761066405, 0),
  ('cat_2tdLW2HVrEFaYPg1vxdKKF', 'Custom Orders', 'custom-orders', 'Custom baked goods made to order', 4, 1, 1761066405, 1761066405, 0);

-- Now insert products (ignore if they already exist)
INSERT OR IGNORE INTO product (id, name, description, categoryId, price, imageUrl, status, quantityAvailable, stripeProductId, stripePriceId, createdAt, updatedAt, updateCounter)
VALUES (
  'prod_miib6ur4c97uix2f335eok6q',
  'Cookie Gift Box',
  'A delightful assortment of our signature cookies, perfect for gifting.',
  'cat_2tdLW2HVrEFaYPg1vxdKKD',
  1800,
  NULL,
  'active',
  0,
  NULL,
  NULL,
  1761066405,
  1761066405,
  0
);

INSERT OR IGNORE INTO product (id, name, description, categoryId, price, imageUrl, status, quantityAvailable, stripeProductId, stripePriceId, createdAt, updatedAt, updateCounter)
VALUES (
  'prod_g4fix1glehhdsldozc8uk8y1',
  'Whiskey Rye Salted Chocolate Chip Cookie',
  'Rich chocolate chip cookie with a hint of whiskey rye and sea salt.',
  'cat_2tdLW2HVrEFaYPg1vxdKKC',
  400,
  NULL,
  'active',
  0,
  NULL,
  NULL,
  1761066405,
  1761066405,
  0
);

INSERT OR IGNORE INTO product (id, name, description, categoryId, price, imageUrl, status, quantityAvailable, stripeProductId, stripePriceId, createdAt, updatedAt, updateCounter)
VALUES (
  'prod_hkmlajg97zagaxnosypawmt3',
  'Cinnamon Roll Cookie',
  'All the flavors of a cinnamon roll in cookie form.',
  'cat_2tdLW2HVrEFaYPg1vxdKKC',
  400,
  NULL,
  'active',
  0,
  NULL,
  NULL,
  1761066405,
  1761066405,
  0
);

INSERT OR IGNORE INTO product (id, name, description, categoryId, price, imageUrl, status, quantityAvailable, stripeProductId, stripePriceId, createdAt, updatedAt, updateCounter)
VALUES (
  'prod_hba1q7p7v4j3h1d3nim7l95g',
  'Cowboy Cookie',
  'Hearty cookie loaded with oats, chocolate chips, and coconut.',
  'cat_2tdLW2HVrEFaYPg1vxdKKC',
  400,
  NULL,
  'active',
  0,
  NULL,
  NULL,
  1761066405,
  1761066405,
  0
);

INSERT OR IGNORE INTO product (id, name, description, categoryId, price, imageUrl, status, quantityAvailable, stripeProductId, stripePriceId, createdAt, updatedAt, updateCounter)
VALUES (
  'prod_gsbgnuryl38lx9xdg6o36rcl',
  'Treasure Cookie',
  'A treasure trove of flavors in every bite.',
  'cat_2tdLW2HVrEFaYPg1vxdKKC',
  400,
  NULL,
  'active',
  0,
  NULL,
  NULL,
  1761066405,
  1761066405,
  0
);

INSERT OR IGNORE INTO product (id, name, description, categoryId, price, imageUrl, status, quantityAvailable, stripeProductId, stripePriceId, createdAt, updatedAt, updateCounter)
VALUES (
  'prod_o2rlgl1hxyf8qd07sw0mnzlm',
  'GA Bar',
  'Delicious bar cookie with a perfect blend of sweet and savory.',
  'cat_2tdLW2HVrEFaYPg1vxdKKC',
  400,
  NULL,
  'active',
  0,
  NULL,
  NULL,
  1761066405,
  1761066405,
  0
);

INSERT OR IGNORE INTO product (id, name, description, categoryId, price, imageUrl, status, quantityAvailable, stripeProductId, stripePriceId, createdAt, updatedAt, updateCounter)
VALUES (
  'prod_bmi5vwtntfi3u3mrxx8cz969',
  'Banana Chocolate Chip Cake - 6"',
  'Moist banana cake studded with chocolate chips.',
  'cat_2tdLW2HVrEFaYPg1vxdKKE',
  4500,
  NULL,
  'active',
  0,
  NULL,
  NULL,
  1761066405,
  1761066405,
  0
);

INSERT OR IGNORE INTO product (id, name, description, categoryId, price, imageUrl, status, quantityAvailable, stripeProductId, stripePriceId, createdAt, updatedAt, updateCounter)
VALUES (
  'prod_ju009qeqref6krk32myrhvw3',
  'Banana Chocolate Chip Cake - 9"',
  'Moist banana cake studded with chocolate chips.',
  'cat_2tdLW2HVrEFaYPg1vxdKKE',
  4500,
  NULL,
  'active',
  0,
  NULL,
  NULL,
  1761066405,
  1761066405,
  0
);

INSERT OR IGNORE INTO product (id, name, description, categoryId, price, imageUrl, status, quantityAvailable, stripeProductId, stripePriceId, createdAt, updatedAt, updateCounter)
VALUES (
  'prod_y204x38x9hzf86t2fh4nksqj',
  'Oreo Chocolate Cake - 6"',
  'Rich chocolate cake with Oreo cookies baked in.',
  'cat_2tdLW2HVrEFaYPg1vxdKKE',
  4500,
  NULL,
  'active',
  0,
  NULL,
  NULL,
  1761066405,
  1761066405,
  0
);

INSERT OR IGNORE INTO product (id, name, description, categoryId, price, imageUrl, status, quantityAvailable, stripeProductId, stripePriceId, createdAt, updatedAt, updateCounter)
VALUES (
  'prod_v12ntf8n5bkp9ndlch7sbytg',
  'Oreo Chocolate Cake - 9"',
  'Rich chocolate cake with Oreo cookies baked in.',
  'cat_2tdLW2HVrEFaYPg1vxdKKE',
  4500,
  NULL,
  'active',
  0,
  NULL,
  NULL,
  1761066405,
  1761066405,
  0
);

INSERT OR IGNORE INTO product (id, name, description, categoryId, price, imageUrl, status, quantityAvailable, stripeProductId, stripePriceId, createdAt, updatedAt, updateCounter)
VALUES (
  'prod_ktlreowbndh13drzvkflnpsx',
  'Custom Cake',
  'Create your own custom cake. Contact us for pricing and details.',
  'cat_2tdLW2HVrEFaYPg1vxdKKF',
  0,
  NULL,
  'active',
  0,
  NULL,
  NULL,
  1761066405,
  1761066405,
  0
);

