import { z } from "zod";
import {
  assertFeature,
  env,
  enforceRateLimit,
  HttpError,
  log,
  monthKey,
  requireUser,
  sb,
} from "./core.ts";
import { Raw, type Router } from "./http.ts";
import { searchJobView, selectSearchJobs } from "./jobs.ts";
import { aiResearch, aiScore, aiWriteEmail } from "./openai.ts";
import { describeFilters, filtersFromInput, filtersSchema } from "./filters.ts";

// ————————————————————————————————————————————————————————————
// Bootstrap sync, lead search jobs, leads, profile, AI.
// Every query is explicitly scoped to the authenticated user.
// ————————————————————————————————————————————————————————————

const uuid = z.string().uuid();

export function registerCore(r: Router) {
  // ————— Full account snapshot for the client cache —————
  r.get("/api/bootstrap", async ({ req }) => {
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
      emailJobs,
      events,
      suppression,
      billing,
    ] = await Promise.all([
      sb.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      sb.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle(),
      sb.from("usage").select("*").eq("user_id", user.id).eq("month", month).maybeSingle(),
      selectSearchJobs(user.id, 25),
      sb.from("leads").select("*", { count: "exact" }).eq("user_id", user.id).order("created_at", { ascending: false }).limit(1000),
      sb.from("ai_research").select("*").eq("user_id", user.id),
      sb.from("ai_scores").select("*").eq("user_id", user.id),
      // password_enc is NEVER selected — credentials stay server-side.
      sb.from("email_accounts").select("id,user_id,label,host,port,username,from_email,from_name,status,created_at").eq("user_id", user.id),
      sb.from("campaigns").select("*").eq("user_id", user.id),
      sb.from("email_jobs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(300),
      sb.from("email_events").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(300),
      sb.from("suppression_list").select("*").eq("user_id", user.id),
      sb.from("billing_events").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
    ]);

    const campaignIds = (campaigns.data ?? []).map((c) => c.id);
    const [steps, campaignLeads] = campaignIds.length
      ? await Promise.all([
          sb.from("campaign_steps").select("*").in("campaign_id", campaignIds),
          sb.from("campaign_leads").select("*").in("campaign_id", campaignIds),
        ])
      : [{ data: [] }, { data: [] }];

    return {
      profiles: profile.data ? [profile.data] : [],
      subscriptions: subscription.data ? [subscription.data] : [],
      usage: usage.data ? [usage.data] : [],
      search_jobs: jobs,
      leads: leads.data ?? [],
      lead_count: leads.count ?? leads.data?.length ?? 0,
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

  // ————— Lead Finder: enqueue a search job —————
  //
  // Discovery runs on the Railway scraper worker, which drives real Google
  // Maps through the open-source GoogleMapScraper engine (worker/scraper.py).
  // No Google Maps API key, Places API or Geocoding API is involved anywhere
  // in this path — Vercel only creates the durable job and tracks it.
  r.post("/api/search", async ({ req, json }) => {
    const user = await requireUser(req);
    await enforceRateLimit(user.id, "search", 20, 60);
    const input = await json(
      z.object({
        query: z.string().trim().min(2, "Describe who you're looking for.").max(120),
        location: z.string().trim().min(2, "Add a city, state or country.").max(80),
        quantity: z.number().int().min(1).max(200),
        radius_meters: z.number().int().min(1000).max(50000).default(25000),
        sort_by: z.enum(["relevance", "rating", "reviews", "newest"]).nullish(),
        filters: filtersSchema.nullish(),
      }),
    );

    if (!env.scraperWorkerSecret) {
      throw new HttpError(
        503,
        "Lead Finder is not configured: set SCRAPER_WORKER_SECRET in Vercel (and in the Railway worker) so the GoogleMapScraper worker can claim search jobs.",
      );
    }

    const filters = filtersFromInput(input.filters ?? undefined);
    const sortBy = input.sort_by ?? filters.sort_by;
    filters.sort_by = sortBy;
    filters.limit = input.quantity;
    const provider = "scraper";

    // Quota reservation and queue insert with resilient fallback.
    let jobs: Array<Record<string, unknown>> | null = null;
    let rpcError: { code?: string; message?: string; details?: string | null; hint?: string | null } | null = null;

    // 1. Canonical 8-argument RPC (migration 008): quantity + filters + sort.
    const r8 = await sb.rpc("create_search_job", {
      p_user: user.id,
      p_query: input.query,
      p_location: input.location,
      p_qty: input.quantity,
      p_radius: input.radius_meters,
      p_provider: provider,
      p_filters: filters as unknown as Record<string, unknown>,
      p_sort_by: sortBy,
    });

    if (!r8.error && r8.data) {
      jobs = r8.data as Array<Record<string, unknown>>;
    } else if (r8.error) {
      rpcError = r8.error;
      const isSignatureMismatch =
        rpcError.code === "42883" ||
        rpcError.code === "PGRST202" ||
        /does not exist|Could not find the function/i.test(rpcError.message ?? "");

      if (isSignatureMismatch) {
        // 2. Fallback: 6-argument RPC (migration 005/007)
        const r6 = await sb.rpc("create_search_job", {
          p_user: user.id,
          p_query: input.query,
          p_location: input.location,
          p_qty: input.quantity,
          p_radius: input.radius_meters,
          p_provider: provider,
        });
        if (!r6.error && r6.data) {
          jobs = r6.data as Array<Record<string, unknown>>;
          rpcError = null;
        } else {
          // 3. Fallback: 5-argument RPC (migration 004)
          const r5 = await sb.rpc("create_search_job", {
            p_user: user.id,
            p_query: input.query,
            p_location: input.location,
            p_qty: input.quantity,
            p_radius: input.radius_meters,
          });
          if (!r5.error && r5.data) {
            jobs = r5.data as Array<Record<string, unknown>>;
            rpcError = null;
          } else {
            // 4. Fallback: 4-argument RPC (migration 003)
            const r4 = await sb.rpc("create_search_job", {
              p_user: user.id,
              p_query: input.query,
              p_location: input.location,
              p_qty: input.quantity,
            });
            if (!r4.error && r4.data) {
              jobs = r4.data as Array<Record<string, unknown>>;
              rpcError = null;
            } else {
              // 5. Fallback: reserve quota, then insert directly.
              const { data: allowed } = await sb.rpc("try_consume_leads", {
                p_user: user.id,
                p_qty: input.quantity,
              });
              if (allowed) {
                const insertRes = await sb
                  .from("search_jobs")
                  .insert({
                    user_id: user.id,
                    query: input.query,
                    location: input.location,
                    quantity: input.quantity,
                    radius_meters: input.radius_meters,
                    provider,
                    status: "queued",
                    requested: input.quantity,
                    filters: filters as unknown as Record<string, unknown>,
                    sort_by: sortBy,
                  })
                  .select("*");
                if (!insertRes.error && insertRes.data?.length) {
                  jobs = insertRes.data as Array<Record<string, unknown>>;
                  rpcError = null;
                } else if (insertRes.error) {
                  // Older schemas without the new columns: insert the minimum.
                  const minRes = await sb
                    .from("search_jobs")
                    .insert({
                      user_id: user.id,
                      query: input.query,
                      location: input.location,
                      quantity: input.quantity,
                      status: "queued",
                    })
                    .select("*");
                  if (!minRes.error && minRes.data?.length) {
                    jobs = minRes.data as Array<Record<string, unknown>>;
                    rpcError = null;
                  }
                }
              } else {
                jobs = [];
                rpcError = null;
              }
            }
          }
        }
      }
    }

    if (rpcError && !jobs) {
      log.error("create_search_job RPC failed", {
        code: rpcError.code ?? null,
        message: rpcError.message,
        details: rpcError.details ?? null,
        hint: rpcError.hint ?? null,
        provider,
      });
      throw new HttpError(
        500,
        `Could not create the search job. (${[rpcError.code, rpcError.message].filter(Boolean).join(": ").slice(0, 200)})`,
      );
    }
    const job = jobs?.[0];
    if (!job) {
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
          : `Only ${remaining} leads remaining on your plan this month.`,
      );
    }
    log.info("search queued", {
      user: user.id,
      job: job.id,
      qty: input.quantity,
      filters: describeFilters(filters),
    });
    // Never expose the provider lease token or durable worker payload.
    return searchJobView({ ...job, filters, sort_by: sortBy });
  });

  // ————— Leads —————

  r.get("/api/leads", async ({ req, query }) => {
    const user = await requireUser(req);
    const q = query(
      z.object({
        offset: z.coerce.number().int().min(0).max(20000).default(0),
        limit: z.coerce.number().int().min(1).max(1000).default(1000),
      })
    );
    const { data, error, count } = await sb
      .from("leads")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(q.offset, q.offset + q.limit - 1);
    if (error) throw new HttpError(500, "Could not load leads.");
    return { leads: data ?? [], count: count ?? 0 };
  });

  r.post("/api/leads/delete", async ({ req, json }) => {
    const user = await requireUser(req);
    const { ids } = await json(z.object({ ids: z.array(uuid).min(1).max(500) }));
    const { error } = await sb.from("leads").delete().eq("user_id", user.id).in("id", ids);
    if (error) throw new HttpError(500, "Could not delete leads.");
    return { ok: true, deleted: ids.length };
  });

  r.patch("/api/leads/:id", async ({ req, json, params }) => {
    const user = await requireUser(req);
    const { notes } = await json(z.object({ notes: z.string().max(2000) }));
    const { data, error } = await sb
      .from("leads")
      .update({ notes, updated_at: new Date().toISOString() })
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select("*")
      .maybeSingle();
    if (error || !data) throw new HttpError(404, "Lead not found.");
    return data;
  });

  r.post("/api/leads/export", async ({ req, json }) => {
    const user = await requireUser(req);
    const { ids } = await json(z.object({ ids: z.array(uuid).max(20000).optional() }));
    let q = sb.from("leads").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (ids?.length) q = q.in("id", ids);
    const { data: leads } = await q.limit(20000);
    const esc = (v: unknown) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header =
      "company,category,address,city,state,country,phone,website,google_maps_url,place_id,rating,reviews,hours,open_status,description,email,email_status,email_source_url,social_profiles,ai_score,notes,created_at";
    const lines = (leads ?? []).map((l) =>
      [
        l.company,
        l.category,
        l.address,
        l.city,
        l.state,
        l.country,
        l.phone,
        l.website,
        l.maps_url,
        l.place_id,
        l.rating,
        l.reviews,
        l.hours,
        l.open_status,
        l.description,
        l.email,
        l.email_status,
        l.email_source_url,
        Array.isArray(l.social_profiles) ? l.social_profiles.join(" ") : "",
        l.ai_score,
        l.notes,
        l.created_at,
      ]
        .map(esc)
        .join(",")
    );
    return new Raw("\ufeff" + header + "\n" + lines.join("\n"), "text/csv; charset=utf-8", {
      "content-disposition": 'attachment; filename="zybble-leads.csv"',
    });
  });

  // ————— Profile / account —————

  r.patch("/api/profile", async ({ req, json }) => {
    const user = await requireUser(req);
    const input = await json(
      z.object({
        name: z.string().trim().min(1).max(100),
        company: z.string().trim().max(120),
        from_name: z.string().trim().min(1).max(100),
      })
    );
    const { data, error } = await sb
      .from("profiles")
      .update(input)
      .eq("id", user.id)
      .select("*")
      .maybeSingle();
    if (error || !data) throw new HttpError(404, "Profile not found.");
    return data;
  });

  r.delete("/api/account", async ({ req }) => {
    const user = await requireUser(req);
    await enforceRateLimit(user.id, "delete-account", 3, 3600);
    // Deleting the auth user cascades through profiles into every owned row.
    const { error } = await sb.auth.admin.deleteUser(user.id);
    if (error) throw new HttpError(500, "Could not delete the account.");
    log.info("account deleted", { user: user.id });
    return { ok: true };
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

  const aiBody = z.object({ leadId: uuid, force: z.boolean().default(false) });

  r.post("/api/ai/research", async ({ req, json }) => {
    const user = await requireUser(req);
    const { leadId, force } = await json(aiBody);
    await enforceRateLimit(user.id, "ai-research", 30, 60);
    await assertFeature(user.id, "ai");
    const lead = await ownedLead(user.id, leadId);

    const { data: cached } = await sb.from("ai_research").select("*").eq("lead_id", leadId).maybeSingle();
    if (cached && !force) return cached;

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
  });

  r.post("/api/ai/score", async ({ req, json }) => {
    const user = await requireUser(req);
    const { leadId, force } = await json(aiBody);
    await enforceRateLimit(user.id, "ai-score", 30, 60);
    await assertFeature(user.id, "ai");
    const lead = await ownedLead(user.id, leadId);

    const { data: cached } = await sb.from("ai_scores").select("*").eq("lead_id", leadId).maybeSingle();
    if (cached && !force) return cached;

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
  });

  r.post("/api/ai/score-all", async ({ req }) => {
    const user = await requireUser(req);
    await enforceRateLimit(user.id, "ai-score-all", 6, 60);
    await assertFeature(user.id, "ai");
    // Bounded so the request always completes inside the function timeout.
    const { data: leads } = await sb
      .from("leads")
      .select("*")
      .eq("user_id", user.id)
      .is("ai_score", null)
      .limit(25);

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
    const { count: remaining } = await sb
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("ai_score", null);
    return { scored, remaining: remaining ?? 0 };
  });

  r.post("/api/ai/write", async ({ req, json }) => {
    const user = await requireUser(req);
    const { leadId, tone } = await json(
      z.object({
        leadId: uuid,
        tone: z.enum(["friendly", "direct", "formal"]).default("friendly"),
      })
    );
    await enforceRateLimit(user.id, "ai-write", 30, 60);
    await assertFeature(user.id, "ai");
    const lead = await ownedLead(user.id, leadId);
    const [{ data: research }, { data: profile }] = await Promise.all([
      sb.from("ai_research").select("angle").eq("lead_id", leadId).maybeSingle(),
      sb.from("profiles").select("from_name,company,name").eq("id", user.id).maybeSingle(),
    ]);

    return aiWriteEmail({
      lead,
      angle: research?.angle ?? null,
      senderName: profile?.from_name || profile?.name || "there",
      senderCompany: profile?.company ?? "",
      tone,
    });
  });
}
