import { createId } from '@paralleldrive/cuid2';

const categories = [
  {
    id: `cat_${createId()}`,
    name: 'Cakes',
    slug: 'cakes',
    description: 'Delicious custom cakes for all occasions',
    displayOrder: 1,
    active: 1,
    createdAt: Math.floor(Date.now() / 1000),
    updatedAt: Math.floor(Date.now() / 1000),
  },
  {
    id: `cat_${createId()}`,
    name: 'Cookies',
    slug: 'cookies',
    description: 'Fresh-baked cookies made with love',
    displayOrder: 2,
    active: 1,
    createdAt: Math.floor(Date.now() / 1000),
    updatedAt: Math.floor(Date.now() / 1000),
  },
];

const values = categories.map(cat =>
  `('${cat.id}', '${cat.name}', '${cat.slug}', '${cat.description}', ${cat.displayOrder}, ${cat.active}, ${cat.createdAt}, ${cat.updatedAt})`
).join(', ');

const sql = `INSERT INTO category (id, name, slug, description, displayOrder, active, createdAt, updatedAt) VALUES ${values};`;

console.log(sql);
