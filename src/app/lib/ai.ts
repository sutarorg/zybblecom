import { db } from "./db";
import { api, cacheRow, syncFromServer } from "./remote";
import type { AiResearch, AiScore, Lead } from "./types";

// ————————————————————————————————————————————————————————————
// AI features — OpenAI o4-mini, executed server-side.
// Results are plan-gated and cached in ai_research / ai_scores.
// ————————————————————————————————————————————————————————————

export async function researchCompany(leadId: string, force = false): Promise<AiResearch> {
  const row = await api<AiResearch>("/api/ai/research", { body: { leadId, force } });
  cacheRow("ai_research", row);
  db.update<Lead>("leads", leadId, { ai_summary: row.summary, updated_at: row.created_at });
  void syncFromServer();
  return row;
}

export async function scoreLead(leadId: string, force = false): Promise<AiScore> {
  const row = await api<AiScore>("/api/ai/score", { body: { leadId, force } });
  cacheRow("ai_scores", row);
  db.update<Lead>("leads", leadId, { ai_score: row.score, updated_at: row.created_at });
  void syncFromServer();
  return row;
}

/** Scores a bounded batch per call and reports what remains. */
export async function scoreAllLeads(): Promise<{ scored: number; remaining: number }> {
  const res = await api<{ scored: number; remaining: number }>("/api/ai/score-all", { body: {} });
  await syncFromServer(true);
  return res;
}

export type Tone = "friendly" | "direct" | "formal";

export async function writeEmail(
  leadId: string,
  tone: Tone = "friendly"
): Promise<{ subject: string; body: string }> {
  return api<{ subject: string; body: string }>("/api/ai/write", { body: { leadId, tone } });
}
