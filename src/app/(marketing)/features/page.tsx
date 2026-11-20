import Link from "next/link";
import { features } from "@/config/product";
import { marketingMetadata } from "@/lib/seo/metadata";
import { PageIntro } from "@/components/shared/page";
import { Action, IconTile } from "@/components/ui/primitives";
import { FinalCTA, Showcase } from "@/components/sections/product-sections";

const description =
  "Explore how Zybble finds highlights in long videos, automatically reframes the speaker, adds AI captions, and exports vertical MP4 clips.";
export const metadata = marketingMetadata("/features");
export default function Features() {
  return (
    <>
      <PageIntro
        path="/features"
        label="Features"
        title={
          <>
            The creator toolkit for{" "}
            <span className="gradient-text">short-form video.</span>
          </>
        }
        description={description}
        actions={
          <Action href="/how-it-works" variant="secondary">
            See the workflow
          </Action>
        }
      />
      <section className="section">
        <div className="container detail-layout">
          <nav className="section-index" aria-label="Feature index">
            <strong>On this page</strong>
            {features.map(({ id, title }) => (
              <Link href={`#${id}`} key={id}>
                {title}
              </Link>
            ))}
          </nav>
          <div className="detail-list">
            {features.map(({ id, title, icon, tone, text, detail }) => (
              <article className="detail-row" id={id} key={id}>
                <IconTile icon={icon} tone={tone} />
                <div>
                  <h2>{title}</h2>
                  <p className="detail-lead">{text}</p>
                  <p>{detail}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <Showcase />
      <FinalCTA />
    </>
  );
}
