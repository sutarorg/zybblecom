import { homeUrl, websiteGraph } from "@/lib/seo/structured-data";
import { faviconMetadata, marketingMetadata } from "@/lib/seo/metadata";
import {
  FeatureGrid,
  FinalCTA,
  Hero,
  PlatformStrip,
  Showcase,
  UseCasePreview,
  WorkflowSection,
} from "@/components/sections/product-sections";
import {
  SampleClipsSection,
  TestimonialsSection,
} from "@/components/sections/homepage-stories";
import { PricingSection } from "@/components/pricing/pricing";
import { FAQSection } from "@/components/sections/faq";
import { JsonLd } from "@/components/shared/structured-data";

// Next.js strips the root slash from canonical URLs supplied through Metadata.
// Declare the homepage canonical in JSX instead; React hoists it into <head>.
export const metadata = {
  ...marketingMetadata("/"),
  alternates: null,
  icons: faviconMetadata("png"),
};
export default function Home() {
  return (
    <>
      <link rel="canonical" href={homeUrl} />
      <JsonLd value={websiteGraph} />
      <Hero />
      <PlatformStrip />
      <WorkflowSection />
      <FeatureGrid />
      <Showcase />
      <UseCasePreview />
      <SampleClipsSection />
      <TestimonialsSection />
      <PricingSection preview />
      <FAQSection />
      <FinalCTA />
    </>
  );
}
