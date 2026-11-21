import Image from "next/image";
import type { GenerationOptions } from "@/services/generation-schema";

const sample = "/images/generation-sample-16x9.webp";
const sentence = "Small steps make the biggest difference".split(" ");

export function GenerationPreview({ options }: { options: GenerationOptions }) {
  const { aspect, reframe, captions } = options;
  const words = sentence.slice(
    0,
    captions === "bold" ? 3 : captions === "karaoke" ? 5 : 7,
  );
  return (
    <section
      className="ws-panel ws-style-preview"
      aria-labelledby="style-preview-title"
    >
      <header className="ws-preview-header">
        <h2 id="style-preview-title">Preview</h2>
        <span className="ws-preview-sample">Sample image</span>
      </header>
      <div className="ws-preview-canvas">
        <figure
          className="ws-preview-stage"
          data-aspect={aspect}
          data-reframe={reframe}
          data-caption={captions}
        >
          <Image
            src={sample}
            alt="Two podcast hosts in a studio with lavender lighting"
            fill
            sizes="(max-width: 480px) 85vw, 440px"
            className="ws-preview-image"
          />
          {captions !== "clean" && (
            <figcaption className="ws-preview-caption">
              {words.map((word, i) =>
                (captions === "bold" && i === 0) ||
                (captions === "karaoke" && i < 2) ? (
                  <mark key={word}>{word} </mark>
                ) : (
                  <span key={word}>{word} </span>
                ),
              )}
            </figcaption>
          )}
        </figure>
      </div>
    </section>
  );
}
