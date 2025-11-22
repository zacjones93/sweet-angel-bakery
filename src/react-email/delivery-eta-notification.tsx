import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { SITE_URL } from "@/constants";
import { format, parseISO } from "date-fns";

interface DeliveryETANotificationEmailProps {
  customerName?: string;
  orderNumber?: string;
  deliveryDate?: string; // ISO date "2025-11-26"
  deliveryTimeWindow?: string; // "4:00 PM - 8:00 PM"
  deliveryAddress?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  deliveryInstructions?: string;
}

export const DeliveryETANotificationEmail = ({
  customerName = "Valued Customer",
  orderNumber = "ABC12345",
  deliveryDate = "2025-11-26",
  deliveryTimeWindow = "4:00 PM - 8:00 PM",
  deliveryAddress = {
    street: "123 Main St",
    city: "Boise",
    state: "ID",
    zip: "83702",
  },
  deliveryInstructions,
}: DeliveryETANotificationEmailProps) => {
  const addressString = `${deliveryAddress.street}, ${deliveryAddress.city}, ${deliveryAddress.state} ${deliveryAddress.zip}`;

  // Format delivery date and time window for display
  const formattedDate = deliveryDate
    ? format(parseISO(deliveryDate), "EEEE, MMMM d, yyyy")
    : "Your scheduled delivery date";

  const estimatedArrival = deliveryTimeWindow
    ? `${formattedDate} between ${deliveryTimeWindow}`
    : formattedDate;

  const orderTrackingUrl = `${SITE_URL}/profile/orders/${orderNumber}`;

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>🚗 Your Order is On The Way!</Heading>
          <Text style={paragraph}>Hi {customerName},</Text>
          <Text style={paragraph}>
            Great news! Your order is being prepared for delivery and we wanted
            to give you a heads up about when to expect it.
          </Text>

          <Section style={etaBox}>
            <Text style={etaLabel}>Estimated Delivery</Text>
            <Text style={etaTime}>{estimatedArrival}</Text>
            <Hr style={divider} />
            <Text style={orderNumberText}>Order #{orderNumber}</Text>
          </Section>

          <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
            <Button style={button} href={orderTrackingUrl}>
              Track Your Order
            </Button>
          </Section>

          <Section style={addressBox}>
            <Text style={addressLabel}>Delivery Address</Text>
            <Text style={addressText}>{addressString}</Text>
            {deliveryInstructions && (
              <>
                <Text style={{ ...addressLabel, marginTop: "16px" }}>
                  Delivery Instructions
                </Text>
                <Text style={addressText}>{deliveryInstructions}</Text>
              </>
            )}
          </Section>

          <Text style={paragraph}>
            <strong>Please keep an eye out for our delivery!</strong> We&apos;ll do
            our best to arrive within the estimated timeframe, but traffic and
            other factors may cause slight delays.
          </Text>

          <Text style={paragraph}>
            If you have any questions or need to update your delivery
            instructions, please reply to this email or give us a call.
          </Text>

          <Text style={footer}>Sweet Angel Bakery • {SITE_URL}</Text>
        </Container>
      </Body>
    </Html>
  );
};

DeliveryETANotificationEmail.PreviewProps = {
  customerName: "Sarah Johnson",
  orderNumber: "SAB12345",
  deliveryDate: "2025-11-26",
  deliveryTimeWindow: "4:00 PM - 8:00 PM",
  deliveryAddress: {
    street: "456 Elm Street",
    city: "Boise",
    state: "ID",
    zip: "83702",
  },
  deliveryInstructions: "Please leave on front porch if no answer",
} as DeliveryETANotificationEmailProps;

export default DeliveryETANotificationEmail;

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  padding: "30px 0",
};

const container = {
  backgroundColor: "#ffffff",
  border: "1px solid #f0f0f0",
  borderRadius: "8px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  maxWidth: "600px",
  margin: "0 auto",
  padding: "40px",
};

const heading = {
  color: "#1a1a1a",
  fontSize: "28px",
  fontWeight: "bold",
  textAlign: "center" as const,
  margin: "0 0 30px",
};

const paragraph = {
  color: "#525f7f",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "16px 0",
};

const etaBox = {
  backgroundColor: "#f0f9ff",
  border: "2px solid #0ea5e9",
  borderRadius: "8px",
  padding: "24px",
  margin: "24px 0",
  textAlign: "center" as const,
};

const etaLabel = {
  color: "#0c4a6e",
  fontSize: "14px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 8px",
};

const etaTime = {
  color: "#0369a1",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "0 0 16px",
};

const orderNumberText = {
  color: "#64748b",
  fontSize: "14px",
  margin: "0",
};

const divider = {
  borderColor: "#bae6fd",
  margin: "16px 0",
};

const addressBox = {
  backgroundColor: "#f8f9fa",
  border: "1px solid #e9ecef",
  borderRadius: "6px",
  padding: "20px",
  margin: "24px 0",
};

const addressLabel = {
  color: "#1a1a1a",
  fontSize: "14px",
  fontWeight: "600",
  margin: "0 0 8px",
};

const addressText = {
  color: "#525f7f",
  fontSize: "15px",
  lineHeight: "22px",
  margin: "0",
};

const footer = {
  color: "#8898aa",
  fontSize: "14px",
  lineHeight: "20px",
  textAlign: "center" as const,
  margin: "32px 0 0",
};

const button = {
  backgroundColor: "#0ea5e9",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 32px",
};
