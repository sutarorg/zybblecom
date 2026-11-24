import { legalLinks } from "./legal";

export const site = {
  name: "Zybble",
  url: (process.env.SITE_URL || "https://zybble.com").replace(/\/$/, ""),
  description:
    "Turn long videos into short-form clips with AI-powered highlights, speaker-focused framing, and bold captions. Buy credits once and use them any time.",
} as const;

export const navigation = [
  { label: "Features", href: "/features" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Use cases", href: "/use-cases" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "Resources", href: "/resources" },
] as const;

export const publicPaths = [
  "/",
  "/features",
  "/how-it-works",
  "/use-cases",
  "/examples",
  "/pricing",
  "/resources",
  "/help",
  "/contact",
  "/faq",
  ...legalLinks.map(({ href }) => href),
] as const;
