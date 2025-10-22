import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getMerchantProvider } from "@/lib/merchant-provider/factory";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  try {
    const provider = await getMerchantProvider();

    // Verify webhook signature and parse event
    const event = await provider.verifyWebhook(body, signature);

    console.log(`[Webhook] Handling ${event.type} event`);

    // Handle webhook event
    const result = await provider.handleWebhook(event);

    if (result.processed) {
      console.log(`[Webhook] Successfully processed event ${event.id}`);
      if (result.orderId) {
        console.log(`[Webhook] Created/updated order ${result.orderId}`);
      }
    } else {
      console.log(`[Webhook] Event ${event.type} not processed (not relevant)`);
    }

    return NextResponse.json({ received: true, processed: result.processed });
  } catch (err) {
    console.error("[Webhook] Error processing webhook:", err);
    console.error("[Webhook] Error details:", err instanceof Error ? err.message : String(err));
    console.error("[Webhook] Error stack:", err instanceof Error ? err.stack : 'No stack trace');
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
