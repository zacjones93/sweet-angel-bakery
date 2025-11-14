import {
  Body,
  Container,
  Column,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Row,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { SITE_URL } from "@/constants";

interface OrderConfirmationEmailProps {
  customerName?: string;
  orderNumber?: string;
  orderItems?: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal?: number;
  tax?: number;
  deliveryFee?: number;
  total?: number;
  fulfillmentMethod?: "delivery" | "pickup" | null;
  // Delivery fields
  deliveryDate?: string | null;
  deliveryTimeWindow?: string | null;
  deliveryAddress?: string | null;
  // Pickup fields
  pickupDate?: string | null;
  pickupTimeWindow?: string | null;
  pickupLocation?: {
    name: string;
    address: string;
  } | null;
}

export const OrderConfirmationEmail = ({
  customerName = "Valued Customer",
  orderNumber = "ABC12345",
  orderItems = [
    { name: "Chocolate Chip Cookie", quantity: 6, price: 400 },
    { name: "Cowboy Cookie", quantity: 4, price: 400 },
  ],
  subtotal = 3200,
  tax = 256,
  deliveryFee = 500,
  total = 3956,
  fulfillmentMethod = "delivery",
  deliveryDate = "2025-11-15",
  deliveryTimeWindow = "2:00 PM - 4:00 PM",
  deliveryAddress = "123 Main St\nLos Angeles, CA 90001",
  pickupDate = null,
  pickupTimeWindow = null,
  pickupLocation = null,
}: OrderConfirmationEmailProps) => {
  function formatPrice(cents: number) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  function formatDate(dateString: string | null | undefined) {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  }

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Order Confirmed!</Heading>
          <Text style={paragraph}>Hi {customerName},</Text>
          <Text style={paragraph}>
            Thank you for your order! We&apos;re excited to bake your goodies fresh
            for you.
          </Text>

          <Section style={orderBox}>
            <Text
              style={{
                color: "#1a1a1a",
                fontSize: "18px",
                fontWeight: "bold",
                margin: "0 0 16px",
                textAlign: "center" as const,
              }}
            >
              Order #{orderNumber}
            </Text>

            <Hr style={divider} />

            {orderItems.map((item, index) => (
              <Row key={index} style={itemRow}>
                <Column style={itemName}>
                  <Text style={itemText}>
                    {item.name}{" "}
                    <span style={quantityText}>x{item.quantity}</span>
                  </Text>
                </Column>
                <Column align="right" style={itemPrice}>
                  <Text style={itemText}>
                    {formatPrice(item.price * item.quantity)}
                  </Text>
                </Column>
              </Row>
            ))}

            <Hr style={divider} />

            <Row style={summaryRow}>
              <Column>
                <Text style={summaryText}>Subtotal</Text>
              </Column>
              <Column align="right">
                <Text style={summaryText}>{formatPrice(subtotal || 0)}</Text>
              </Column>
            </Row>

            <Row style={summaryRow}>
              <Column>
                <Text style={summaryText}>Tax</Text>
              </Column>
              <Column align="right">
                <Text style={summaryText}>{formatPrice(tax || 0)}</Text>
              </Column>
            </Row>

            {deliveryFee && deliveryFee > 0 && (
              <Row style={summaryRow}>
                <Column>
                  <Text style={summaryText}>Delivery Fee</Text>
                </Column>
                <Column align="right">
                  <Text style={summaryText}>{formatPrice(deliveryFee)}</Text>
                </Column>
              </Row>
            )}

            <Hr style={divider} />

            <Row style={totalRow}>
              <Column>
                <Text style={totalLabel}>Total</Text>
              </Column>
              <Column align="right">
                <Text style={totalAmount}>{formatPrice(total || 0)}</Text>
              </Column>
            </Row>
          </Section>

          {/* Fulfillment Details */}
          {fulfillmentMethod && (
            <Section style={fulfillmentBox}>
              <Text
                style={{
                  color: "#1a1a1a",
                  fontSize: "18px",
                  fontWeight: "bold",
                  margin: "0 0 16px",
                }}
              >
                {fulfillmentMethod === "delivery" ? "Delivery" : "Pickup"} Details
              </Text>

              {fulfillmentMethod === "delivery" ? (
                <>
                  {deliveryDate && (
                    <div style={{ marginBottom: "12px" }}>
                      <Text style={fulfillmentLabel}>Delivery Date</Text>
                      <Text style={fulfillmentValue}>{formatDate(deliveryDate)}</Text>
                    </div>
                  )}

                  {deliveryTimeWindow && (
                    <div style={{ marginBottom: "12px" }}>
                      <Text style={fulfillmentLabel}>Delivery Window</Text>
                      <Text style={fulfillmentValue}>{deliveryTimeWindow}</Text>
                    </div>
                  )}

                  {deliveryAddress && (
                    <div style={{ marginBottom: "12px" }}>
                      <Text style={fulfillmentLabel}>Delivery Address</Text>
                      <Text style={{ ...fulfillmentValue, whiteSpace: "pre-line" as const }}>
                        {deliveryAddress}
                      </Text>
                    </div>
                  )}
                </>
              ) : fulfillmentMethod === "pickup" ? (
                <>
                  {pickupDate && (
                    <div style={{ marginBottom: "12px" }}>
                      <Text style={fulfillmentLabel}>Pickup Date</Text>
                      <Text style={fulfillmentValue}>{formatDate(pickupDate)}</Text>
                    </div>
                  )}

                  {pickupTimeWindow && (
                    <div style={{ marginBottom: "12px" }}>
                      <Text style={fulfillmentLabel}>Pickup Window</Text>
                      <Text style={fulfillmentValue}>{pickupTimeWindow}</Text>
                    </div>
                  )}

                  {pickupLocation && (
                    <div style={{ marginBottom: "12px" }}>
                      <Text style={fulfillmentLabel}>Pickup Location</Text>
                      <Text style={{ ...fulfillmentValue, fontWeight: "600" }}>
                        {pickupLocation.name}
                      </Text>
                      <Text style={{ ...fulfillmentValue, whiteSpace: "pre-line" as const }}>
                        {pickupLocation.address}
                      </Text>
                    </div>
                  )}
                </>
              ) : null}
            </Section>
          )}

          <Text style={paragraph}>
            We&apos;ll send you an email when your order is ready for pickup or out
            for delivery.
          </Text>

          <Text style={paragraph}>
            <strong>Loyalty Program Member?</strong> You now have access to:
          </Text>
          <ul style={benefitsList}>
            <li>Order history and tracking</li>
            <li>Early access to product drops</li>
            <li>Exclusive product notifications</li>
          </ul>

          <Section style={buttonContainer}>
            <Link style={button} href={`${SITE_URL}/login`}>
              View Your Orders
            </Link>
          </Section>

          <Text style={paragraph}>
            Have questions? Reply to this email and we&apos;ll be happy to help!
          </Text>

          <Text style={footer}>Sweet Angel Bakery • {SITE_URL}</Text>
        </Container>
      </Body>
    </Html>
  );
};

// Preview for Delivery order
OrderConfirmationEmail.PreviewProps = {
  customerName: "Sarah Johnson",
  orderNumber: "SAB12345",
  orderItems: [
    {
      name: "Whiskey Rye Salted Chocolate Chip Cookie",
      quantity: 6,
      price: 400,
    },
    { name: "Cinnamon Roll Cookie", quantity: 4, price: 400 },
    { name: "Cookie Gift Box", quantity: 1, price: 1800 },
  ],
  subtotal: 5800,
  tax: 522,
  deliveryFee: 500,
  total: 6822,
  fulfillmentMethod: "delivery",
  deliveryDate: "2025-11-15",
  deliveryTimeWindow: "2:00 PM - 4:00 PM",
  deliveryAddress: "123 Main Street\nLos Angeles, CA 90001",
  pickupDate: null,
  pickupTimeWindow: null,
  pickupLocation: null,
} as OrderConfirmationEmailProps;

// Uncomment below to preview Pickup order instead
/*
OrderConfirmationEmail.PreviewProps = {
  customerName: "Sarah Johnson",
  orderNumber: "SAB12345",
  orderItems: [
    {
      name: "Whiskey Rye Salted Chocolate Chip Cookie",
      quantity: 6,
      price: 400,
    },
    { name: "Cinnamon Roll Cookie", quantity: 4, price: 400 },
  ],
  subtotal: 3200,
  tax: 288,
  deliveryFee: undefined,
  total: 3488,
  fulfillmentMethod: "pickup",
  deliveryDate: null,
  deliveryTimeWindow: null,
  deliveryAddress: null,
  pickupDate: "2025-11-16",
  pickupTimeWindow: "10:00 AM - 12:00 PM",
  pickupLocation: {
    name: "Sweet Angel Bakery - Main Location",
    address: "456 Bakery Lane\nLos Angeles, CA 90012",
  },
} as OrderConfirmationEmailProps;
*/

export default OrderConfirmationEmail;

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

const orderBox = {
  backgroundColor: "#f8f9fa",
  border: "1px solid #e9ecef",
  borderRadius: "6px",
  padding: "24px",
  margin: "24px 0",
};

const divider = {
  borderColor: "#e9ecef",
  margin: "16px 0",
};

const itemRow = {
  margin: "12px 0",
};

const itemName = {
  verticalAlign: "middle" as const,
};

const itemPrice = {
  verticalAlign: "middle" as const,
  width: "100px",
};

const itemText = {
  color: "#525f7f",
  fontSize: "15px",
  lineHeight: "20px",
  margin: "0",
};

const quantityText = {
  color: "#8898aa",
  fontSize: "14px",
};

const summaryRow = {
  marginTop: "4px",
};

const summaryText = {
  color: "#525f7f",
  fontSize: "15px",
  margin: "0",
};

const totalRow = {
  marginTop: "8px",
};

const totalLabel = {
  color: "#1a1a1a",
  fontSize: "18px",
  fontWeight: "bold",
  margin: "0",
};

const totalAmount = {
  color: "#1a1a1a",
  fontSize: "20px",
  fontWeight: "bold",
  margin: "0",
};

const fulfillmentBox = {
  backgroundColor: "#f0f9ff",
  border: "1px solid #bae6fd",
  borderRadius: "6px",
  padding: "24px",
  margin: "24px 0",
};

const fulfillmentLabel = {
  color: "#64748b",
  fontSize: "13px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 4px 0",
};

const fulfillmentValue = {
  color: "#1a1a1a",
  fontSize: "15px",
  lineHeight: "22px",
  margin: "0",
};

const benefitsList = {
  color: "#525f7f",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "8px 0 16px 20px",
  padding: "0",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#000",
  borderRadius: "6px",
  color: "#fff",
  display: "inline-block",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  padding: "14px 32px",
};

const footer = {
  color: "#8898aa",
  fontSize: "14px",
  lineHeight: "20px",
  textAlign: "center" as const,
  margin: "32px 0 0",
};
