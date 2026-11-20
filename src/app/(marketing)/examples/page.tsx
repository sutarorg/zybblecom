import { Clapperboard, Captions, Focus, Smartphone } from "lucide-react";
import { marketingMetadata } from "@/lib/seo/metadata";
import { EmptyState, PageIntro } from "@/components/shared/page";
import { Action, IconTile, SectionTitle } from "@/components/ui/primitives";
import { verifiedClips } from "@/config/editorial";
import { Showcase } from "@/components/sections/product-sections";
const description =
  "See how the Zybble workflow frames and captions vertical clips. This gallery is reserved for verified Zybble-generated videos.";
export const metadata = marketingMetadata("/examples");
export default function Examples() {
  const checks = [
    {
      title: "Speaker placement",
      text: "Check whether the crop keeps the active speaker visible without cutting off meaningful context.",
      icon: Focus,
    },
    {
      title: "Captions on mute",
      text: "Make sure the words are readable at phone size and still make sense without audio.",
      icon: Captions,
    },
    {
      title: "A complete thought",
      text: "Pick a clip with a clear setup and payoff that holds up on its own.",
      icon: Smartphone,
    },
  ];
  return (
    <>
      <PageIntro
        path="/examples"
        label="Examples"
        title={
          <>
            The short-form <span className="gradient-text">clip gallery.</span>
          </>
        }
        description={description}
      />
      <section className="section compact">
        <div className="container">
          {verifiedClips.length ? (
            <section aria-labelledby="verified">
              <h2 className="listing-title" id="verified">
                Verified Zybble clips
              </h2>
              <div className="grid-three">
                {verifiedClips.map((clip) => (
                  <figure
                    className="card resource-card verified-clip"
                    key={clip.id}
                  >
                    <video
                      controls
                      preload="none"
                      src={clip.video}
                      poster={clip.poster}
                      aria-label={clip.title}
                    >
                      <track
                        kind="captions"
                        src={clip.captions}
                        srcLang="en"
                        label="English"
                        default
                      />
                    </video>
                    <figcaption>
                      <h3>{clip.title}</h3>
                      <p>{clip.description}</p>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          ) : (
            <EmptyState
              icon={Clapperboard}
              title="No verified clips published yet"
              action={
                <Action href="/how-it-works" variant="secondary">
                  See how clips are made
                </Action>
              }
            >
              Only verified clips with permission to publish will appear here.
              The illustrated workflow below shows the format without presenting
              it as a real export.
            </EmptyState>
          )}
        </div>
      </section>
      <Showcase />
      <section className="section tinted">
        <div className="container">
          <SectionTitle title="What to look for in a short clip" />
          <div className="grid-three">
            {checks.map((item) => (
              <article className="card resource-card" key={item.title}>
                <IconTile icon={item.icon} />
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
