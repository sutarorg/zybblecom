import { pageMetadata } from "@/lib/seo/metadata";
import { PageIntro } from "@/components/shared/page";
import { Action } from "@/components/ui/primitives";
import {
  FinalCTA,
  PlatformStrip,
  WorkflowSection,
} from "@/components/sections/product-sections";
import { FAQSection } from "@/components/sections/faq";
const description =
  "Learn how to turn a long video into shorts with Zybble: add a recording, review AI-selected highlights, and download vertical clips with captions.";
export const metadata = pageMetadata(
  "/how-it-works",
  "How to Turn Long Videos into Shorts",
  description,
);
export default function HowItWorks() {
  return (
    <>
      <PageIntro
        path="/how-it-works"
        label="How it works"
        title={
          <>
            One recording.{" "}
            <span className="gradient-text">More ways to share it.</span>
          </>
        }
        description={description}
        actions={
          <Action href="#workflow" variant="secondary">
            Jump to the three steps
          </Action>
        }
      />
      <WorkflowSection detailed />
      <PlatformStrip />
      <FAQSection scope="workflow" />
      <FinalCTA />
    </>
  );
}
