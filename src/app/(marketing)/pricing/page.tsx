import { marketingMetadata } from "@/lib/seo/metadata";
import { PageIntro } from "@/components/shared/page";
import { PricingSection } from "@/components/pricing/pricing";
import { FAQSection } from "@/components/sections/faq";
const description =
  "Compare Zybble’s Starter, Creator, and Studio credit packs. Pay once for AI video processing credits that never expire. No subscriptions or recurring charges.";
export const metadata = marketingMetadata("/pricing");
export default function Pricing() {
  return (
    <>
      <PageIntro
        path="/pricing"
        label="Pricing"
        title={
          <>
            Pay once. <span className="gradient-text">Create anytime.</span>
          </>
        }
        description={description}
      />
      <PricingSection />
      <FAQSection scope="pricing" />
    </>
  );
}
