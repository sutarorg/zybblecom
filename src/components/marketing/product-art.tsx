import Image from "next/image";
import {
  AudioLines,
  Captions,
  Check,
  Clapperboard,
  Focus,
  Play,
  Scissors,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { Bolt } from "@/components/ui/primitives";

const host = "/images/podcast-host-portrait.webp";

export function HeroArt() {
  return (
    <figure
      className="hero-art"
      aria-label="Illustrated product preview for AI clips, speaker framing, and captions"
    >
      <div className="art-plane" aria-hidden="true" />
      <div className="art-grid" aria-hidden="true" />
      <svg
        className="art-orbit"
        viewBox="0 0 590 480"
        fill="none"
        aria-hidden="true"
      >
        <ellipse
          cx="295"
          cy="246"
          rx="267"
          ry="118"
          transform="rotate(-22 295 246)"
        />
        <ellipse
          cx="295"
          cy="246"
          rx="245"
          ry="154"
          transform="rotate(30 295 246)"
          strokeDasharray="4 9"
        />
        <circle cx="83" cy="353" r="4" />
        <circle cx="499" cy="294" r="5" />
      </svg>
      <div className="art-bolt">
        <Bolt />
      </div>
      <Sparkles className="art-spark" aria-hidden="true" />
      <div className="phone">
        <div className="phone-screen">
          <Image
            src={host}
            alt="A podcast host speaking into a studio microphone"
            fill
            sizes="(max-width: 540px) 168px, 260px"
            preload
            className="object-cover"
          />
          <div className="phone-shade" aria-hidden="true" />
          <div className="phone-top" aria-hidden="true">
            <span>9:16</span>
          </div>
          <div className="phone-caption" aria-hidden="true">
            <span>MAKE EVERY</span>
            <strong>MOMENT COUNT.</strong>
          </div>
          <div className="phone-bottom" aria-hidden="true">
            <Play size={13} fill="currentColor" />
            <span className="phone-progress" />
            <AudioLines size={15} />
          </div>
        </div>
      </div>
      <div className="float-card float-clips">
        <span className="float-icon tone-purple">
          <Scissors size={20} aria-hidden="true" />
        </span>
        <span>
          <b>AI Clips</b>
          <small>Find the highlights</small>
        </span>
      </div>
      <div className="float-card float-frame">
        <span className="float-icon tone-blue">
          <Focus size={20} aria-hidden="true" />
        </span>
        <span>
          <b>AI Framing</b>
          <small>Keep speakers in view</small>
        </span>
      </div>
      <div className="float-card float-captions">
        <span className="float-icon tone-pink">
          <Captions size={20} aria-hidden="true" />
        </span>
        <span>
          <b>Captions</b>
          <small>Made for sound-off</small>
        </span>
      </div>
      <figcaption className="art-label">
        <span /> PRODUCT ILLUSTRATION
      </figcaption>
    </figure>
  );
}

export function WorkflowArt({ step }: { step: number }) {
  if (step === 0)
    return (
      <div className="workflow-art upload-art" aria-hidden="true">
        <div className="upload-box">
          <Clapperboard size={24} />
          <b>Long-form video</b>
          <span>Source recording</span>
        </div>
        <span className="art-chip">
          <Check size={13} /> Source
        </span>
      </div>
    );
  if (step === 1)
    return (
      <div className="workflow-art waveform-art" aria-hidden="true">
        <div className="wave-top">
          <Sparkles size={15} /> Highlight detection
        </div>
        <div className="waveform">
          {[
            22, 42, 31, 62, 44, 80, 52, 32, 55, 93, 74, 39, 65, 90, 56, 81, 45,
            24, 49, 31, 44, 25, 55, 72, 48, 28, 45, 20, 33, 16,
          ].map((height, i) => (
            <i
              key={i}
              className={
                (i >= 8 && i <= 16) || (i >= 22 && i <= 25) ? "wave-active" : ""
              }
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
        <div className="wave-track" />
      </div>
    );
  return (
    <div className="workflow-art export-art" aria-hidden="true">
      <div className="output-shape output-left">
        <Play size={15} />
      </div>
      <div className="output-shape output-center">
        <Smartphone size={20} />
        <b>9:16</b>
        <span />
      </div>
      <div className="output-shape output-right">
        <Captions size={16} />
      </div>
      <span className="art-chip">
        <Check size={13} /> MP4
      </span>
    </div>
  );
}

export function ShowcaseArt() {
  return (
    <figure
      className="showcase-art"
      aria-label="Illustration of the editing workflow with a vertical preview and caption timeline"
    >
      <div className="editor">
        <div className="editor-bar">
          <span>
            <i />
            <i />
            <i />
          </span>
          <b>Vertical clip workspace</b>
          <span>9:16</span>
        </div>
        <div className="editor-main">
          <div className="editor-side">
            <span>
              <Scissors size={15} /> Clips
            </span>
            <span>
              <Focus size={15} /> Framing
            </span>
            <span>
              <Captions size={15} /> Captions
            </span>
          </div>
          <div className="editor-preview">
            <Image
              src={host}
              alt="Illustrated portrait crop of a podcast host"
              fill
              sizes="(max-width: 540px) 115px, 142px"
              className="object-cover"
            />
            <b>
              MAKE EVERY
              <br />
              MOMENT COUNT.
            </b>
            <div className="crop-guide" />
          </div>
        </div>
        <div className="editor-timeline" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <i />
        </div>
      </div>
      <figcaption>Illustrated workflow · Not a generated clip</figcaption>
    </figure>
  );
}
