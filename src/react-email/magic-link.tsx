import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { SITE_DOMAIN } from "@/constants";

interface MagicLinkEmailProps {
  magicLink?: string;
  customerName?: string;
}

export const MagicLinkEmail = ({
  magicLink = "https://example.com/login/verify?token=123",
  customerName = "Valued Customer",
}: MagicLinkEmailProps) => {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={preheader}>Your {SITE_DOMAIN} Login Link</Heading>
          <Text style={paragraph}>Hi {customerName},</Text>
          <Text style={paragraph}>
            Click the button below to securely log in to your {SITE_DOMAIN} loyalty account and view your orders, preferences, and exclusive early access to product drops.
          </Text>
          <Section style={buttonContainer}>
            <Link style={button} href={magicLink}>
              Log In to Your Account
            </Link>
          </Section>
          <Text style={paragraph}>
            This login link will expire in 15 minutes for your security.
          </Text>
          <Text style={paragraph}>
            If you&apos;re having trouble with the button above, copy and paste this URL into your browser:
          </Text>
          <Text style={link}>{magicLink}</Text>
          <Text style={paragraph}>
            If you didn&apos;t request this login link, you can safely ignore this email.
          </Text>
        </Container>
        <Text style={footer}>
          This is an automated message from {SITE_DOMAIN}. Please do not reply to this email.
        </Text>
      </Body>
    </Html>
  );
};

MagicLinkEmail.PreviewProps = {
  magicLink: "https://example.com/login/verify?token=abc123xyz",
  customerName: "Jane Doe",
} as MagicLinkEmailProps;

export default MagicLinkEmail;

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  marginTop: "30px",
};

const container = {
  backgroundColor: "#ffffff",
  border: "1px solid #f0f0f0",
  borderRadius: "5px",
  boxShadow: "0 5px 10px rgba(20,50,70,.2)",
  marginTop: "20px",
  maxWidth: "600px",
  margin: "0 auto",
  padding: "40px",
};

const preheader = {
  color: "#525f7f",
  fontSize: "18px",
  textAlign: "center" as const,
  marginBottom: "30px",
};

const paragraph = {
  color: "#525f7f",
  fontSize: "16px",
  lineHeight: "24px",
  textAlign: "left" as const,
  marginBottom: "16px",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "30px 0",
};

const button = {
  backgroundColor: "#000",
  borderRadius: "5px",
  color: "#fff",
  display: "inline-block",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  padding: "13px 40px",
  margin: "0 auto",
};

const link = {
  color: "#556cd6",
  fontSize: "14px",
  textAlign: "center" as const,
  textDecoration: "underline",
  margin: "16px 0 30px",
  wordBreak: "break-all" as const,
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  textAlign: "center" as const,
  margin: "20px 0",
};
