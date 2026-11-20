import {
  BookOpenText,
  CircleHelp,
  Clapperboard,
  ListChecks,
  Scissors,
  Wallet,
} from "lucide-react";
import { pageMetadata } from "@/lib/seo/metadata";
import { PageIntro, ResourceCard } from "@/components/shared/page";
import { IconTile, SectionTitle } from "@/components/ui/primitives";
const description =
  "Learn how to prepare a recording, review your short clips, choose a credit pack, and find answers in the Zybble resource library.";
export const metadata = pageMetadata(
  "/resources",
  "Video Repurposing Resources",
  description,
);
const resources = [
  {
    href: "/how-it-works",
    title: "Workflow guide",
    text: "See what happens from source recording to MP4 export.",
    icon: Scissors,
  },
  {
    href: "/use-cases",
    title: "Ideas by audience",
    text: "Find a starting point for a podcast, course, or client project.",
    icon: Clapperboard,
  },
  {
    href: "/pricing",
    title: "Credits and pricing",
    text: "Compare pack allowances before you choose a recording.",
    icon: Wallet,
  },
  {
    href: "/examples",
    title: "Clip gallery",
    text: "See what to look for in vertical framing and captions.",
    icon: Clapperboard,
  },
  {
    href: "/blog",
    title: "The Zybble journal",
    text: "Browse the index for editorial guidance and product updates.",
    icon: BookOpenText,
  },
  {
    href: "/help",
    title: "Help centre",
    text: "Search practical answers about credits, clips, and exports.",
    icon: CircleHelp,
  },
];
export default function Resources() {
  return (
    <>
      <PageIntro
        path="/resources"
        label="Resources"
        title={
          <>
            A field guide for{" "}
            <span className="gradient-text">short-form creators.</span>
          </>
        }
        description={description}
      />
      <section className="section">
        <div className="container">
          <SectionTitle
            label="THE RESOURCE LIBRARY"
            title="Find the right starting point."
          />
          <div className="grid-three">
            {resources.map((item) => (
              <ResourceCard {...item} key={item.href} />
            ))}
          </div>
        </div>
      </section>
      <section className="section tinted">
        <div className="narrow">
          <div className="card checklist">
            <IconTile icon={ListChecks} />
            <h2>Before you publish</h2>
            <ol>
              <li>
                <strong>Start with permission.</strong> Confirm you can
                republish the footage, audio, and any third-party materials in
                the cut.
              </li>
              <li>
                <strong>Check the hook.</strong> Make sure the first few seconds
                tell viewers what they’ll get from watching.
              </li>
              <li>
                <strong>Watch it on a phone.</strong> Keep captions and
                important action clear of the interface edges.
              </li>
              <li>
                <strong>Review it twice.</strong> Watch with sound, then on
                mute. Correct caption errors and preserve the speaker’s meaning.
              </li>
            </ol>
          </div>
        </div>
      </section>
    </>
  );
}
