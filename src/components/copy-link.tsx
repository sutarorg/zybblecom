"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { cx } from "@/lib/utils";

export function CopyLink({
  value,
  label = "Copy link",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cx(
        "inline-flex h-9 items-center justify-center gap-2 rounded-full border px-4 text-[13px] font-semibold transition active:scale-[0.97]",
        copied
          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
          : "border-line bg-white text-ink hover:border-ink/35",
        className,
      )}
    >
      {copied ? <Check className="size-3.5" /> : <Link2 className="size-3.5" />}
      {copied ? "Copied!" : label}
    </button>
  );
}
