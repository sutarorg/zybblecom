"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Clip } from "@/services/workspace-contracts";
export function ClipPreview({
  clip,
}: {
  clip: Pick<
    Clip,
    "playback" | "poster" | "aspect" | "title" | "vtt" | "language"
  >;
}) {
  const [badSource, setBadSource] = useState<string>();
  const router = useRouter();
  return (
    <>
      <div className="ws-video">
        <video
          key={clip.playback}
          controls
          playsInline
          preload="none"
          src={clip.playback}
          poster={clip.poster}
          data-aspect={clip.aspect}
          crossOrigin="anonymous"
          aria-label={`Preview ${clip.title}`}
          onError={() => setBadSource(clip.playback)}
        >
          {clip.vtt && (
            <track
              kind="captions"
              label="Source captions"
              srcLang={clip.language ?? "und"}
              src={clip.vtt}
            />
          )}
        </video>
      </div>
      {badSource && badSource === clip.playback && (
        <div className="ws-playback-error">
          <p role="alert">
            This video couldn’t play. Refresh the preview or download an
            available copy.
          </p>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => router.refresh()}
          >
            Refresh preview
          </button>
        </div>
      )}
    </>
  );
}
