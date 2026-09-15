import { db, now, uid } from "./db";
import { assertAiAccess } from "./plans";
import { api, cacheRow, isRemote, syncFromServer } from "./remote";
import type { AiResearch, AiScore, Lead } from "./types";

// ————————————————————————————————————————————————————————————
// AI layer.
//   Production : OpenAI o4-mini behind the Zybble API with
//                strict anti-hallucination prompts, plan gating
//                and cached responses in ai_research / ai_scores.
//   Local dev  : deterministic heuristic models deriving every
//                statement exclusively from lead record fields.
// ————————————————————————————————————————————————————————————

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function presenceLabel(lead: Lead): string {
  if (!lead.website) return "no website found";
  if (lead.email_status === "verified") return "a live website and a verified public email";
  if (lead.email) return "a live website with a public email";
  return "a website but no publicly listed email";
}

export async function researchCompany(userId: string, leadId: string): Promise<AiResearch> {
  if (isRemote()) {
    const row = await api<AiResearch>("/api/ai/research", { body: { leadId } });
    cacheRow("ai_research", row);
    db.update<Lead>("leads", leadId, { ai_summary: row.summary, updated_at: row.created_at });
    void syncFromServer();
    return row;
  }

  assertAiAccess(userId, "AI Research");
  const cached = db.one<AiResearch>(
    "ai_research",
    (r) => r.lead_id === leadId && r.user_id === userId
  );
  if (cached) return cached;

  const lead = db.byId<Lead>("leads", leadId);
  if (!lead || lead.user_id !== userId) throw new Error("Lead not found.");

  const location = `${lead.city}${lead.state ? `, ${lead.state}` : ""}`;
  const rep =
    lead.rating && lead.reviews
      ? `${lead.rating} across ${lead.reviews} Google reviews`
      : lead.rating
        ? `${lead.rating} on Google with limited review volume`
        : "no public Google rating yet";
  const repTone =
    lead.rating && lead.rating >= 4.6 && (lead.reviews ?? 0) > 40
      ? "a strong local reputation"
      : lead.rating && lead.rating >= 4.2
        ? "a solid reputation"
        : lead.rating
          ? "a mixed reputation"
          : "an unproven online reputation";

  const summary =
    `${lead.company} is a ${lead.category.toLowerCase().replace(/s$/, "")} based in ${location}, with ${repTone} — rated ${rep}. ` +
    `The business has ${presenceLabel(lead)}${lead.hours ? ` and lists ${lead.hours.toLowerCase().includes("24") ? "24/7 availability" : "standard opening hours"}` : ""}. ` +
    (lead.description ?? "");

  const insights: { label: string; value: string }[] = [
    {
      label: "Reputation",
      value: lead.rating ? `${lead.rating} · ${lead.reviews ?? 0} reviews` : "Not rated yet",
    },
    {
      label: "Web presence",
      value: lead.website ? "Website live" : "No website found",
    },
    {
      label: "Contactability",
      value: lead.email
        ? `Public email (${lead.email_status})`
        : lead.phone
          ? "Phone only"
          : "Limited public contact info",
    },
    {
      label: "Market",
      value: `${location}${lead.country ? ` · ${lead.country}` : ""}`,
    },
  ];

  const categoryPain = (() => {
    const c = lead.category.toLowerCase();
    if (c.includes("dental")) return "keeping the appointment calendar consistently full";
    if (c.includes("roofing")) return "turning seasonal inquiries into signed contracts quickly";
    if (c.includes("marketing")) return "proving consistent, reportable results to clients";
    if (c.includes("plumb")) return "winning the urgent calls that go to whoever answers first";
    if (c.includes("hvac")) return "filling the schedule between seasonal rushes";
    if (c.includes("law")) return "converting consultations into retained cases";
    if (c.includes("real estate")) return "keeping a steady pipeline of qualified clients";
    if (c.includes("salon")) return "keeping chairs booked on slower weekdays";
    if (c.includes("restaurant")) return "driving weeknight covers and repeat visits";
    if (c.includes("gym") || c.includes("studio")) return "turning new sign-ups into long-term members";
    if (c.includes("landscap")) return "booking recurring contracts instead of one-off jobs";
    if (c.includes("account")) return "winning year-round advisory clients";
    return "finding a predictable stream of new customers";
  })();

  const angle = !lead.website
    ? `${lead.company} has no website — that's the opening. Lead with how quickly they could establish a credible web presence and convert the reviews they already have.`
    : lead.rating && lead.rating >= 4.5
      ? `Reference their ${lead.rating}-star reputation${lead.reviews ? ` (${lead.reviews} reviews)` : ""} — businesses doing this well usually care about ${categoryPain}. Position your offer around that, not around fixing obvious problems.`
      : `Focus on ${categoryPain}. ${lead.rating ? "Their reputation is solid but not dominant, so growth-minded messaging will land better than reputation repair." : "With little public reputation, a low-risk, proof-led offer is the right door-opener."}`;

  const research: AiResearch = {
    id: uid(),
    user_id: userId,
    lead_id: leadId,
    summary,
    insights,
    angle,
    created_at: now(),
  };
  db.insert("ai_research", research);
  db.update<Lead>("leads", leadId, { ai_summary: summary, updated_at: now() });
  return research;
}

export async function scoreLead(userId: string, leadId: string): Promise<AiScore> {
  if (isRemote()) {
    const row = await api<AiScore>("/api/ai/score", { body: { leadId } });
    cacheRow("ai_scores", row);
    db.update<Lead>("leads", leadId, { ai_score: row.score, updated_at: row.created_at });
    void syncFromServer();
    return row;
  }

  assertAiAccess(userId, "AI Lead Scoring");
  const cached = db.one<AiScore>(
    "ai_scores",
    (r) => r.lead_id === leadId && r.user_id === userId
  );
  if (cached) return cached;

  const lead = db.byId<Lead>("leads", leadId);
  if (!lead || lead.user_id !== userId) throw new Error("Lead not found.");

  let score = 42;
  const reasons: string[] = [];

  if (lead.rating !== null) {
    const delta = round1((lead.rating - 3.5) * 14);
    score += delta;
    reasons.push(
      lead.rating >= 4.5
        ? `${lead.rating} rating signals a trusted, well-run business`
        : lead.rating >= 4.0
          ? `${lead.rating} rating is healthy but not standout`
          : `${lead.rating} rating suggests service gaps — approach carefully`
    );
  } else {
    score += 1;
    reasons.push("No public rating yet — limited trust signals");
  }

  if (lead.reviews) {
    const revPts = Math.min(14, Math.round(Math.log(lead.reviews + 1) * 3));
    score += revPts;
    if (lead.reviews >= 50)
      reasons.push(`${lead.reviews} reviews shows an established customer base`);
    else if (lead.reviews >= 15)
      reasons.push(`${lead.reviews} reviews — active but still growing`);
  }

  if (lead.website) {
    score += 9;
    reasons.push("Live website — reachable and researchable");
  } else {
    score -= 4;
    reasons.push("No website found — may be harder to reach");
  }

  if (lead.email_status === "verified") {
    score += 10;
    reasons.push("Verified public email — outreach-ready");
  } else if (lead.email_status === "risky") {
    score += 4;
    reasons.push("Public email found but deliverability is uncertain");
  } else if (!lead.email) {
    score -= 2;
  }

  if (lead.phone) score += 3;
  if (lead.hours) score += 2;
  score += (hash(lead.id) % 9) - 4;
  score = Math.max(5, Math.min(98, Math.round(score)));
  reasons.push("Category and location match your search criteria");

  const verdict =
    score >= 85 ? "Excellent fit" : score >= 70 ? "Strong fit" : score >= 50 ? "Moderate fit" : "Low fit";

  const row: AiScore = {
    id: uid(),
    user_id: userId,
    lead_id: leadId,
    score,
    verdict,
    reasons,
    created_at: now(),
  };
  db.insert("ai_scores", row);
  db.update<Lead>("leads", leadId, { ai_score: score, updated_at: now() });
  return row;
}

/** Score every unscored lead owned by the user (plan-gated). */
export async function scoreAllLeads(userId: string): Promise<number> {
  if (isRemote()) {
    const res = await api<{ scored: number }>("/api/ai/score-all", { body: {} });
    void syncFromServer(true);
    return res.scored;
  }
  assertAiAccess(userId, "AI Lead Scoring");
  const unscored = db.where<Lead>(
    "leads",
    (l) => l.user_id === userId && l.ai_score === null
  );
  let n = 0;
  for (const l of unscored) {
    try {
      await scoreLead(userId, l.id);
      n++;
    } catch {
      /* skip */
    }
  }
  return n;
}

export type Tone = "friendly" | "direct" | "formal";

export async function writeEmail(
  userId: string,
  leadId: string,
  tone: Tone = "friendly"
): Promise<{ subject: string; body: string }> {
  if (isRemote()) {
    return api<{ subject: string; body: string }>("/api/ai/write", {
      body: { leadId, tone },
    });
  }

  assertAiAccess(userId, "AI Email Writer");
  const lead = db.byId<Lead>("leads", leadId);
  if (!lead || lead.user_id !== userId) throw new Error("Lead not found.");

  const research = db.one<AiResearch>(
    "ai_research",
    (r) => r.lead_id === leadId && r.user_id === userId
  );
  const me = db.one<{ id: string; from_name: string; company: string }>(
    "profiles",
    (p) => p.id === userId
  );
  const sender = me?.from_name || "there";
  const senderCompany = me?.company?.trim();

  const city = lead.city;
  const fact = lead.rating
    ? `your ${lead.rating}-star rating${lead.reviews ? ` across ${lead.reviews} reviews` : ""} caught my attention`
    : lead.website
      ? `I spent some time on your website`
      : `I noticed ${lead.company} while researching ${lead.category.toLowerCase()} in ${city}`;

  const angleLine = research
    ? research.angle.split(". ")[0] + "."
    : `Businesses like yours in ${city} usually tell us growth is less about demand and more about consistently converting it.`;

  const subject =
    tone === "direct"
      ? `${lead.company} — quick question`
      : tone === "formal"
        ? `Inquiry for ${lead.company}`
        : `A thought for ${lead.company}`;

  const greeting =
    tone === "formal" ? `Hello ${lead.company} team,` : `Hi ${lead.company} team,`;
  const closer =
    tone === "formal"
      ? "Kind regards,"
      : tone === "direct"
        ? "Thanks,"
        : "Best,";

  const body = `${greeting}

I came across ${lead.company} while looking at ${lead.category.toLowerCase()} in ${city} — ${fact}.

${angleLine}${senderCompany ? ` At ${senderCompany}, that's exactly what we focus on.` : ""}

Would it be worth a short conversation this week to see if there's a fit?

${closer}
${sender}`;

  return { subject, body };
}
