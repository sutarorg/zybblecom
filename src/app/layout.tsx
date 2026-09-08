import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://zybble.com"),
  title: {
    default: "Zybble — Sell what you know with a single link",
    template: "%s · Zybble",
  },
  description:
    "Zybble lets anyone instantly create, publish and sell courses with a single shareable link. Secure Razorpay checkout, instant student access, and automatic payouts straight to your bank.",
  openGraph: {
    siteName: "Zybble",
    type: "website",
    url: "https://zybble.com",
  },
};

export const viewport: Viewport = {
  themeColor: "#f5f3ed",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="grain min-h-dvh">
        <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[70vh] bg-[radial-gradient(60%_50%_at_50%_0%,rgba(91,61,245,0.10),transparent_70%)]" />
        {children}
      </body>
    </html>
  );
}
