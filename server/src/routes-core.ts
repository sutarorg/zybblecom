import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { assertFeature, HttpError, log, monthKey, requireUser, sb } from "./core";
import { aiResearch, aiScore, aiWriteEmail } from "./openai";

// ————————————————————————————————————————————————————————————
// Core routes: bootstrap sync, search queue, leads, AI.
// Every query is explicitly scoped to the authenticated user.
// ————————————————————————————————————————————————————————————

function body<T>(schema: z.ZodType<T>, payload: unknown): T {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid request.");
  }
  return parsed.data;
}

const uuid = z.string().uuid();

export async function registerCore(app: FastifyInstance) {
  // ————— Bootstrap: full account snapshot for the client cache —————
  app.get("/api/bootstrap", async (req) => {
    const user = await requireUser(req);
    const month = monthKey();

    const [
      profile,
      subscription,
      usage,
      jobs,
      leads,
      research,
      scores,
      accounts,
      campaigns,
      steps,
      campaignLeads,
      emailJobs,
      events,
      suppression,
      billing,
    ] = await Promise.all([
      sb.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      sb.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle(),
      sb.from("usage").select("*").eq("user_id", user.id).eq("month", month).maybeSingle(),
      sb.from("search_jobs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(25),
      sb.from("leads").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1000),
      sb.from("ai_research").select("*").eq("user_id", user.id),
      sb.from("ai_scores").select("*").eq("user_id", user.id),
      // password_enc is NEVER selected — credentials stay server-side.
      sb.from("email_accounts").select("id,user_id,label,host,port,username,from_email,from_name,status,created_at").eq("user_id", user.id),
      sb.from("campaigns").select("*").eq("user_id", user.id),
      sb.from("campaign_steps").select("*").in("campaign_id",
        (await sb.from("campaigns").select("id").eq("user_id", user.id)).data?.map((c) => c.id) ?? []),
      sb.from("campaign_leads").select("*").in("campaign_id",
        (await sb.from("campaigns").select("id").eq("user_id", user.id)).data?.map((c) => c.id) ?? []),
      sb.from("email_jobs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(300),
      sb.from("email_events").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(300),
      sb.from("suppression_list").select("*").eq("user_id", user.id),
      sb.from("billing_events").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
    ]);

    return {
      profiles: profile.data ? [profile.data] : [],
      subscriptions: subscription.data ? [subscription.data] : [],
      usage: usage.data ? [usage.data] : [],
      search_jobs: jobs.data ?? [],
      leads: leads.data ?? [],
      ai_research: research.data ?? [],
      ai_scores: scores.data ?? [],
      email_accounts: accounts.data ?? [],
      campaigns: campaigns.data ?? [],
      campaign_steps: steps.data ?? [],
      campaign_leads: campaignLeads.data ?? [],
      email_jobs: emailJobs.data ?? [],
      email_events: events.data ?? [],
      suppression_list: suppression.data ?? [],
      billing_events: billing.data ?? [],
    };
  });

  // ————— Lead Finder: enqueue a scraping job (worker consumes) —————
  app.post(
    "/api/search",
    { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (req) => {
      const user = await requireUser(req);
      const input = body(
        z.object({
          query: z.string().trim().min(2, "Describe who you're looking for.").max(120),
          location: z.string().trim().min(2, "Add a city, state or country.").max(80),
          quantity: z.number().int().min(1).max(200),
        }),
        req.body
      );

      // Atomic, server-side usage enforcement.
      const { data: allowed } = await sb.rpc("try_consume_leads", {
        p_user: user.id,
        p_qty: input.quantity,
      });
      if (!allowed) {
        const [{ data: sub }, { data: usage }] = await Promise.all([
          sb.from("subscriptions").select("plan").eq("user_id", user.id).maybeSingle(),
          sb.from("usage").select("leads_used").eq("user_id", user.id).eq("month", monthKey()).maybeSingle(),
        ]);
        const limits = { free: 100, growth: 5000, agency: 20000 } as const;
        const plan = (sub?.plan ?? "free") as keyof typeof limits;
        const remaining = Math.max(0, limits[plan] - (usage?.leads_used ?? 0));
        throw new HttpError(
          402,
          remaining <= 0
            ? `You've used all ${plan} leads for this month. Upgrade to keep finding leads.`
            : `Only ${remaining} leads remaining on your plan this month.`
        );
      }

      const { data: job, error } = await sb
        .from("search_jobs")
        .insert({
          user_id: user.id,
          query: input.query,
          location: input.location,
          quantity: input.quantity,
          status: "queued",
        })
        .select("*")
        .single();
      if (error) throw new HttpError(500, "Could not create the search job.");
      log.info("search queued", { user: user.id, job: job.id, query: input.query, qty: input.quantity });
      return job;
    }
  );

  // ————— Leads —————

  app.post("/api/leads/delete", async (req) => {
    const user = await requireUser(req);
    const { ids } = body(z.object({ ids: z.array(uuid).min(1).max(500) }), req.body);
    const { error } = await sb.from("leads").delete().eq("user_id", user.id).in("id", ids);
    if (error) throw new HttpError(500, "Could not delete leads.");
    return { ok: true, deleted: ids.length };
  });

  app.patch("/api/leads/:id", async (req) => {
    const user = await requireUser(req);
    const { id } = req.params as { id: string };
    const { notes } = body(z.object({ notes: z.string().max(2000) }), req.body);
    const { data, error } = await sb
      .from("leads")
      .update({ notes, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .maybeSingle();
    if (error || !data) throw new HttpError(404, "Lead not found.");
    return data;
  });

  app.post("/api/leads/export", async (req, reply) => {
    const user = await requireUser(req);
    const { ids } = body(z.object({ ids: z.array(uuid).max(20000).optional() }), req.body);
    let q = sb.from("leads").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (ids?.length) q = q.in("id", ids);
    const { data: leads } = await q.limit(20000);
    const esc = (v: unknown) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = "company,category,address,city,state,country,phone,website,google_maps_url,rating,reviews,hours,description,email,email_status,ai_score,created_at";
    const lines = (leads ?? []).map((l) =>
      [l.company, l.category, l.address, l.city, l.state, l.country, l.phone, l.website, l.maps_url, l.rating, l.reviews, l.hours, l.description, l.email, l.email_status, l.ai_score, l.created_at]
        .map(esc)
        .join(",")
    );
    void reply
      .header("content-type", "text/csv; charset=utf-8")
      .header("content-disposition", `attachment; filename="zybble-leads.csv"`);
    return "﻿" + header + "\n" + lines.join("\n");
  });

  // ————— AI (OpenAI o4-mini, plan-gated, cached) —————

  async function ownedLead(userId: string, leadId: string) {
    const { data: lead } = await sb
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!lead) throw new HttpError(404, "Lead not found.");
    return lead;
  }

  app.post(
    "/api/ai/research",
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (req) => {
      const user = await requireUser(req);
      const { leadId } = body(z.object({ leadId: uuid }), req.body);
      await assertFeature(user.id, "ai");
      const lead = await ownedLead(user.id, leadId);

      const { data: cached } = await sb
        .from("ai_research")
        .select("*")
        .eq("lead_id", leadId)
        .maybeSingle();
      if (cached) return cached;

      const out = await aiResearch(lead);
      const { data: row, error } = await sb
        .from("ai_research")
        .upsert(
          { user_id: user.id, lead_id: leadId, summary: out.summary, insights: out.insights, angle: out.angle },
          { onConflict: "lead_id" }
        )
        .select("*")
        .single();
      if (error) throw new HttpError(500, "Could not save research.");
      await sb.from("leads").update({ ai_summary: out.summary, updated_at: new Date().toISOString() }).eq("id", leadId);
      return row;
    }
  );

  app.post(
    "/api/ai/score",
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (req) => {
      const user = await requireUser(req);
      const { leadId } = body(z.object({ leadId: uuid }), req.body);
      await assertFeature(user.id, "ai");
      const lead = await ownedLead(user.id, leadId);

      const { data: cached } = await sb.from("ai_scores").select("*").eq("lead_id", leadId).maybeSingle();
      if (cached) return cached;

      const out = await aiScore(lead);
      const { data: row, error } = await sb
        .from("ai_scores")
        .upsert(
          { user_id: user.id, lead_id: leadId, score: out.score, verdict: out.verdict, reasons: out.reasons },
          { onConflict: "lead_id" }
        )
        .select("*")
        .single();
      if (error) throw new HttpError(500, "Could not save score.");
      await sb.from("leads").update({ ai_score: out.score, updated_at: new Date().toISOString() }).eq("id", leadId);
      return row;
    }
  );

  app.post(
    "/api/ai/score-all",
    { config: { rateLimit: { max: 6, timeWindow: "1 minute" } } },
    async (req) => {
      const user = await requireUser(req);
      await assertFeature(user.id, "ai");
      const { data: leads } = await sb
        .from("leads")
        .select("*")
        .eq("user_id", user.id)
        .is("ai_score", null)
        .limit(200);
      let scored = 0;
      for (const lead of leads ?? []) {
        try {
          const out = await aiScore(lead);
          await sb.from("ai_scores").upsert(
            { user_id: user.id, lead_id: lead.id, score: out.score, verdict: out.verdict, reasons: out.reasons },
            { onConflict: "lead_id" }
          );
          await sb.from("leads").update({ ai_score: out.score, updated_at: new Date().toISOString() }).eq("id", lead.id);
          scored++;
        } catch (err) {
          log.warn("score-all item failed", { lead: lead.id, err: String(err) });
        }
      }
      return { scored };
    }
  );

  app.post(
    "/api/ai/write",
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (req) => {
      const user = await requireUser(req);
      const { leadId, tone } = body(
        z.object({
          leadId: uuid,
          tone: z.enum(["friendly", "direct", "formal"]).default("friendly"),
        }),
        req.body
      );
      await assertFeature(user.id, "ai");
      const lead = await ownedLead(user.id, leadId);
      const [{ data: research }, { data: profile }] = await Promise.all([
        sb.from("ai_research").select("angle").eq("lead_id", leadId).maybeSingle(),
        sb.from("profiles").select("from_name,company,name").eq("id", user.id).maybeSingle(),
      ]);

      const out = await aiWriteEmail({
        lead,
        angle: research?.angle ?? null,
        senderName: profile?.from_name || profile?.name || "there",
        senderCompany: profile?.company ?? "",
        tone,
      });
      return out;
    }
  );
}
