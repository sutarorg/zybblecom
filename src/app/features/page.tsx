import type { Metadata } from "next";
import { MarketingSubPage } from "@/components/marketing/page-shell";
import { FeaturesSection, FinalCTA, ToolsSection } from "@/components/marketing/sections";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Chapters and lessons, coupons, analytics, student progress, resources, and custom links — the complete Zybble creator toolbox.",
};

export default function FeaturesPage() {
  return (
    <MarketingSubPage
      eyebrow="Features"
      title="Everything a creator needs. Nothing they don't."
      sub="Zybble is deliberately small: every feature exists to win enrollments, lift completion, or grow revenue."
    >
      <div className="-mt-8">
        <ToolsSection />
      </div>
      <div className="-mt-16">
        <FeaturesSection />
      </div>
      <div className="-mt-16">
        <FinalCTA />
      </div>
    </MarketingSubPage>
  );
}
