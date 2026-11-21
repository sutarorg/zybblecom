import type { NextConfig } from "next";
const config: NextConfig = {
  allowedDevOrigins: ["*.e2b.app"],
  devIndicators: false,
  // Use the Node build and one package instance across server entries.
  serverExternalPackages: ["mediabunny"],
  poweredByHeader: false,
  // Cover the responsive hero slot at 2x density without jumping to 384px.
  images: { imageSizes: [32, 48, 64, 96, 128, 256, 320, 384] },
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
    return [
      ...[...sensitive, "/pricing/:path*"].map((source) => ({
        source,
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      })),
      ...(process.env.VERCEL_ENV === "preview"
        ? [
            {
              source: "/:path*",
              headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
            },
          ]
        : []),
    ];
  },
};
export default config;
