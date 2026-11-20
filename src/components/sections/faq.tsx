import { questions } from "@/config/questions";
import { Accordions } from "@/components/ui/accordion";
import { Action, SectionTitle } from "@/components/ui/primitives";

export function FAQSection({
  scope = "home",
}: {
  scope?: "home" | "pricing" | "workflow";
}) {
  const items =
    scope === "pricing"
      ? questions.filter((q) => q.topic === "Credits & pricing")
      : scope === "workflow"
        ? questions.filter((q) => q.topic !== "Credits & pricing")
        : questions.filter((q) =>
            [
              "what-is-zybble",
              "what-is-a-credit",
              "credit-expiry",
              "publish",
              "free-or-subscription",
            ].includes(q.id),
          );
  return (
    <section className="section">
      <div className="container faq-split">
        <div>
          <SectionTitle
            label="GOOD TO KNOW"
            title={
              scope === "pricing"
                ? "Credit pack questions"
                : "Frequently asked questions"
            }
            description="Straight answers about clips, credits, and getting started."
            align="left"
          />
          <Action href="/faq" variant="text">
            View all FAQs
          </Action>
        </div>
        <Accordions items={items} />
      </div>
    </section>
  );
}
