import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Play, Zap } from "lucide-react";
import { features, useCases, workflow } from "@/config/product";
import {
  Action,
  Bolt,
  Eyebrow,
  IconTile,
  SectionTitle,
} from "@/components/ui/primitives";
import {
  HeroArt,
  ShowcaseArt,
  WorkflowArt,
} from "@/components/marketing/product-art";
import { Captions, Focus, Smartphone, Sparkles } from "lucide-react";

const tags = [
  { label: "AI-Powered", icon: Sparkles },
  { label: "Speaker Focused", icon: Focus },
  { label: "Bold Captions", icon: Captions },
  { label: "9:16 Vertical", icon: Smartphone },
];

export function Hero() {
  return (
    <section className="hero">
      <div className="container hero-inner">
        <div className="hero-copy">
          <Eyebrow pill>AI VIDEO REPURPOSING PLATFORM</Eyebrow>
          <h1>
            Turn Long Videos
            <br className="hero-break" /> Into{" "}
            <span className="gradient-text">Viral Shorts.</span>
          </h1>
          <p>
            Zybble uses AI to find the best moments in your long videos and
            turns them into engaging, ready-to-publish short-form clips in
            minutes.
          </p>
          <ul className="tags" aria-label="Product highlights">
            {tags.map(({ label, icon: Icon }) => (
              <li key={label}>
                <Icon size={14} aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
          <div className="actions">
            <Action href="/pricing">Explore Credit Packs</Action>
            <Action href="/how-it-works" variant="secondary" arrow={false}>
              <Play size={15} aria-hidden="true" />
              See How It Works
            </Action>
          </div>
          <div className="hero-note">
            <Zap size={14} aria-hidden="true" /> One-time credits. No
            subscriptions.
          </div>
        </div>
        <HeroArt />
      </div>
    </section>
  );
}

export function PlatformStrip() {
  return (
    <section
      className="platform-strip"
      aria-labelledby="publishing-destinations"
    >
      <div className="container platform-inner">
        <div id="publishing-destinations" className="platform-intro">
          <strong>Made for short-form publishing</strong>
          <span>Download an MP4. Upload it where you post.</span>
        </div>
        <ul className="platform-list">
          <li>
            <svg
              className="youtube"
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="currentColor"
            >
              <path d="M23 7.4a3 3 0 0 0-2.1-2.1C19 4.8 12 4.8 12 4.8s-7 0-8.9.5A3 3 0 0 0 1 7.4a31 31 0 0 0 0 9.2 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 0-9.2ZM9.8 15.4V8.6l5.9 3.4z" />
            </svg>
            YouTube Shorts
          </li>
          <li>
            <svg
              className="instagram"
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle
                cx="17.5"
                cy="6.5"
                r="1"
                fill="currentColor"
                stroke="none"
              />
            </svg>
            Instagram Reels
          </li>
          <li>
            <svg
              viewBox="0 0 24 24"
              width="23"
              height="23"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M15.8 2c.4 2.7 1.9 4.3 4.5 4.5V10a8.4 8.4 0 0 1-4.4-1.2v6.7a6 6 0 1 1-6-6c.4 0 .7 0 1 .1v3.5a3 3 0 0 0-1-.2 2.7 2.7 0 1 0 2.6 2.7V2z" />
            </svg>
            TikTok
          </li>
        </ul>
      </div>
    </section>
  );
}

export function WorkflowSection({ detailed = false }: { detailed?: boolean }) {
  return (
    <section className="section workflow-section" id="workflow">
      <div className="container">
        <SectionTitle
          label="HOW IT WORKS"
          title={
            <>
              From long video to short clips{" "}
              <span className="accent">in 3 steps.</span>
            </>
          }
          description="Start with a recording you already have. Let AI handle the first cut."
        />
        <ol className="grid-three workflow-list" role="list">
          {workflow.map(({ title, text, detail }, index) => (
            <li className="card workflow-card" key={title}>
              <div className="step-label">
                <span>0{index + 1}</span>
                <b>STEP {index + 1}</b>
              </div>
              <WorkflowArt step={index} />
              <h3>{title}</h3>
              <p>{text}</p>
              {detailed && <p className="workflow-detail">{detail}</p>}
            </li>
          ))}
        </ol>
        {!detailed && (
          <div className="section-action">
            <Action href="/how-it-works" variant="text">
              See the full workflow
            </Action>
          </div>
        )}
      </div>
    </section>
  );
}

export function FeatureGrid() {
  return (
    <section className="section tinted">
      <div className="container">
        <SectionTitle
          label="THE CREATOR TOOLKIT"
          title={
            <>
              Less editing. <span className="accent">More creating.</span>
            </>
          }
          description="Find the right moments and shape them for short-form, without starting from a blank timeline."
        />
        <div className="grid-three">
          {features.map(({ id, title, icon, tone, text }) => (
            <Link
              className="card feature-card"
              href={`/features#${id}`}
              key={id}
            >
              <IconTile icon={icon} tone={tone} />
              <ArrowUpRight
                className="card-arrow"
                size={18}
                aria-hidden="true"
              />
              <h3>{title}</h3>
              <p>{text}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Showcase() {
  return (
    <section className="section showcase-section">
      <div className="container">
        <div className="showcase">
          <div className="showcase-copy">
            <Eyebrow>THE ZYBBLE WORKFLOW</Eyebrow>
            <h2>
              Your best moments, <span>reframed.</span>
            </h2>
            <p>
              Go from a full recording to a vertical clip with the speaker in
              focus and the words on screen. Review it before it goes out into
              the world.
            </p>
            <Action href="/features" variant="light">
              Explore features
            </Action>
          </div>
          <ShowcaseArt />
        </div>
      </div>
    </section>
  );
}

const audienceCards = useCases.filter((item) => "image" in item);
export function UseCasePreview() {
  return (
    <section className="section use-section">
      <div className="container">
        <SectionTitle
          label="MADE FOR YOUR WORKFLOW"
          title="Good content deserves a second life."
          description="From the podcast mic to the webinar stage, turn the best parts into something worth sharing."
        />
        <div className="grid-three">
          {audienceCards.map((item) => (
            <Link
              className="card audience-card"
              href={`/use-cases#${item.id}`}
              key={item.id}
            >
              {"image" in item && (
                <div className="audience-image">
                  <Image
                    src={item.image}
                    alt={item.alt}
                    fill
                    sizes="(min-width: 1050px) 370px, (min-width: 650px) 45vw, 95vw"
                    className="object-cover"
                  />
                </div>
              )}
              <div className="audience-copy">
                <h3>{item.name}</h3>
                <p>{item.text}</p>
                <ArrowUpRight size={18} aria-hidden="true" />
              </div>
            </Link>
          ))}
        </div>
        <div className="audience-extra">
          {useCases
            .filter((item) => !("image" in item))
            .map(({ id, name, icon: Icon }) => (
              <Link key={id} href={`/use-cases#${id}`}>
                <Icon size={17} aria-hidden="true" />
                {name}
                <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCTA() {
  return (
    <section className="section final-section">
      <div className="container">
        <div className="final-cta">
          <Bolt className="final-bolt" />
          <div>
            <Eyebrow>YOUR NEXT SHORT STARTS HERE</Eyebrow>
            <h2>Your best clip is already recorded.</h2>
            <p>
              Pick a credit pack and turn the footage you have into something
              new.
            </p>
          </div>
          <Action href="/pricing" variant="light">
            Explore Credit Packs
          </Action>
        </div>
      </div>
    </section>
  );
}
