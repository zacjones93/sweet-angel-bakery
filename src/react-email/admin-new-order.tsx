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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sweetangelbakery.com";
const BUSINESS_TIMEZONE = "America/Boise";

interface AdminNewOrderEmailProps {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string | null;
  orderNumber?: string;
  orderId?: string;
  orderItems?: Array<{
    name: string;
    quantity: number;
    price: number;
    customizations?: string | null;
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

export const AdminNewOrderEmail = ({
  customerName = "John Doe",
  customerEmail = "customer@example.com",
  customerPhone = "(555) 123-4567",
  orderNumber = "ABC12345",
  orderId = "order_abc123",
  orderItems = [
    { name: "Chocolate Chip Cookie", quantity: 6, price: 400, customizations: null },
    { name: "Cowboy Cookie", quantity: 4, price: 400, customizations: "Extra chocolate chips" },
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
}: AdminNewOrderEmailProps) => {
  function formatPrice(cents: number) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  function formatDate(dateString: string | null | undefined) {
    if (!dateString) return "";
    try {
      // Parse ISO date string (YYYY-MM-DD) as Mountain Time
      const dateWithTime = dateString.includes('T') ? dateString : `${dateString}T00:00:00`;
      const date = new Date(dateWithTime);

      return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: BUSINESS_TIMEZONE,
      });
    } catch {
      return dateString;
    }
  }

  const adminPanelUrl = `${SITE_URL}/admin/orders/${orderId}`;

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>New Order Received</Heading>

          <Section style={alertBox}>
            <Text style={alertText}>
              A new order has been placed and is ready for processing.
            </Text>
          </Section>

          {/* Customer Information */}
          <Section style={customerBox}>
            <Text style={sectionTitle}>Customer Information</Text>
            <div style={{ marginBottom: "8px" }}>
              <Text style={label}>Name</Text>
              <Text style={value}>{customerName}</Text>
            </div>
            <div style={{ marginBottom: "8px" }}>
              <Text style={label}>Email</Text>
              <Text style={value}>{customerEmail}</Text>
            </div>
            {customerPhone && (
              <div style={{ marginBottom: "8px" }}>
                <Text style={label}>Phone</Text>
                <Text style={value}>{customerPhone}</Text>
              </div>
            )}
          </Section>

          {/* Order Details */}
          <Section style={orderBox}>
            <Text style={sectionTitle}>Order #{orderNumber}</Text>

            <Hr style={divider} />

            {orderItems.map((item, index) => (
              <div key={index} style={{ marginBottom: "16px" }}>
                <Row style={itemRow}>
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
                {item.customizations && (
                  <Text style={customizationsText}>
                    Customizations: {item.customizations}
                  </Text>
                )}
              </div>
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
              <Text style={sectionTitle}>
                {fulfillmentMethod === "delivery" ? "Delivery" : "Pickup"} Details
              </Text>

              {fulfillmentMethod === "delivery" ? (
                <>
                  {deliveryDate && (
                    <div style={{ marginBottom: "12px" }}>
                      <Text style={label}>Delivery Date</Text>
                      <Text style={value}>{formatDate(deliveryDate)}</Text>
                    </div>
                  )}

                  {deliveryTimeWindow && (
                    <div style={{ marginBottom: "12px" }}>
                      <Text style={label}>Delivery Window</Text>
                      <Text style={value}>{deliveryTimeWindow}</Text>
                    </div>
                  )}

                  {deliveryAddress && (
                    <div style={{ marginBottom: "12px" }}>
                      <Text style={label}>Delivery Address</Text>
                      <Text style={{ ...value, whiteSpace: "pre-line" as const }}>
                        {deliveryAddress}
                      </Text>
                    </div>
                  )}
                </>
              ) : fulfillmentMethod === "pickup" ? (
                <>
                  {pickupDate && (
                    <div style={{ marginBottom: "12px" }}>
                      <Text style={label}>Pickup Date</Text>
                      <Text style={value}>{formatDate(pickupDate)}</Text>
                    </div>
                  )}

                  {pickupTimeWindow && (
                    <div style={{ marginBottom: "12px" }}>
                      <Text style={label}>Pickup Window</Text>
                      <Text style={value}>{pickupTimeWindow}</Text>
                    </div>
                  )}

                  {pickupLocation && (
                    <div style={{ marginBottom: "12px" }}>
                      <Text style={label}>Pickup Location</Text>
                      <Text style={{ ...value, fontWeight: "600" }}>
                        {pickupLocation.name}
                      </Text>
                      <Text style={{ ...value, whiteSpace: "pre-line" as const }}>
                        {pickupLocation.address}
                      </Text>
                    </div>
                  )}
                </>
              ) : null}
            </Section>
          )}

          <Section style={buttonContainer}>
            <Link style={button} href={adminPanelUrl}>
              View Order in Admin Panel
            </Link>
          </Section>

          <Text style={footer}>
            Sweet Angel Bakery Admin • {SITE_URL}/admin
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

// Preview for Admin notification
AdminNewOrderEmail.PreviewProps = {
  customerName: "Sarah Johnson",
  customerEmail: "sarah.johnson@example.com",
  customerPhone: "(555) 987-6543",
  orderNumber: "SAB12345",
  orderId: "order_abc123xyz",
  orderItems: [
    {
      name: "Whiskey Rye Salted Chocolate Chip Cookie",
      quantity: 6,
      price: 400,
      customizations: null,
    },
    {
      name: "Cinnamon Roll Cookie",
      quantity: 4,
      price: 400,
      customizations: "Extra frosting, Add sprinkles",
    },
    {
      name: "Cookie Gift Box",
      quantity: 1,
      price: 1800,
      customizations: "Include gift message: Happy Birthday!",
    },
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
} as AdminNewOrderEmailProps;

export default AdminNewOrderEmail;

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

const alertBox = {
  backgroundColor: "#fef3c7",
  border: "1px solid #fbbf24",
  borderRadius: "6px",
  padding: "16px",
  margin: "0 0 24px 0",
};

const alertText = {
  color: "#78350f",
  fontSize: "15px",
  fontWeight: "600",
  margin: "0",
  textAlign: "center" as const,
};

const sectionTitle = {
  color: "#1a1a1a",
  fontSize: "18px",
  fontWeight: "bold",
  margin: "0 0 16px",
};

const customerBox = {
  backgroundColor: "#f0fdf4",
  border: "1px solid #86efac",
  borderRadius: "6px",
  padding: "24px",
  margin: "0 0 24px 0",
};

const orderBox = {
  backgroundColor: "#f8f9fa",
  border: "1px solid #e9ecef",
  borderRadius: "6px",
  padding: "24px",
  margin: "0 0 24px 0",
};

const fulfillmentBox = {
  backgroundColor: "#f0f9ff",
  border: "1px solid #bae6fd",
  borderRadius: "6px",
  padding: "24px",
  margin: "0 0 24px 0",
};

const label = {
  color: "#64748b",
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 4px 0",
};

const value = {
  color: "#1a1a1a",
  fontSize: "15px",
  lineHeight: "20px",
  margin: "0",
};

const divider = {
  borderColor: "#e9ecef",
  margin: "16px 0",
};

const itemRow = {
  margin: "0 0 4px 0",
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

const customizationsText = {
  color: "#64748b",
  fontSize: "13px",
  fontStyle: "italic" as const,
  margin: "4px 0 0 0",
  paddingLeft: "12px",
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
