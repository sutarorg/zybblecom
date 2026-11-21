"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import type { HomepageSample } from "@/config/homepage-samples";
import styles from "./homepage-stories.module.css";

const wrap = (value: number, length: number) =>
  ((value % length) + length) % length;
const speed = 23; // CSS pixels per second

export function SampleClipsCarousel({
  samples,
}: {
  samples: readonly HomepageSample[];
}) {
  const track = useRef<HTMLUListElement>(null);
  const cards = useRef<(HTMLLIElement | null)[]>([]);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const motion = useRef({
    offset: 0,
    step: 0,
    hover: false,
    focused: false,
    paused: false,
  });
  const playing = useRef<{ index: number; manual: boolean } | null>(null);
  const drag = useRef<{ id: number; x: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [active, setActive] = useState<number | null>(null);
  const [failed, setFailed] = useState<number[]>([]);
  const [paused, setPaused] = useState(false);

  const draw = useCallback(() => {
    const { offset, step } = motion.current;
    if (!step) return;
    const loop = samples.length * step;
    cards.current.forEach((card, index) => {
      const x = wrap(index * step - offset + step, loop) - step;
      card?.style.setProperty("--clip-x", `${x}px`);
    });
  }, [samples.length]);

  useEffect(() => {
    const list = track.current;
    const card = cards.current[0];
    if (!list || !card) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const intersections = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    intersections.observe(list);
    const sizes = new ResizeObserver(() => {
      const state = motion.current;
      const gap = Number.parseFloat(getComputedStyle(list).columnGap) || 0;
      const step = card.getBoundingClientRect().width + gap;
      if (state.step) state.offset = (state.offset / state.step) * step;
      state.step = step;
      draw();
    });
    sizes.observe(list);
    let last = 0;
    let frame = 0;
    function tick(time: number) {
      const state = motion.current;
      if (
        last &&
        visible &&
        !query.matches &&
        !state.hover &&
        !state.focused &&
        !state.paused &&
        !playing.current &&
        !drag.current &&
        state.step
      ) {
        state.offset = wrap(
          state.offset + (Math.min(time - last, 48) / 1000) * speed,
          state.step * samples.length,
        );
        draw();
      }
      last = time;
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      intersections.disconnect();
      sizes.disconnect();
    };
  }, [draw, samples.length]);

  function stop() {
    const current = playing.current;
    if (!current) return;
    playing.current = null;
    videos.current[current.index]?.pause();
    setActive(null);
  }

  async function play(index: number, manual: boolean) {
    if (failed.includes(index)) return;
    const video = videos.current[index];
    if (!video || (playing.current?.index === index && !manual)) return;
    if (playing.current?.index !== index) stop();
    const attempt = { index, manual };
    playing.current = attempt;
    if (!video.getAttribute("src")) video.src = samples[index].src;
    try {
      await video.play();
      if (playing.current === attempt) setActive(index);
    } catch {
      // If the browser blocks audible hover playback, wait for a click/tap.
      // Do not silently start a muted preview or show a native player HUD.
      if (playing.current === attempt) stop();
    }
  }

  function move(distance: number) {
    const { step } = motion.current;
    if (!step) return;
    motion.current.offset = wrap(
      motion.current.offset + distance,
      step * samples.length,
    );
    draw();
  }

  function keepInView(index: number) {
    const list = track.current;
    const card = cards.current[index];
    if (!list || !card) return;
    const outer = list.getBoundingClientRect();
    const item = card.getBoundingClientRect();
    if (item.left < outer.left || item.right > outer.right)
      move(item.left - outer.left);
  }

  function startDrag(event: PointerEvent<HTMLUListElement>) {
    suppressClick.current = false;
    if (event.pointerType === "mouse") return;
    drag.current = { id: event.pointerId, x: event.clientX, moved: false };
  }

  function dragTrack(event: PointerEvent<HTMLUListElement>) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    const distance = current.x - event.clientX;
    if (!current.moved && Math.abs(distance) < 8) return;
    current.x = event.clientX;
    current.moved = true;
    suppressClick.current = true;
    move(distance);
  }

  return (
    <>
      <p className="sr-only" id="sample-clip-instructions">
        Click, tap, or press Enter on a clip to play or pause it with sound. Use
        Left and Right arrow keys to move the samples, or Space on the list to
        pause or resume automatic movement.
      </p>
      <ul
        className={styles.sampleTrack}
        ref={track}
        tabIndex={0}
        aria-label={
          paused ? "Video samples, automatic movement paused" : "Video samples"
        }
        aria-describedby="sample-clip-instructions"
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") motion.current.hover = true;
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") motion.current.hover = false;
        }}
        onPointerDown={startDrag}
        onPointerMove={dragTrack}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onFocus={() => {
          motion.current.focused = true;
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            motion.current.focused = false;
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && playing.current) {
            stop();
            track.current?.focus({ preventScroll: true });
            return;
          }
          if (event.target !== event.currentTarget) return;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            motion.current.paused = true;
            setPaused(true);
            move(motion.current.step * (event.key === "ArrowLeft" ? -1 : 1));
          } else if (event.key === " ") {
            event.preventDefault();
            motion.current.paused = !motion.current.paused;
            setPaused(motion.current.paused);
          }
        }}
      >
        {samples.map(({ src, poster, captions }, index) => (
          <li
            className={`card ${styles.sampleCard}`}
            key={src}
            ref={(node) => {
              cards.current[index] = node;
            }}
            style={{ "--clip-index": index } as CSSProperties}
            onFocus={() => keepInView(index)}
            onPointerEnter={(event) => {
              if (event.pointerType === "mouse") void play(index, false);
            }}
            onPointerLeave={() => {
              if (playing.current?.index === index && !playing.current.manual)
                stop();
            }}
          >
            <div className={styles.sampleScreen} data-active={active === index}>
              <video
                ref={(node) => {
                  videos.current[index] = node;
                }}
                aria-label={`Sample video ${index + 1} of ${samples.length}`}
                poster={poster}
                tabIndex={-1}
                preload="none"
                playsInline
                loop
                onError={() => {
                  if (playing.current?.index === index) stop();
                  setFailed((previous) =>
                    previous.includes(index) ? previous : [...previous, index],
                  );
                }}
              >
                {captions && (
                  <track
                    kind="captions"
                    default
                    src={captions.src}
                    srcLang={captions.language}
                    label={captions.label}
                  />
                )}
              </video>
              {failed.includes(index) ? (
                <p className={styles.videoStatus}>
                  This sample is unavailable.
                </p>
              ) : (
                <button
                  className={styles.playButton}
                  type="button"
                  aria-label={`${active === index ? "Pause" : "Play"} sample video ${index + 1}`}
                  onClick={() => {
                    if (!suppressClick.current) {
                      if (active === index) stop();
                      else void play(index, true);
                    }
                    suppressClick.current = false;
                  }}
                />
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
