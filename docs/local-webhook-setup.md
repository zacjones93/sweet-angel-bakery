# Local Webhook Setup Guide

## The Problem

When testing Stripe payments in local development, orders aren't created because Stripe webhooks can't reach `localhost:3000` from the internet. The webhook handler at `/api/webhooks/stripe` is never called, so orders are never created in the database.

## The Solution: Stripe CLI Forwarding

Use the Stripe CLI to forward webhook events from Stripe to your local development server.

## Setup Steps

### 1. Install Stripe CLI (if not already installed)

```bash
brew install stripe/stripe-cli/stripe
```

### 2. Login to Stripe CLI

```bash
stripe login
```

This will open your browser to authenticate.

### 3. Start Webhook Forwarding

Open a **separate terminal window** and run:

```bash
cd /Users/zacjones/Documents/02.Areas/personal/sweet-angel-bakery
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

You should see output like:

```
> Ready! Your webhook signing secret is whsec_1234abcd5678efgh...
```

**Keep this terminal running!** It needs to stay open to forward webhooks.

### 4. Update Environment Variable

Copy the webhook signing secret from step 3 and update your `.env` file:

```bash
STRIPE_WEBHOOK_SECRET=whsec_1234abcd5678efgh...
```

### 5. Restart Your Dev Server

Stop your Next.js dev server (Ctrl+C) and start it again:

```bash
pnpm dev
```

### 6. Test a Purchase

Now when you complete a test purchase:

1. ✅ Stripe will send a webhook event
2. ✅ Stripe CLI will forward it to `localhost:3000/api/webhooks/stripe`
3. ✅ Your webhook handler will create the order in the database
4. ✅ Order will appear on `/profile` and `/admin/orders`

## Verification

After completing a purchase, check the Stripe CLI terminal. You should see:

```
[200] POST /api/webhooks/stripe [evt_xxx]
```

The `[200]` means the webhook was successfully processed!

## Production Deployment

⚠️ **Important:** This is only needed for local development!

In production (Cloudflare):

- Stripe can reach your public URL directly
- No CLI forwarding needed
- Use your production webhook secret from Stripe Dashboard
- Configure the webhook endpoint in Stripe Dashboard: `https://yourdomain.com/api/webhooks/stripe`

## Troubleshooting

### Orders still not appearing?

1. **Check Stripe CLI is running**: You should see the terminal with webhook events
2. **Check webhook secret matches**: Compare `.env` with Stripe CLI output
3. **Check dev server logs**: Look for webhook processing logs
4. **Check database**: Run `pnpm wrangler d1 execute NEXT_TAG_CACHE_D1 --local --command "SELECT * FROM \"order\" ORDER BY createdAt DESC LIMIT 5"`

### Webhook returns 401 or 400?

- Webhook signature verification failed
- Double-check the `STRIPE_WEBHOOK_SECRET` in `.env` matches Stripe CLI output
- Restart dev server after updating `.env`

## Alternative: Manually Trigger Webhooks

If you need to manually process a specific checkout session:

```bash
stripe trigger checkout.session.completed
```

This will create a test event and forward it to your local webhook.
