"use client";

import { Check, Copy, Link2 } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const SLUGS = ["design-systems", "yoga-for-devs", "indie-music-theory", "motion-101"];

export function LinkBar({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % SLUGS.length), 2600);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`https://zybble.com/c/${SLUGS[index]}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-white/90 py-2 pl-4 pr-2 shadow-card backdrop-blur",
        className,
      )}
    >
      <style>{`@keyframes zybble-swap { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <Link2 className="size-4 shrink-0 text-grape" aria-hidden />
      <span className="truncate font-mono text-[13px] text-ink-soft">
        zybble.com/c/
        <span
          key={index}
          className="font-semibold text-ink"
          style={{ display: "inline-block", animation: "zybble-swap .5s cubic-bezier(.22,1,.36,1)" }}
        >
          {SLUGS[index]}
        </span>
      </span>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy link"}
        className={cn(
          "btn btn-sm h-8 gap-1.5 rounded-full px-3 transition-colors",
          copied ? "bg-mint-soft text-mint" : "bg-ink text-paper hover:bg-black",
        )}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        <span className="text-[12px]">{copied ? "Copied" : "Copy"}</span>
      </button>
    </div>
  );
}
