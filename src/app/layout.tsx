import type { Metadata } from "next";
import localFont from "next/font/local";
import { site } from "@/config/site";
import { faviconMetadata } from "@/lib/seo/metadata";
import "@/styles/globals.css";

const jakarta = localFont({
  src: "../../node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2",
  weight: "200 800",
  display: "swap",
  variable: "--font-jakarta",
});
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: "Zybble — AI Video Repurposing", template: "%s | Zybble" },
  description: site.description,
  manifest: "/manifest.webmanifest",
  icons: faviconMetadata(),
  robots:
    process.env.VERCEL_ENV === "preview"
      ? { index: false, follow: false }
      : undefined,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={jakarta.variable} data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
