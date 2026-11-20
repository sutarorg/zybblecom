export type Currency = "USD" | "INR";
export type CreditPack = {
  id: string;
  name: string;
  badge?: string;
  description: string;
  credits: number;
  pricesMinor: Record<Currency, number>;
  features: readonly string[];
};

export const creditPacks: readonly CreditPack[] = [
  {
    id: "starter",
    name: "Starter",
    description: "For your first batch of shorts.",
    credits: 30,
    pricesMinor: { USD: 900, INR: 29900 },
    features: [
      "30 minutes of standard video processing",
      "Up to 20 generated clips per source video",
      "AI captions",
      "Smart vertical reframing",
      "MP4 downloads",
      "Credits never expire",
    ],
  },
  {
    id: "creator",
    name: "Creator",
    badge: "Most popular",
    description: "For a regular publishing rhythm.",
    credits: 120,
    pricesMinor: { USD: 1900, INR: 99900 },
    features: [
      "Everything in Starter",
      "All available caption styles",
      "AI-ranked highlights",
      "Higher processing allowance",
      "Credits never expire",
    ],
  },
  {
    id: "studio",
    name: "Studio",
    badge: "Best value",
    description: "For a larger video library.",
    credits: 300,
    pricesMinor: { USD: 3900, INR: 249900 },
    features: [
      "Everything in Creator",
      "Bulk processing when available",
      "Priority processing, subject to availability",
      "Extended project organization",
      "Credits never expire",
    ],
  },
];
