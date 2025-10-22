import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";
import "server-only";

import { ThemeProvider } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NextTopLoader from "nextjs-toploader";
import { SITE_NAME, SITE_DESCRIPTION, SITE_URL } from "@/constants";

export const dynamic = "force-dynamic";

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans"
});

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s - ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  keywords: [
    "bakery",
    "cookies",
    "cakes",
    "desserts",
    "custom cakes",
    "fresh baked",
    "online ordering",
  ],
  authors: [{ name: "Sweet Angel Bakery" }],
  creator: "Sweet Angel Bakery",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function BaseLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${openSans.className} ${openSans.variable}`}>
        <NextTopLoader
          initialPosition={0.15}
          shadow="0 0 10px #000, 0 0 5px #000"
          height={4}
        />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <TooltipProvider delayDuration={100} skipDelayDuration={50}>
            {children}
          </TooltipProvider>
        </ThemeProvider>
        <Toaster
          richColors
          closeButton
          position="bottom-right"
          expand
          duration={7000}
        />
      </body>
    </html>
  );
}
