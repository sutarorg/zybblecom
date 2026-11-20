import type { NextConfig } from "next";
const config: NextConfig = {
  allowedDevOrigins: ["*.e2b.app"],
  devIndicators: false,
  poweredByHeader: false,
  async headers() {
    const sensitive = [
      "/api/:path*",
      "/login",
      "/signup",
      "/onboarding",
      "/forgot-password",
      "/auth/callback",
      "/reset-password",
      "/verify-email",
      "/checkout/success",
      "/dashboard/:path*",
      "/projects/:path*",
      "/clips",
      "/credits/:path*",
      "/settings/:path*",
      "/support",
      "/admin/:path*",
    ];
    return [...sensitive, "/pricing/:path*"].map((source) => ({
      source,
      headers: [
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "Cache-Control", value: "private, no-store" },
      ],
    }));
  },
};
export default config;
