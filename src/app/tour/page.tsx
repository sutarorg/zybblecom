import type { Metadata } from "next";
import { MarketingSubPage } from "@/components/marketing/page-shell";
import { FinalCTA, PreviewsSection, PagesSection } from "@/components/marketing/sections";

export const metadata: Metadata = {
  title: "Product tour",
  description:
    "See exactly what your buyers see, and what you wake up to — the Zybble course page and creator dashboard, up close.",
};

export default function TourPage() {
  return (
    <MarketingSubPage
      eyebrow="Product tour"
      title="Take the walkthrough — two views, one platform."
      sub="What the internet sees when it taps your link, and what you see when you open your dashboard."
    >
      <div className="-mt-8">
        <PagesSection />
      </div>
      <div className="-mt-16">
        <PreviewsSection />
      </div>
      <div className="-mt-16">
        <FinalCTA />
      </div>
    </MarketingSubPage>
  );
}
