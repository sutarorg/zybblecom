export type Topic = "Getting started" | "Clips & exports" | "Credits & pricing";
export type Question = {
  id: string;
  topic: Topic;
  question: string;
  answer: string;
};
export const questions: readonly Question[] = [
  {
    id: "what-is-zybble",
    topic: "Getting started",
    question: "What is Zybble?",
    answer:
      "Zybble is an AI video repurposing tool. It looks through a long video for standout moments, reframes the speaker for a vertical crop, and adds captions so you can review and download short clips.",
  },
  {
    id: "what-videos",
    topic: "Getting started",
    question: "What types of videos work best?",
    answer:
      "Start with speech-led recordings, such as video podcasts, interviews, tutorials, or webinars. Clear dialogue and a visible speaker make clips easier to frame and caption. Only use recordings you have permission to repurpose.",
  },
  {
    id: "what-is-a-credit",
    topic: "Credits & pricing",
    question: "How do credits work?",
    answer:
      "1 credit = 1 minute of standard video processing. That’s a minute of the source video, not a minute of the clips you download. A 40-minute recording uses 40 credits under standard processing.",
  },
  {
    id: "credit-expiry",
    topic: "Credits & pricing",
    question: "Do my credits ever expire?",
    answer:
      "No. Unused credits do not expire. You can use the credits from your pack when you have a video ready to process.",
  },
  {
    id: "free-or-subscription",
    topic: "Credits & pricing",
    question: "Is there a free plan or subscription?",
    answer:
      "No. Zybble offers three paid, one-time credit packs. There is no free plan, subscription, or recurring billing.",
  },
  {
    id: "regional-pricing",
    topic: "Credits & pricing",
    question: "Which currency will I see?",
    answer:
      "Zybble has fixed regional prices: INR for India and USD for other initial markets. These are defined prices, not exchange-rate conversions. If no country is available, the site displays USD.",
  },
  {
    id: "studio-availability",
    topic: "Credits & pricing",
    question: "Are bulk and priority processing guaranteed in Studio?",
    answer:
      "No. Studio includes bulk processing when available and priority processing subject to availability. It is a 400-credit pack, not unlimited processing.",
  },
  {
    id: "publish",
    topic: "Clips & exports",
    question: "Where can I publish my clips?",
    answer:
      "Zybble exports vertical 9:16 MP4s for you to upload yourself, for example to YouTube Shorts, Instagram Reels, or TikTok. Check your platform’s current length and upload requirements. A compatible export is not a direct integration.",
  },
  {
    id: "review-captions",
    topic: "Clips & exports",
    question: "Should I review clips before posting?",
    answer:
      "Yes. Play each clip back to check the framing, caption accuracy, context, and permissions. Pay special attention to speaker changes, proper names, and technical terms.",
  },
  {
    id: "virality",
    topic: "Clips & exports",
    question: "Will my shorts go viral?",
    answer:
      "No tool can promise that. Zybble helps you find and format promising moments. Reach depends on your content, audience, distribution, and other factors.",
  },
];
