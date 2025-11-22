import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getMerchantProvider } from "@/lib/merchant-provider/factory";

// NOTE: This webhook is currently NOT the primary payment flow.
// The main checkout uses Web Payments SDK via src/app/(storefront)/_actions/create-square-payment.action.ts
// This webhook serves as a fallback for any payments not created through the checkout page.
export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("x-square-hmacsha256-signature");

  console.log("[Square Webhook] Incoming request:");
  console.log("  - All headers:", Object.fromEntries(headersList.entries()));
  console.log("  - Request URL:", req.url);
  console.log("  - Origin:", req.nextUrl.origin);
  console.log("  - Pathname:", req.nextUrl.pathname);

  if (!signature) {
    return NextResponse.json(
      { error: "Missing x-square-hmacsha256-signature header" },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (!webhookSecret) {
    console.warn("[Square Webhook] SQUARE_WEBHOOK_SIGNATURE_KEY not configured - ignoring webhook");
    // Return 200 to prevent Square from retrying
    // This happens during local development before webhooks are set up
    return NextResponse.json(
      {
        received: true,
        processed: false,
        message: "Webhook secret not configured"
      },
      { status: 200 }
    );
  }

  try {
    const provider = await getMerchantProvider();

    // Verify that we're actually using Square provider
    if (provider.name !== "square") {
      console.warn(
        `[Square Webhook] Received Square webhook but provider is ${provider.name}`
      );
      return NextResponse.json(
        { error: "Square provider not active" },
        { status: 400 }
      );
    }

    // Get the full webhook URL for signature verification
    // Square calculates signature from: notification_url + request_body
    // IMPORTANT: Must match exactly what's configured in Square Dashboard

    // Use x-forwarded-host if available (for ngrok/proxies)
    const forwardedHost = headersList.get("x-forwarded-host");
    const forwardedProto = headersList.get("x-forwarded-proto") || "https";

    const webhookUrl = forwardedHost
      ? `${forwardedProto}://${forwardedHost}${req.nextUrl.pathname}`
      : `${req.nextUrl.origin}${req.nextUrl.pathname}`;

    console.log("[Square Webhook] Constructed webhook URL:", webhookUrl);

    // Verify webhook signature and parse event
    const event = await provider.verifyWebhook(body, signature, webhookUrl);

    console.log(`[Square Webhook] Handling ${event.type} event (ID: ${event.id})`);

    // Handle webhook event
    const result = await provider.handleWebhook(event);

    if (result.processed) {
      console.log(`[Square Webhook] Successfully processed event ${event.id}`);
      if (result.orderId) {
        console.log(`[Square Webhook] Created/updated order ${result.orderId}`);
        if (result.feeInfo) {
          console.log(
            `[Square Webhook] Fee tracked: $${(result.feeInfo.totalFee / 100).toFixed(2)} ` +
            `(Net: $${(result.feeInfo.netAmount / 100).toFixed(2)})`
          );
        }
      }
    } else {
      console.log(
        `[Square Webhook] Event ${event.type} not processed (not relevant or incomplete)`
      );
    }

    return NextResponse.json({
      received: true,
      processed: result.processed,
      eventId: event.id,
      eventType: event.type,
    });
  } catch (err) {
    console.error("[Square Webhook] Error processing webhook:", err);
    console.error(
      "[Square Webhook] Error details:",
      err instanceof Error ? err.message : String(err)
    );
    console.error(
      "[Square Webhook] Error stack:",
      err instanceof Error ? err.stack : "No stack trace"
    );
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
