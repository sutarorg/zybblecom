import { questions } from "@/config/questions";
import { marketingMetadata } from "@/lib/seo/metadata";
import { PageIntro } from "@/components/shared/page";
import { Accordions } from "@/components/ui/accordion";
import { Action } from "@/components/ui/primitives";
const description =
  "Get clear answers about Zybble’s AI clipping workflow, vertical MP4 exports, one-time credit packs, and regional prices.";
export const metadata = marketingMetadata("/faq");
const topics = [...new Set(questions.map((question) => question.topic))];
export default function FAQ() {
  return (
    <>
      <PageIntro
        path="/faq"
        label="FAQ"
        title={
          <>
            Good questions.{" "}
            <span className="gradient-text">Straight answers.</span>
          </>
        }
        description={description}
      />
      <div className="section compact">
        <div className="narrow">
          <div className="faq-groups">
            {topics.map((topic) => (
              <section key={topic}>
                <h2>{topic}</h2>
                <Accordions
                  items={questions.filter((item) => item.topic === topic)}
                />
              </section>
            ))}
          </div>
          <div className="inline-cta">
            <div>
              <h2>Looking for something else?</h2>
              <p>Find answers by keyword in the help centre.</p>
            </div>
            <Action href="/help" variant="secondary">
              Search help
            </Action>
          </div>
        </div>
      </div>
    </>
  );
}
