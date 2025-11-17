-- Migrate existing product-category relationships to junction table
INSERT INTO `product_category` (`id`, `productId`, `categoryId`, `createdAt`, `updatedAt`, `update_counter`)
SELECT
  'pcat_' || substr(hex(randomblob(16)), 1, 24) as id,
  `id` as productId,
  `categoryId`,
  `createdAt`,
  `updatedAt`,
  0 as update_counter
FROM `product`
WHERE `categoryId` IS NOT NULL;