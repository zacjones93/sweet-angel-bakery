# Order Status System

## Overview

The bakery order management system tracks orders using **two separate status fields**:

1. **Payment Status** - Critical financial data tracking payment state
2. **Order Fulfillment Status** - Workflow tracking from confirmation to completion

This separation ensures payment information is never lost during the fulfillment workflow.

## Payment Status

Payment status is tracked separately and never changes during order fulfillment:

1. **PENDING** (`pending`) - Awaiting payment
2. **PAID** (`paid`) - Payment successful
3. **FAILED** (`failed`) - Payment failed
4. **REFUNDED** (`refunded`) - Payment refunded

## Order Fulfillment Status

### Initial States

1. **PENDING** (`pending`) - Order placed, awaiting bakery confirmation
2. **CONFIRMED** (`confirmed`) - Order confirmed by bakery staff

### Production States

5. **IN_PRODUCTION** (`in_production`) - Order is being worked on (for custom items)
6. **BAKING** (`baking`) - Items are in the oven
7. **BAKED** (`baked`) - Items finished baking
8. **COOLING** (`cooling`) - Items are cooling
9. **DECORATING** (`decorating`) - Custom decorations being applied
10. **PACKAGING** (`packaging`) - Order being packaged

### Fulfillment States

11. **READY_FOR_PICKUP** (`ready_for_pickup`) - Ready for customer pickup
12. **OUT_FOR_DELIVERY** (`out_for_delivery`) - Order is being delivered
13. **COMPLETED** (`completed`) - Order fulfilled

### Terminal States

14. **CANCELLED** (`cancelled`) - Order cancelled

## Status Workflow

### Typical Order Flow (Standard Products)

**Payment**: `PENDING` → `PAID`
**Fulfillment**: `PENDING` → `CONFIRMED` → `BAKING` → `BAKED` → `PACKAGING` → `READY_FOR_PICKUP` → `COMPLETED`

### Custom Order Flow

**Payment**: `PENDING` → `PAID`
**Fulfillment**: `PENDING` → `CONFIRMED` → `IN_PRODUCTION` → `BAKING` → `BAKED` → `COOLING` → `DECORATING` → `PACKAGING` → `READY_FOR_PICKUP` → `COMPLETED`

### Delivery Flow

**Payment**: `PENDING` → `PAID`
**Fulfillment**: ... → `PACKAGING` → `OUT_FOR_DELIVERY` → `COMPLETED`

**Note**: Payment status and fulfillment status are independent. Payment status tracks whether the order has been paid for, while fulfillment status tracks the bakery workflow.

## Admin Interface

### Order Management Page

Location: `/admin/orders`

Features:

- View all orders with pagination
- Search by customer name, email, or order ID
- Filter by status
- Quick status updates
- View order details

### Order Detail Page

Location: `/admin/orders/[orderId]`

Features:

- Complete order information
- Customer details
- Order items with images
- Status update dialog
- Order timeline (planned)

## Email Notifications (Future Feature)

The status system is designed to support automated email notifications. When implemented, customers will receive emails at key stages:

- **PAID**: Payment confirmation
- **CONFIRMED**: Order confirmation from bakery
- **BAKING**: Items are being baked
- **BAKED**: Items finished baking (for custom orders)
- **READY_FOR_PICKUP**: Order ready for pickup
- **OUT_FOR_DELIVERY**: Order is on the way
- **COMPLETED**: Order fulfilled

### Implementation Notes

Email notification hooks are prepared in `src/app/(admin)/admin/_actions/orders.action.ts` in the `updateOrderStatusAction` function. To implement:

1. Create email templates in `src/react-email/`
2. Add email sending logic in `src/utils/email.tsx`
3. Uncomment and implement the TODO section in the action

## UI Components

### OrderStatusBadge

Displays the current status with appropriate color coding.

Location: `src/app/(admin)/admin/orders/_components/order-status-badge.tsx`

### UpdateOrderStatusDialog

Modal dialog for updating order status with a dropdown selector.

Location: `src/app/(admin)/admin/orders/_components/update-order-status-dialog.tsx`

### OrdersTable

Displays orders in a table with search, filter, and pagination.

Location: `src/app/(admin)/admin/orders/_components/orders-table.tsx`

## Database Schema

Orders now have two separate status fields:

```sql
CREATE TABLE `order` (
  `id` text PRIMARY KEY NOT NULL,
  `paymentStatus` text DEFAULT 'pending' NOT NULL, -- Payment state
  `status` text DEFAULT 'pending' NOT NULL,         -- Fulfillment workflow
  -- other fields...
);
```

Both status fields have validation through Drizzle ORM's enum constraints. Payment status should never be modified by fulfillment workflow updates.

## API Actions

### getOrdersAction

Fetch orders with pagination, search, and filtering.

### getOrderByIdAction

Get detailed information about a specific order.

### updateOrderStatusAction

Update the status of an order (admin only).

### getOrderStatsAction

Get statistics about orders (total count, revenue, in-progress orders).

## Security

- All order management actions require admin authentication
- Role check: `session.user.role === ROLES_ENUM.ADMIN`
- Uses server-side validation with Zod schemas

## Future Enhancements

1. **Order Timeline**: Track all status changes with timestamps
2. **Email Notifications**: Automated customer notifications
3. **Bulk Status Updates**: Update multiple orders at once
4. **Status Notes**: Add notes when changing status
5. **Status Rules**: Enforce valid status transitions
6. **Audit Log**: Track who changed what and when
