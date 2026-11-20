import Link from "next/link";
import Image from "next/image";
import { useCases } from "@/config/product";
import { pageMetadata } from "@/lib/seo/metadata";
import { PageIntro } from "@/components/shared/page";
import { IconTile } from "@/components/ui/primitives";
import { FinalCTA } from "@/components/sections/product-sections";
const description =
  "Find practical ways to repurpose podcasts, YouTube videos, lessons, client recordings, and webinars into short-form clips.";
export const metadata = pageMetadata(
  "/use-cases",
  "Video Repurposing for Creators and Teams",
  description,
);
export default function UseCases() {
  return (
    <>
      <PageIntro
        path="/use-cases"
        label="Use cases"
        title={
          <>
            Make more of what{" "}
            <span className="gradient-text">you already record.</span>
          </>
        }
        description={description}
      />
      <section className="section">
        <div className="container detail-layout">
          <nav className="section-index" aria-label="Audience index">
            <strong>Find your workflow</strong>
            {useCases.map(({ id, name }) => (
              <Link href={`#${id}`} key={id}>
                {name}
              </Link>
            ))}
          </nav>
          <div className="detail-list">
            {useCases.map((item) => (
              <article
                className="detail-row use-detail"
                id={item.id}
                key={item.id}
              >
                <IconTile icon={item.icon} tone={item.tone} />
                <div>
                  <h2>{item.name}</h2>
                  <p className="detail-lead">{item.text}</p>
                  <p>{item.detail}</p>
                  <span className="format-label">{item.format}</span>
                  {"image" in item && (
                    <div className="detail-image">
                      <Image
                        src={item.image}
                        alt={item.alt}
                        fill
                        sizes="(min-width: 1000px) 650px, 90vw"
                        loading={item.id === "podcasters" ? "eager" : "lazy"}
                        className="object-cover"
                      />
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <FinalCTA />
    </>
  );
}
