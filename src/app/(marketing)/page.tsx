import { site } from "@/config/site";
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
import { PricingSection } from "@/components/pricing/pricing";
import { FAQSection } from "@/components/sections/faq";
import { JsonLd } from "@/components/shared/structured-data";

export const metadata = marketingMetadata("/");
export default function Home() {
  return (
    <>
      <JsonLd
        value={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: site.name,
          url: site.url,
          description: site.description,
        }}
      />
      <Hero />
      <PlatformStrip />
      <WorkflowSection />
      <FeatureGrid />
      <Showcase />
      <UseCasePreview />
      <PricingSection preview />
      <FAQSection />
      <FinalCTA />
    </>
  );
}
