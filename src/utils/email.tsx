import "server-only";

import { SITE_DOMAIN, SITE_URL } from "@/constants";
import { render } from '@react-email/render'
import { ResetPasswordEmail } from "@/react-email/reset-password";
import { VerifyEmail } from "@/react-email/verify-email";
import { MagicLinkEmail } from "@/react-email/magic-link";
import { OrderConfirmationEmail } from "@/react-email/order-confirmation";
import { AdminNewOrderEmail } from "@/react-email/admin-new-order";
import isProd from "./is-prod";
import { getDB } from "@/db";
import { eq } from "drizzle-orm";
import { userTable } from "@/db/schema";

interface BrevoEmailOptions {
  to: { email: string; name?: string }[];
  subject: string;
  replyTo?: string;
  htmlContent: string;
  textContent?: string;
  templateId?: number;
  params?: Record<string, string>;
  tags?: string[];
}

interface ResendEmailOptions {
  to: string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  text?: string;
  tags?: { name: string; value: string }[];
}

type EmailProvider = "resend" | "brevo" | null;

async function getEmailProvider(): Promise<EmailProvider> {
  if (process.env.RESEND_API_KEY) {
    return "resend";
  }

  if (process.env.BREVO_API_KEY) {
    return "brevo";
  }

  return null;
}

async function sendResendEmail({
  to,
  subject,
  html,
  from,
  replyTo: originalReplyTo,
  text,
  tags,
}: ResendEmailOptions) {
  if (!isProd) {
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set");
  }

  const replyTo = originalReplyTo ?? process.env.EMAIL_REPLY_TO;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    } as const,
    body: JSON.stringify({
      from: from ?? `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
      tags,
    }),
  });

  if (!response.ok) {
    const error = await response.json() as unknown;
    throw new Error(`Failed to send email via Resend: ${JSON.stringify(error)}`);
  }

  return response.json();
}

async function sendBrevoEmail({
  to,
  subject,
  replyTo: originalReplyTo,
  htmlContent,
  textContent,
  templateId,
  params,
  tags,
}: BrevoEmailOptions) {
  if (!isProd) {
    return;
  }

  if (!process.env.BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY is not set");
  }

  const replyTo = originalReplyTo ?? process.env.EMAIL_REPLY_TO;

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "content-type": "application/json",
      "api-key": process.env.BREVO_API_KEY,
    } as const,
    body: JSON.stringify({
      sender: {
        name: process.env.EMAIL_FROM_NAME,
        email: process.env.EMAIL_FROM,
      },
      to,
      htmlContent,
      textContent,
      subject,
      templateId,
      params,
      tags,
      ...(replyTo ? {
        replyTo: {
          email: replyTo,
        }
      } : {}),
    }),
  });

  if (!response.ok) {
    const error = await response.json() as unknown;
    throw new Error(`Failed to send email via Brevo: ${JSON.stringify(error)}`);
  }

  return response.json();
}

export async function sendPasswordResetEmail({
  email,
  resetToken,
  username
}: {
  email: string;
  resetToken: string;
  username: string;
}) {
  const resetUrl = `${SITE_URL}/reset-password?token=${resetToken}`;

  if (!isProd) {
    console.warn('\n\n\nPassword reset url: ', resetUrl)

    return
  }

  const html = await render(ResetPasswordEmail({ resetLink: resetUrl, username }));
  const provider = await getEmailProvider();

  if (!provider && isProd) {
    throw new Error("No email provider configured. Set either RESEND_API_KEY or BREVO_API_KEY in your environment.");
  }

  if (provider === "resend") {
    await sendResendEmail({
      to: [email],
      subject: `Reset your password for ${SITE_DOMAIN}`,
      html,
      tags: [{ name: "type", value: "password-reset" }],
    });
  } else {
    await sendBrevoEmail({
      to: [{ email, name: username }],
      subject: `Reset your password for ${SITE_DOMAIN}`,
      htmlContent: html,
      tags: ["password-reset"],
    });
  }
}

export async function sendVerificationEmail({
  email,
  verificationToken,
  username
}: {
  email: string;
  verificationToken: string;
  username: string;
}) {
  const verificationUrl = `${SITE_URL}/verify-email?token=${verificationToken}`;

  if (!isProd) {
    console.warn('\n\n\nVerification url: ', verificationUrl)

    return
  }

  const html = await render(VerifyEmail({ verificationLink: verificationUrl, username }));
  const provider = await getEmailProvider();

  if (!provider && isProd) {
    throw new Error("No email provider configured. Set either RESEND_API_KEY or BREVO_API_KEY in your environment.");
  }

  if (provider === "resend") {
    await sendResendEmail({
      to: [email],
      subject: `Verify your email for ${SITE_DOMAIN}`,
      html,
      tags: [{ name: "type", value: "email-verification" }],
    });
  } else {
    await sendBrevoEmail({
      to: [{ email, name: username }],
      subject: `Verify your email for ${SITE_DOMAIN}`,
      htmlContent: html,
      tags: ["email-verification"],
    });
  }
}

export async function sendMagicLinkEmail({
  email,
  magicToken,
  customerName
}: {
  email: string;
  magicToken: string;
  customerName: string;
}) {
  const magicLink = `${SITE_URL}/login/verify?token=${magicToken}`;

  if (!isProd) {
    console.log('\n=== MAGIC LINK ===\n', magicLink, '\n==================\n')
    return
  }

  const html = await render(MagicLinkEmail({
    magicLink,
    customerName
  }));

  const provider = await getEmailProvider();

  if (!provider && isProd) {
    throw new Error("No email provider configured. Set either RESEND_API_KEY or BREVO_API_KEY in your environment.");
  }

  if (provider === "resend") {
    await sendResendEmail({
      to: [email],
      subject: `Your login link for ${SITE_DOMAIN}`,
      html,
      tags: [{ name: "type", value: "magic-link" }],
    });
  } else {
    await sendBrevoEmail({
      to: [{ email, name: customerName }],
      subject: `Your login link for ${SITE_DOMAIN}`,
      htmlContent: html,
      tags: ["magic-link"],
    });
  }
}

export async function sendOrderConfirmationEmail({
  email,
  customerName,
  orderNumber,
  orderItems,
  subtotal,
  tax,
  deliveryFee,
  total,
  fulfillmentMethod,
  deliveryDate,
  deliveryTimeWindow,
  deliveryAddress,
  pickupDate,
  pickupTimeWindow,
  pickupLocation,
}: {
  email: string;
  customerName: string;
  orderNumber: string;
  orderItems: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  tax: number;
  deliveryFee?: number;
  total: number;
  fulfillmentMethod?: "delivery" | "pickup" | null;
  deliveryDate?: string | null;
  deliveryTimeWindow?: string | null;
  deliveryAddress?: string | null;
  pickupDate?: string | null;
  pickupTimeWindow?: string | null;
  pickupLocation?: {
    name: string;
    address: string;
  } | null;
}) {
  if (!isProd) {
    console.warn('\n\n\nOrder confirmation email would be sent to:', email);
    console.warn('Order #:', orderNumber);
    console.warn('Items:', orderItems);
    console.warn('Fulfillment:', fulfillmentMethod);
    return;
  }

  const html = await render(OrderConfirmationEmail({
    customerName,
    orderNumber,
    orderItems,
    subtotal,
    tax,
    deliveryFee,
    total,
    fulfillmentMethod,
    deliveryDate,
    deliveryTimeWindow,
    deliveryAddress,
    pickupDate,
    pickupTimeWindow,
    pickupLocation,
  }));

  const provider = await getEmailProvider();

  if (!provider && isProd) {
    throw new Error("No email provider configured. Set either RESEND_API_KEY or BREVO_API_KEY in your environment.");
  }

  if (provider === "resend") {
    await sendResendEmail({
      to: [email],
      subject: `Order Confirmed - Sweet Angel Bakery #${orderNumber}`,
      html,
      tags: [{ name: "type", value: "order-confirmation" }],
    });
  } else {
    await sendBrevoEmail({
      to: [{ email, name: customerName }],
      subject: `Order Confirmed - Sweet Angel Bakery #${orderNumber}`,
      htmlContent: html,
      tags: ["order-confirmation"],
    });
  }
}

export async function sendAdminNewOrderEmail({
  customerName,
  customerEmail,
  customerPhone,
  orderNumber,
  orderId,
  orderItems,
  subtotal,
  tax,
  deliveryFee,
  total,
  fulfillmentMethod,
  deliveryDate,
  deliveryTimeWindow,
  deliveryAddress,
  pickupDate,
  pickupTimeWindow,
  pickupLocation,
}: {
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  orderNumber: string;
  orderId: string;
  orderItems: Array<{
    name: string;
    quantity: number;
    price: number;
    customizations?: string | null;
  }>;
  subtotal: number;
  tax: number;
  deliveryFee?: number;
  total: number;
  fulfillmentMethod?: "delivery" | "pickup" | null;
  deliveryDate?: string | null;
  deliveryTimeWindow?: string | null;
  deliveryAddress?: string | null;
  pickupDate?: string | null;
  pickupTimeWindow?: string | null;
  pickupLocation?: {
    name: string;
    address: string;
  } | null;
}) {
  try {
    // Get all admin users with email notifications enabled
    const db = getDB();
    const admins = await db.query.userTable.findMany({
      where: eq(userTable.role, "admin"),
      columns: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        adminNotificationPreferences: true,
      },
    });

    // Filter admins who want new order notifications
    const notifyAdmins = admins.filter((admin) => {
      try {
        const prefs = JSON.parse(admin.adminNotificationPreferences) as {
          emailNewOrders?: boolean;
          newOrderEmailAddress?: string | null;
        };
        return prefs.emailNewOrders === true;
      } catch {
        return false;
      }
    });

    if (notifyAdmins.length === 0) {
      if (!isProd) {
        console.warn('\n\n\nNo admins configured to receive order notifications');
      }
      return;
    }

    if (!isProd) {
      console.warn('\n\n\nAdmin order notification would be sent to:', notifyAdmins.map(a => a.email).join(', '));
      console.warn('Order #:', orderNumber);
      console.warn('Customer:', customerName, customerEmail);
      return;
    }

    const html = await render(AdminNewOrderEmail({
      customerName,
      customerEmail,
      customerPhone,
      orderNumber,
      orderId,
      orderItems,
      subtotal,
      tax,
      deliveryFee,
      total,
      fulfillmentMethod,
      deliveryDate,
      deliveryTimeWindow,
      deliveryAddress,
      pickupDate,
      pickupTimeWindow,
      pickupLocation,
    }));

    const provider = await getEmailProvider();

    if (!provider && isProd) {
      throw new Error("No email provider configured. Set either RESEND_API_KEY or BREVO_API_KEY in your environment.");
    }

    // Send to each admin (using custom email if configured, otherwise their account email)
    for (const admin of notifyAdmins) {
      try {
        const prefs = JSON.parse(admin.adminNotificationPreferences) as {
          emailNewOrders?: boolean;
          newOrderEmailAddress?: string | null;
        };
        const targetEmail = prefs.newOrderEmailAddress || admin.email;

        if (!targetEmail) {
          console.warn(`Admin ${admin.id} has no email configured, skipping notification`);
          continue;
        }

        const adminName = admin.firstName && admin.lastName
          ? `${admin.firstName} ${admin.lastName}`
          : admin.firstName || admin.lastName || "Admin";

        if (provider === "resend") {
          await sendResendEmail({
            to: [targetEmail],
            subject: `New Order #${orderNumber} - Sweet Angel Bakery`,
            html,
            tags: [{ name: "type", value: "admin-new-order" }],
          });
        } else if (provider === "brevo") {
          await sendBrevoEmail({
            to: [{ email: targetEmail, name: adminName }],
            subject: `New Order #${orderNumber} - Sweet Angel Bakery`,
            htmlContent: html,
            tags: ["admin-new-order"],
          });
        }
      } catch (error) {
        // Log error but don't throw - we don't want to fail order creation if email fails
        console.error(`Failed to send admin notification to ${admin.email}:`, error);
      }
    }
  } catch (error) {
    // Non-blocking: log error but don't throw
    console.error('Failed to send admin order notification:', error);
  }
}
