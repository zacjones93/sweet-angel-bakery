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
  total?: number;
}

export const OrderConfirmationEmail = ({
  customerName = "Valued Customer",
  orderNumber = "ABC12345",
  orderItems = [
    { name: "Chocolate Chip Cookie", quantity: 6, price: 400 },
    { name: "Cowboy Cookie", quantity: 4, price: 400 },
  ],
  total = 4000,
}: OrderConfirmationEmailProps) => {
  function formatPrice(cents: number) {
    return `$${(cents / 100).toFixed(2)}`;
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

            <Row style={totalRow}>
              <Column>
                <Text style={totalLabel}>Total</Text>
              </Column>
              <Column align="right">
                <Text style={totalAmount}>{formatPrice(total)}</Text>
              </Column>
            </Row>
          </Section>

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
  total: 5800,
} as OrderConfirmationEmailProps;

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
