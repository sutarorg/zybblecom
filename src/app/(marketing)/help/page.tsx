import { marketingMetadata } from "@/lib/seo/metadata";
import { PageIntro } from "@/components/shared/page";
import { HelpSearch } from "@/components/marketing/help-search";
import { Action } from "@/components/ui/primitives";
const description =
  "Search Zybble help topics about choosing a source video, reviewing clips, exporting MP4s, and using credit packs.";
export const metadata = marketingMetadata("/help");
export default function Help() {
  return (
    <>
      <PageIntro
        path="/help"
        label="Help centre"
        title={
          <>
            How can we <span className="gradient-text">help you?</span>
          </>
        }
        description={description}
      />
      <section className="section compact" aria-label="Search help">
        <div className="narrow collection">
          <HelpSearch />
          <div className="inline-cta">
            <div>
              <h2>Still have a question?</h2>
              <p>See the current options for getting in touch.</p>
            </div>
            <Action href="/contact" variant="secondary">
              Contact Zybble
            </Action>
          </div>
        </div>
      </section>
    </>
  );
}
