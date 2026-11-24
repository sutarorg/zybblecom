import { authSettings } from "@/lib/backend/supabase";
import { contactSettings } from "@/lib/backend/contact-config";
import { supportEmail } from "@/config/legal";
import { CircleHelp, Wallet } from "lucide-react";
import { marketingMetadata } from "@/lib/seo/metadata";
import { PageIntro, ResourceCard } from "@/components/shared/page";
import { ContactForm } from "@/components/marketing/contact-form";
const description =
  "Find contact options for Zybble, prepare a product or pricing question, and get immediate answers from the help centre.";
export const metadata = marketingMetadata("/contact");
export const dynamic = "force-dynamic";
export default function Contact() {
  return (
    <>
      <PageIntro
        path="/contact"
        label="Contact"
        title={
          <>
            Let’s talk <span className="gradient-text">short-form.</span>
          </>
        }
        description={description}
      />
      <section className="section compact">
        <div className="container contact-layout">
          <ContactForm
            connected={Boolean(authSettings() && contactSettings(process.env))}
          />
          <aside className="contact-aside" aria-label="Other ways to get help">
            <ResourceCard
              href={`mailto:${supportEmail}`}
              title="Email Zybble support"
              text={supportEmail}
              icon={CircleHelp}
            />
            <ResourceCard
              href="/help"
              title="Help centre"
              text="Find answers about clipping, framing, captions, and video exports."
              icon={CircleHelp}
            />
            <ResourceCard
              href="/pricing"
              title="Credit packs"
              text="See what’s included and how one-time payments work."
              icon={Wallet}
            />
          </aside>
        </div>
      </section>
    </>
  );
}
