import { websiteGraph } from "@/lib/seo/structured-data";
import { marketingMetadata } from "@/lib/seo/metadata";
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

export const metadata = marketingMetadata("/");
export default function Home() {
  return (
    <>
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
