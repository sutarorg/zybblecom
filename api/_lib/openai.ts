import { z } from "zod";
import { env, log, MissingEnvError } from "./core";

// ————————————————————————————————————————————————————————————
// OpenAI o4-mini — research, scoring, email writing.
// Anti-hallucination by construction: the model only ever sees
// fields from the lead record, and prompts forbid inventing
// customers, achievements, technologies or company facts.
// ————————————————————————————————————————————————————————————

export interface LeadPayload {
  company: string;
  category: string;
  city: string;
  state: string;
  country: string;
  rating: number | null;
  reviews: number | null;
  website: string | null;
  phone: string | null;
  hours: string | null;
  description: string | null;
  email_status: string | null;
}

async function chat(system: string, user: string, maxTokens = 900): Promise<string> {
  if (!env.openaiKey) throw new MissingEnvError("OPENAI_API_KEY");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.openaiModel,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: maxTokens,
    }),
    signal: AbortSignal.timeout(45_000),
  });
  const text = await res.text();
  if (!res.ok) {
    log.error("openai error", { status: res.status, body: text.slice(0, 300) });
    throw new Error("AI service temporarily unavailable — try again.");
  }
  const parsed = JSON.parse(text) as { choices?: { message?: { content?: string } }[] };
  const content = parsed.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI returned an empty response — try again.");
  return content;
}

function leadJson(lead: LeadPayload): string {
  return JSON.stringify(
    {
      company: lead.company,
      category: lead.category,
      location: [lead.city, lead.state, lead.country].filter(Boolean).join(", "),
      google_rating: lead.rating,
      google_reviews: lead.reviews,
      website: lead.website,
      phone: lead.phone,
      hours: lead.hours,
      description: lead.description,
      email_status: lead.email_status,
    },
    null,
    2
  );
}

const GUARDRAILS = `Rules (strict):
- Use ONLY the business data provided. It comes from public listings.
- NEVER invent customers, achievements, awards, partnerships, technologies, funding, staff names or company facts.
- If data is missing, simply omit it.
- Be concise, factual and specific. Output valid JSON only.`;

const researchSchema = z.object({
  summary: z.string().min(20).max(1200),
  insights: z
    .array(z.object({ label: z.string().min(1).max(24), value: z.string().min(1).max(80) }))
    .min(2)
    .max(6),
  angle: z.string().min(20).max(600),
});
export type ResearchOutput = z.infer<typeof researchSchema>;

export async function aiResearch(lead: LeadPayload): Promise<ResearchOutput> {
  const system = `You are Zybble Research, producing short company briefs for B2B outreach.
Return JSON: {"summary": string (<=70 words), "insights": [{"label": string, "value": string}] (3-5 items covering reputation, web presence, contactability, market), "angle": string (<=45 words — the single best outreach angle grounded in the data)}.
${GUARDRAILS}`;
  return researchSchema.parse(JSON.parse(await chat(system, `Business data:\n${leadJson(lead)}`)));
}

const scoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  verdict: z.string().min(2).max(40),
  reasons: z.array(z.string().min(8).max(160)).min(3).max(6),
});
export type ScoreOutput = z.infer<typeof scoreSchema>;

export async function aiScore(lead: LeadPayload): Promise<ScoreOutput> {
  const system = `You are Zybble Scoring. Score how strong this business is as a B2B outreach lead (services like web, marketing, software or operations support).
Weigh: reputation (rating/reviews), reachability (public email, phone, website), digital presence (missing website can mean opportunity OR reachability risk — note which), and business maturity.
Return JSON: {"score": integer 0-100, "verdict": string like "Excellent fit", "reasons": [3-6 short explainable reasons referencing only the provided data]}.
${GUARDRAILS}`;
  return scoreSchema.parse(JSON.parse(await chat(system, `Business data:\n${leadJson(lead)}`)));
}

const emailSchema = z.object({
  subject: z.string().min(4).max(90),
  body: z.string().min(80).max(1600),
});
export type EmailOutput = z.infer<typeof emailSchema>;

export async function aiWriteEmail(params: {
  lead: LeadPayload;
  angle: string | null;
  senderName: string;
  senderCompany: string;
  tone: "friendly" | "direct" | "formal";
}): Promise<EmailOutput> {
  const system = `You are Zybble Writer, drafting concise, human cold outreach emails.
Return JSON: {"subject": string (<=9 words, no clickbait), "body": string (<=120 words, plain text)}.
Structure: one personalized opening line referencing ONLY the provided data → one relevant observation → one soft question CTA → sign-off as ${params.senderName}.
Tone: ${params.tone}. Never use bracket placeholders. Never invent results, clients or claims.
${params.senderCompany ? `The sender works at ${params.senderCompany} — reference naturally at most once.` : ""}
${GUARDRAILS}`;
  const user = `Business data:\n${leadJson(params.lead)}${
    params.angle ? `\n\nRecommended outreach angle (use it, rephrased naturally):\n${params.angle}` : ""
  }`;
  return emailSchema.parse(JSON.parse(await chat(system, user, 700)));
}
