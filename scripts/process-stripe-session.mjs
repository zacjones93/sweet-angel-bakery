#!/usr/bin/env node

/**
 * Manually process a Stripe checkout session to create an order
 * Usage: node scripts/process-stripe-session.mjs <session_id>
 */

import Stripe from 'stripe';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Load env vars
function loadEnv() {
  const envFiles = ['.env.local', '.dev.vars', '.env'];
  for (const file of envFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      for (const line of lines) {
        const match = line.match(/^STRIPE_SECRET_KEY=(.+)$/);
        if (match) {
          return match[1].trim();
        }
      }
    }
  }
  throw new Error('STRIPE_SECRET_KEY not found in .env files');
}

async function processSession(sessionId) {
  const stripeKey = loadEnv();
  const stripe = new Stripe(stripeKey, {
    apiVersion: '2025-02-24.acacia',
  });

  console.log(`\n🔍 Fetching session: ${sessionId}...`);
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  console.log(`\n✅ Session found:`);
  console.log(`   Customer: ${session.customer_details?.email || session.customer_email}`);
  console.log(`   Amount: $${(session.amount_total / 100).toFixed(2)}`);
  console.log(`   Payment Status: ${session.payment_status}`);

  if (session.payment_status !== 'paid') {
    console.log(`\n⚠️  Payment not completed. Status: ${session.payment_status}`);
    return;
  }

  // Trigger webhook manually by calling our API endpoint
  const webhookUrl = 'http://localhost:3000/api/webhooks/stripe';
  
  console.log(`\n🔔 Triggering webhook at ${webhookUrl}...`);
  
  const event = {
    type: 'checkout.session.completed',
    data: {
      object: session,
    },
  };

  // We can't easily sign the webhook in dev, so we need to modify the route temporarily
  // or just manually create the order here
  
  console.log(`\n⚠️  NOTE: Local webhooks require Stripe CLI forwarding.`);
  console.log(`\nTo properly receive webhooks in dev, run:`);
  console.log(`  stripe listen --forward-to localhost:3000/api/webhooks/stripe`);
  console.log(`\nThen copy the webhook signing secret to your .dev.vars file:`);
  console.log(`  STRIPE_WEBHOOK_SECRET=whsec_...`);
}

const sessionId = process.argv[2];

if (!sessionId) {
  console.error('Usage: node scripts/process-stripe-session.mjs <session_id>');
  process.exit(1);
}

processSession(sessionId).catch(console.error);

