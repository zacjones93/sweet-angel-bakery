I'll analyze the template and reference websites to create a comprehensive migration plan for your e-commerce bakery. Let me fetch and review these resources.Based on my analysis of the template and reference websites, I'll create a comprehensive migration plan for your e-commerce bakery.

## **Template Analysis**

The starter template is a comprehensive SaaS boilerplate with:
- ✅ **Already has**: Stripe integration, admin dashboard, authentication (Lucia Auth), Drizzle ORM + D1 database, role-based access
- ✅ **Can leverage**: Credit billing system (adapt for products), multi-tenancy (for future multi-location support)
- ⚠️ **Needs adaptation**: Currently focused on credit/subscription model vs. direct product sales

## **Reference Website Insights**

**Hudson's Cookies**: Clean, simple product showcase with menu categories
**Bond & Bevel**: Product-focused with clear imagery and straightforward navigation

Both emphasize: Simple navigation, beautiful product photography, easy browsing, clear pricing

---

## **Migration Plan**

### **Phase 1: Database Schema Modifications**

**Remove/Keep:**
- ✅ **Keep**: `users`, `sessions`, `email_verification_codes`, `password_reset_tokens`
- 🔄 **Adapt**: `transactions` table (repurpose for orders)
- ❌ **Remove**: Credit-related columns from users table

**Add New Tables:**

```sql
-- Products table
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'cakes' | 'cookies'
  price INTEGER NOT NULL, -- in cents
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'featured' | 'inactive'
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Orders table (adapt existing transactions)
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  user_id TEXT, -- nullable for guest checkout
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  total_amount INTEGER NOT NULL,
  status TEXT NOT NULL, -- 'pending' | 'paid' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  stripe_payment_intent_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Order items
CREATE TABLE order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price_at_purchase INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Product categories (extensible for future)
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1
);
```

### **Phase 2: Authentication & Role Management**

**Modify User Roles:**

Update the `users` table to include a role field:
```sql
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'customer'; -- 'admin' | 'customer'
```

**Route Protection Strategy:**
- `/` - Public storefront (anyone can view)
- `/products` - Public product listing
- `/cart` - Public cart (with session storage)
- `/checkout` - Requires email (guest or logged in)
- `/dashboard/*` - Admins only (existing dashboard routes)
- `/account/*` - Logged-in customers (order history, profile)

### **Phase 3: Admin Dashboard Adaptation**

**Repurpose Existing Dashboard Routes:**

```
/dashboard
├── /products           # Product management (CRUD)
│   ├── /new           # Add new product
│   ├── /[id]/edit     # Edit product
│   └── /categories    # Manage categories
├── /orders            # Order management
│   └── /[id]         # Order details
├── /customers         # Customer list (repurpose user management)
└── /settings         # Store settings (pickup times, etc.)
```

**Remove from Dashboard:**
- Credit management pages
- Organization/tenant management (unless you want multi-location support)

### **Phase 4: Customer-Facing Storefront**

**New Routes to Create:**

```
/ (homepage)
├── /products
│   ├── /cakes
│   ├── /cookies
│   └── /[productId]
├── /cart
├── /checkout
└── /account (customer dashboard)
    ├── /orders
    └── /settings
```

**Key Components to Build:**

1. **Product Grid Component**: Display products by category with filtering
2. **Product Card Component**: Image, name, price, "Add to Cart" button
3. **Shopping Cart**: Using React Context + local storage for persistence
4. **Checkout Flow**:
   - Cart review
   - Customer info (email, name, phone)
   - Stripe payment
   - Order confirmation

### **Phase 5: Stripe Integration Adaptation**

**Current Template**: Uses Stripe for credit purchases
**Your Needs**: Direct product purchases

**Modifications Needed:**

```typescript
// Adapt existing Stripe integration in src/lib/stripe/
// Change from credit-based to product-based checkout

// Create checkout session with line items
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  line_items: cartItems.map(item => ({
    price_data: {
      currency: 'usd',
      product_data: {
        name: item.name,
        images: [item.image_url],
      },
      unit_amount: item.price,
    },
    quantity: item.quantity,
  })),
  customer_email: customerEmail,
  success_url: `${baseUrl}/order/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${baseUrl}/cart`,
});
```

### **Phase 6: File Structure Reorganization**

**Recommended Structure:**

```
src/
├── app/
│   ├── (storefront)/          # Customer-facing routes
│   │   ├── layout.tsx         # Storefront layout (navbar, footer)
│   │   ├── page.tsx           # Homepage
│   │   ├── products/
│   │   ├── cart/
│   │   ├── checkout/
│   │   └── account/
│   ├── (admin)/               # Admin routes
│   │   └── dashboard/         # Keep existing dashboard structure
│   └── api/
│       ├── products/          # Product CRUD endpoints
│       ├── orders/            # Order management endpoints
│       └── stripe/            # Stripe webhooks
├── components/
│   ├── admin/                 # Admin-specific components
│   ├── storefront/            # Customer-facing components
│   │   ├── product-grid.tsx
│   │   ├── product-card.tsx
│   │   ├── cart/
│   │   └── checkout/
│   └── shared/                # Shared components
└── lib/
    ├── db/
    │   └── schema/
    │       ├── products.ts
    │       ├── orders.ts
    │       └── categories.ts
    └── stripe/                # Adapt existing Stripe utilities
```

### **Phase 7: UI/UX Adaptations**

**Design Direction (based on reference sites):**

1. **Homepage**: Hero section with featured products, category cards, about section
2. **Product Listing**: Grid layout with large product images, simple filters (category, status)
3. **Product Detail**: Large image carousel, description, price, add to cart
4. **Color Palette**: Warm, inviting colors (bakery aesthetic)
5. **Typography**: Clean, readable fonts

**Keep from Template:**
- Shadcn UI components
- Dark/light mode toggle (maybe default to light for bakery)
- Toast notifications
- Form validation with Zod

### **Phase 8: Key Features Implementation Priority**

**Sprint 1 (Core Functionality):**
1. Database schema setup and migrations
2. Admin product management (CRUD)
3. Public product listing by category
4. Basic cart functionality (no checkout yet)

**Sprint 2 (E-commerce):**
1. Stripe checkout integration
2. Order creation and storage
3. Customer account (order history)
4. Admin order management

**Sprint 3 (Polish):**
1. Product image upload (Cloudflare Images)
2. Email notifications (order confirmations using existing React Email setup)
3. Featured products on homepage
4. Search/filter improvements

**Future (Scheduling):**
- Pickup time slots
- Calendar integration
- Order scheduling system

---

## **Implementation Checklist**

### **Immediate Actions:**

- [ ] Fork the repository
- [ ] Set up development environment
- [ ] Create new database schema (products, orders, categories)
- [ ] Remove credit-related code from user model
- [ ] Add role field to users table
- [ ] Create admin middleware for dashboard routes

### **Core Development:**

- [ ] Build product management UI in dashboard
- [ ] Create storefront layout and navigation
- [ ] Build product grid and card components
- [ ] Implement cart with Context API
- [ ] Set up product categories (cakes, cookies)
- [ ] Adapt Stripe integration for product checkout
- [ ] Create order confirmation flow
- [ ] Build customer account pages

### **Configuration Changes:**

- [ ] Update `src/constants.ts` with bakery details
- [ ] Modify color scheme in `src/app/globals.css`
- [ ] Update metadata in layouts
- [ ] Configure email templates for order confirmations
- [ ] Set up product image storage (Cloudflare Images)

---

## **Key Differences from Template**

| Template | Your Bakery |
|----------|-------------|
| Credit-based billing | Direct product sales |
| Subscription focus | One-time purchases |
| All users access dashboard | Admin vs. Customer separation |
| Organization management | Customer + Admin roles |
| Service usage tracking | Order + inventory management |

---

## **Potential Challenges & Solutions**

**Challenge 1**: Template is designed for SaaS, not e-commerce
**Solution**: The core infrastructure (auth, payments, database) is solid. Focus on adapting the data models and UI rather than rebuilding from scratch.

**Challenge 2**: Role-based access not deeply implemented
**Solution**: Add middleware checks for admin routes and create separate layouts for admin vs. customer areas.

**Challenge 3**: No cart/checkout flow exists
**Solution**: Build cart state management with React Context and integrate with existing Stripe setup. The template's Stripe integration is already there, just needs adaptation from credits to products.