import { twMerge } from "tailwind-merge";

/**
 * Class combiner that resolves Tailwind conflicts deterministically —
 * the last conflicting utility always wins (e.g. `bg-white` + `bg-ink`
 * correctly yields ink regardless of generated stylesheet order).
 */
export function cx(...parts: Array<string | false | null | undefined>) {
  return twMerge(parts.filter(Boolean).join(" "));
}

export function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "course"
  );
}

export function uid(prefix: string) {
  const rand = globalThis.crypto
    .getRandomValues(new Uint8Array(10))
    .reduce((s, b) => s + b.toString(16).padStart(2, "0"), "");
  return `${prefix}${rand}`;
}

/** Never send a full account number to the client — mask it server-side. */
export function maskAccount(accountNumber: string) {
  const tail = accountNumber.slice(-4);
  return `•••• •••• ${tail}`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export const CATEGORIES = [
  "Design",
  "Development",
  "Business",
  "Marketing",
  "Data & AI",
  "Creator",
  "Lifestyle",
  "Other",
] as const;

export const GRADIENT_PRESETS: Record<
  string,
  { label: string; css: string; swatch: string }
> = {
  violet: {
    label: "Ultraviolet",
    css: "linear-gradient(135deg,#1b1145 0%,#5b3df5 55%,#9d7bff 100%)",
    swatch: "#5b3df5",
  },
  lime: {
    label: "Citron",
    css: "linear-gradient(135deg,#16330c 0%,#4c8618 55%,#c8f542 100%)",
    swatch: "#9ed627",
  },
  ember: {
    label: "Ember",
    css: "linear-gradient(135deg,#3d0b0b 0%,#c2410c 55%,#ffb03a 100%)",
    swatch: "#ea5f1e",
  },
  ocean: {
    label: "Abyss",
    css: "linear-gradient(135deg,#04222e 0%,#0e7490 55%,#6ee7d8 100%)",
    swatch: "#1295a8",
  },
  rose: {
    label: "Bloom",
    css: "linear-gradient(135deg,#3d0a24 0%,#be185d 55%,#ffa7c4 100%)",
    swatch: "#d43d7e",
  },
};

export function thumbnailStyle(thumbnail: string): React.CSSProperties {
  if (thumbnail.startsWith("gradient:")) {
    const key = thumbnail.split(":")[1];
    const preset = GRADIENT_PRESETS[key] ?? GRADIENT_PRESETS.violet;
    return { background: preset.css };
  }
  return {
    backgroundImage: `url(${thumbnail})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}
