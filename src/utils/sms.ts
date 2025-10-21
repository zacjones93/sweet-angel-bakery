import "server-only";

import isProd from "./is-prod";

type SMSProvider = "sns" | "vonage" | null;

interface SendSMSOptions {
  to: string;
  message: string;
}

/**
 * Determine which SMS provider is configured
 */
async function getSMSProvider(): Promise<SMSProvider> {
  if (process.env.AWS_SNS_ACCESS_KEY && process.env.AWS_SNS_SECRET_KEY) {
    return "sns";
  }

  if (process.env.VONAGE_API_KEY && process.env.VONAGE_API_SECRET) {
    return "vonage";
  }

  return null;
}

/**
 * Send SMS via Amazon SNS (cheapest option ~$0.006/SMS)
 */
async function sendSNSMessage({ to, message }: SendSMSOptions) {
  if (!process.env.AWS_SNS_ACCESS_KEY || !process.env.AWS_SNS_SECRET_KEY) {
    throw new Error("AWS SNS credentials not configured");
  }

  const region = process.env.AWS_REGION || "us-east-1";

  // Note: This is a placeholder. In production, you would use the AWS SDK
  // or implement proper AWS Signature V4 signing
  // For now, this shows the structure needed

  const endpoint = `https://sns.${region}.amazonaws.com/`;

  // AWS SNS requires proper signature - this is simplified
  // In production, use @aws-sdk/client-sns
  const params = new URLSearchParams({
    Action: "Publish",
    Message: message,
    PhoneNumber: to,
    Version: "2010-03-31",
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send SMS via SNS: ${error}`);
  }

  return response.text();
}

/**
 * Send SMS via Vonage (formerly Nexmo) (~$0.0076/SMS)
 */
async function sendVonageMessage({ to, message }: SendSMSOptions) {
  if (!process.env.VONAGE_API_KEY || !process.env.VONAGE_API_SECRET) {
    throw new Error("Vonage API credentials not configured");
  }

  const response = await fetch("https://rest.nexmo.com/sms/json", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.SMS_FROM_NUMBER || "SweetAngel",
      to,
      text: message,
      api_key: process.env.VONAGE_API_KEY,
      api_secret: process.env.VONAGE_API_SECRET,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to send SMS via Vonage: ${JSON.stringify(error)}`);
  }

  return response.json();
}

/**
 * Send SMS notification
 */
export async function sendSMS({ to, message }: SendSMSOptions) {
  if (!isProd) {
    console.warn("\n\n\nSMS would be sent to:", to);
    console.warn("Message:", message);
    return;
  }

  const provider = await getSMSProvider();

  if (!provider) {
    console.warn("No SMS provider configured. Skipping SMS send.");
    return;
  }

  try {
    if (provider === "sns") {
      await sendSNSMessage({ to, message });
    } else if (provider === "vonage") {
      await sendVonageMessage({ to, message });
    }
  } catch (error) {
    console.error("Failed to send SMS:", error);
    // Don't throw - SMS is optional, we don't want to break the flow
  }
}

/**
 * Send order confirmation SMS
 */
export async function sendOrderConfirmationSMS({
  to,
  orderNumber,
  customerName,
}: {
  to: string;
  orderNumber: string;
  customerName: string;
}) {
  const message = `Hi ${customerName}! Your Sweet Angel Bakery order #${orderNumber} has been confirmed. We'll notify you when it's ready. Reply STOP to opt out.`;
  await sendSMS({ to, message });
}

/**
 * Send order ready SMS
 */
export async function sendOrderReadySMS({
  to,
  orderNumber,
  customerName,
}: {
  to: string;
  orderNumber: string;
  customerName: string;
}) {
  const message = `Hi ${customerName}! Your order #${orderNumber} is ready for pickup at Sweet Angel Bakery. See you soon!`;
  await sendSMS({ to, message });
}

/**
 * Send product drop notification SMS
 */
export async function sendDropNotificationSMS({
  to,
  dropName,
  earlyAccessTime,
}: {
  to: string;
  dropName: string;
  earlyAccessTime: string;
}) {
  const message = `Loyalty Member Early Access! ${dropName} drops ${earlyAccessTime}. Shop before the public at sweetangelbakery.com. Reply STOP to opt out.`;
  await sendSMS({ to, message });
}

/**
 * Format phone number for SMS (E.164 format)
 * Example: (555) 123-4567 -> +15551234567
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const digits = phone.replace(/\D/g, "");

  // If it doesn't start with country code, assume US (+1)
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // If it starts with 1 and has 11 digits, add +
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  // Otherwise return as-is (already formatted or international)
  return digits.startsWith("+") ? phone : `+${digits}`;
}
