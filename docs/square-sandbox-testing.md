# Square Sandbox Testing Guide

## Understanding the Testing Panel

When you checkout in **Square Sandbox environment**, you'll see a "Checkout API Sandbox Testing Panel" instead of the real payment form. This is **intentional** and **only appears in sandbox mode**.

### What You See in Sandbox

![Testing Panel](square-testing-panel.png)

The panel shows:
- **Overview** - Checkout summary
- **Test Payment** - Simulate payment scenarios
- **Checkout Complete** - Post-payment actions

### What Customers See in Production

In production (`SQUARE_ENVIRONMENT=production`), customers see:
- Real Square payment form
- Card input fields
- Apple Pay / Google Pay options
- Professional Square branding

## How to Test Payments

### Option 1: Use the Testing Panel (Recommended)

1. Click **"Preview Checkout"** to see the real payment form
2. Click **"Complete"** to simulate a successful payment
3. Webhooks will fire automatically
4. Customer redirected to success page

### Option 2: Preview the Real Checkout

1. Click **"Preview Checkout"** button
2. See the actual payment form customers will use
3. Use test card: `4111 1111 1111 1111`
4. Complete the test payment

## Getting Webhook Signature Key

To stop the `Missing SQUARE_WEBHOOK_SIGNATURE_KEY` errors:

### Step 1: Create Webhook in Square Dashboard

1. Go to [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Select your app
3. Click **"Webhooks"** in sidebar
4. Click **"Add Subscription"** or **"Add Endpoint"**

### Step 2: Configure Webhook

**For Local Development (using ngrok):**

1. Install ngrok: `brew install ngrok`
2. In terminal: `ngrok http 3000`
3. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
4. Webhook URL: `https://abc123.ngrok.io/api/webhooks/square`

**For Deployed App:**
- Webhook URL: `https://yourdomain.com/api/webhooks/square`

### Step 3: Select Events

Check these events:
- ✅ `payment.created`
- ✅ `payment.updated`
- ✅ `order.created`
- ✅ `order.updated`

### Step 4: Get Signature Key

After creating the webhook:
1. Click on your webhook endpoint
2. Copy the **"Signature Key"**
3. Add to `.dev.vars`:
   ```bash
   SQUARE_WEBHOOK_SIGNATURE_KEY=your-signature-key-here
   ```

## Test Payment Scenarios

The testing panel lets you simulate different scenarios:

### Successful Payment
1. Click **"Complete"** in testing panel
2. Webhook `payment.updated` fires with status `COMPLETED`
3. Order created in your database
4. Customer redirected to success page

### Failed Payment
1. Use test card: `4000 0000 0000 0002`
2. Payment will fail
3. Webhook fires with status `FAILED`

### Partial Payment
1. Not typically used in e-commerce
2. Available for restaurant/bar tabs

## Common Issues

### Issue 1: Webhooks Not Firing

**Symptom**: No webhooks received after payment

**Solutions**:
- ✅ Check webhook URL is HTTPS (required)
- ✅ For local dev, use ngrok
- ✅ Verify events are selected in Square dashboard
- ✅ Check webhook signature key matches

### Issue 2: "Missing SQUARE_WEBHOOK_SIGNATURE_KEY"

**Solution**: Add signature key to `.dev.vars` (see Step 4 above)

### Issue 3: "Invalid webhook signature"

**Solutions**:
- ✅ Signature key must exactly match Square dashboard
- ✅ No extra spaces or quotes
- ✅ Restart dev server after changing `.dev.vars`

### Issue 4: Redirect URL Shows `{CHECKOUT_SESSION_ID}`

**Symptom**: URL shows literal `{CHECKOUT_SESSION_ID}` instead of actual ID

**Explanation**: This is a **Square placeholder**. Square doesn't replace it like Stripe does. Instead:
- Order ID is in webhook event
- Get session from Square API if needed
- Or pass data via `metadata` field

**Workaround**: Update success URL to not require session ID:
```typescript
successUrl: `${SITE_URL}/purchase/thanks`
// Instead of:
successUrl: `${SITE_URL}/purchase/thanks?session_id={CHECKOUT_SESSION_ID}`
```

## Sandbox vs Production

### Sandbox (Testing)
```bash
SQUARE_ENVIRONMENT=sandbox
SQUARE_ACCESS_TOKEN=EAAAl...  # Sandbox token
```

**Features:**
- ✅ Testing panel UI
- ✅ No real money
- ✅ Test cards work
- ✅ Instant webhook delivery

### Production (Live)
```bash
SQUARE_ENVIRONMENT=production
SQUARE_ACCESS_TOKEN=EAAAl...  # Production token
```

**Features:**
- ✅ Real payment form
- ✅ Real money transactions
- ✅ Real customer cards
- ✅ Real-time webhook delivery

## Testing Checklist

Before going to production:

- [ ] Test successful payment in sandbox
- [ ] Verify webhook fires and order created
- [ ] Test failed payment scenario
- [ ] Check email confirmation sent
- [ ] Verify inventory reduced
- [ ] Check merchant fee recorded
- [ ] Test with different products
- [ ] Test with size variants
- [ ] Verify customer redirect works
- [ ] Check order appears in admin panel
- [ ] Test refund (if implemented)

## Resources

- [Square Sandbox Testing](https://developer.squareup.com/docs/devtools/sandbox/overview)
- [Test Values](https://developer.squareup.com/docs/testing/test-values)
- [Webhooks Overview](https://developer.squareup.com/docs/webhooks/overview)
- [Payment Links Guide](https://developer.squareup.com/docs/online-checkout/payment-links)

---

**Last Updated**: October 23, 2025
