import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  assertFeature,
  decryptSecret,
  encryptSecret,
  env,
  HttpError,
  log,
  PLAN_LIMITS,
  planFor,
  requireUser,
  sb,
} from "./core";
import { verifySmtp } from "./mailer";
import { logEvent, newUnsubToken, scheduleStep } from "./sequence";

// ————————————————————————————————————————————————————————————
// Outreach routes: SMTP accounts, campaigns + sequences,
// suppression, public unsubscribe, inbound reply webhook.
// ————————————————————————————————————————————————————————————

function body<T>(schema: z.ZodType<T>, payload: unknown): T {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid request.");
  return parsed.data;
}

const maskedAccount =
  "id,user_id,label,host,port,username,from_email,from_name,status,created_at";

export async function registerOutreach(app: FastifyInstance) {
  // ————— SMTP accounts —————

  app.post("/api/accounts", async (req) => {
    const user = await requireUser(req);
    const form = body(
      z.object({
        label: z.string().trim().max(60).default(""),
        host: z.string().trim().min(3).max(120).refine((h) => h.includes("."), "Enter a valid SMTP host."),
        port: z.number().int().min(1).max(65535),
        username: z.string().trim().min(1, "SMTP username is required.").max(200),
        password: z.string().min(4, "SMTP password is required.").max(200),
        from_email: z.string().trim().email("Enter a valid from email.").max(200),
        from_name: z.string().trim().max(80).default(""),
      }),
      req.body
    );

    const { plan } = await planFor(user.id);
    const limit = PLAN_LIMITS[plan]?.senders ?? 1;
    const { count } = await sb
      .from("email_accounts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    if ((count ?? 0) >= limit)
      throw new HttpError(403, `Your plan supports ${limit} connected sender${limit > 1 ? "s" : ""}. Upgrade to connect more.`);

    // Live handshake before storing — invalid credentials fail here.
    try {
      await verifySmtp({ host: form.host, port: form.port, username: form.username, password: form.password });
    } catch (err) {
      const msg = (err as Error).message?.slice(0, 140) ?? "handshake failed";
      throw new HttpError(400, `SMTP connection failed: ${msg}`);
    }

    const { data, error } = await sb
      .from("email_accounts")
      .insert({
        user_id: user.id,
        label: form.label || form.from_email,
        host: form.host,
        port: form.port,
        username: form.username,
        password_enc: encryptSecret(form.password),
        from_email: form.from_email.toLowerCase(),
        from_name: form.from_name,
        status: "active",
      })
      .select(maskedAccount)
      .single();
    if (error) throw new HttpError(500, "Could not save the sender.");
    log.info("smtp account connected", { user: user.id, account: data.id });
    return data;
  });

  app.delete("/api/accounts/:id", async (req) => {
    const user = await requireUser(req);
    const { id } = req.params as { id: string };
    await sb
      .from("campaigns")
      .update({ account_id: null, status: "paused", updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("account_id", id)
      .eq("status", "active");
    await sb.from("campaigns").update({ account_id: null }).eq("user_id", user.id).eq("account_id", id);
    await sb.from("email_accounts").delete().eq("id", id).eq("user_id", user.id);
    return { ok: true };
  });

  app.post("/api/accounts/:id/test", async (req) => {
    const user = await requireUser(req);
    const { id } = req.params as { id: string };
    const { data: account } = await sb
      .from("email_accounts")
      .select("host,port,username,password_enc")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!account) throw new HttpError(404, "Account not found.");
    try {
      await verifySmtp({
        host: account.host,
        port: account.port,
        username: account.username,
        password: decryptSecret(account.password_enc as string),
      });
    } catch (err) {
      await sb.from("email_accounts").update({ status: "error" }).eq("id", id);
      throw new HttpError(400, `SMTP connection failed: ${(err as Error).message.slice(0, 140)}`);
    }
    await sb.from("email_accounts").update({ status: "active" }).eq("id", id);
    return { ok: true };
  });

  // ————— Suppression —————

  app.post("/api/suppression", async (req) => {
    const user = await requireUser(req);
    const { email } = body(z.object({ email: z.string().trim().email().max(200) }), req.body);
    await sb
      .from("suppression_list")
      .upsert({ user_id: user.id, email: email.toLowerCase(), reason: "manual" }, { onConflict: "user_id,email", ignoreDuplicates: true });
    const { data } = await sb
      .from("suppression_list")
      .select("*")
      .eq("user_id", user.id)
      .eq("email", email.toLowerCase())
      .maybeSingle();
    return data;
  });

  app.delete("/api/suppression/:email", async (req) => {
    const user = await requireUser(req);
    const { email } = req.params as { email: string };
    await sb.from("suppression_list").delete().eq("user_id", user.id).eq("email", decodeURIComponent(email).toLowerCase());
    return { ok: true };
  });

  // ————— Campaigns —————

  const stepSchema = z.object({
    day_offset: z.number().int().min(0).max(90),
    subject: z.string().trim().min(1, "Every step needs a subject.").max(160),
    body: z.string().trim().min(1, "Every step needs a body.").max(5000),
  });
  const campaignSchema = z
    .object({
      name: z.string().trim().min(1, "Name your campaign.").max(120),
      account_id: z.string().uuid().nullable(),
      steps: z.array(stepSchema).min(1, "Add at least one complete email step.").max(6),
    })
    .refine((v) => v.steps[0].day_offset === 0, "The first email must send on day 0.")
    .refine(
      (v) => v.steps.every((s, i) => i === 0 || s.day_offset > v.steps[i - 1].day_offset),
      "Each follow-up must be scheduled after the previous one."
    );

  app.post("/api/campaigns", async (req) => {
    const user = await requireUser(req);
    await assertFeature(user.id, "sequences");
    const input = body(campaignSchema, req.body);

    const { data: campaign, error } = await sb
      .from("campaigns")
      .insert({ user_id: user.id, name: input.name, account_id: input.account_id, status: "draft" })
      .select("*")
      .single();
    if (error || !campaign) throw new HttpError(500, "Could not create the campaign.");

    const { data: steps, error: stepError } = await sb
      .from("campaign_steps")
      .insert(
        input.steps.map((s, i) => ({
          campaign_id: campaign.id,
          position: i + 1,
          day_offset: s.day_offset,
          subject: s.subject,
          body: s.body,
        }))
      )
      .select("*");
    if (stepError) {
      await sb.from("campaigns").delete().eq("id", campaign.id);
      throw new HttpError(500, "Could not save campaign steps.");
    }
    return { campaign, steps: steps ?? [] };
  });

  app.put("/api/campaigns/:id", async (req) => {
    const user = await requireUser(req);
    const { id } = req.params as { id: string };
    const { data: existing } = await sb.from("campaigns").select("status").eq("id", id).eq("user_id", user.id).maybeSingle();
    if (!existing) throw new HttpError(404, "Campaign not found.");
    if (existing.status === "active") throw new HttpError(409, "Pause the campaign before editing it.");
    const input = body(campaignSchema, req.body);

    await sb.from("campaigns").update({ name: input.name, account_id: input.account_id, updated_at: new Date().toISOString() }).eq("id", id);
    await sb.from("campaign_steps").delete().eq("campaign_id", id);
    await sb.from("campaign_steps").insert(
      input.steps.map((s, i) => ({ campaign_id: id, position: i + 1, day_offset: s.day_offset, subject: s.subject, body: s.body }))
    );
    return { ok: true };
  });

  app.delete("/api/campaigns/:id", async (req) => {
    const user = await requireUser(req);
    const { id } = req.params as { id: string };
    await sb.from("campaigns").delete().eq("id", id).eq("user_id", user.id);
    return { ok: true };
  });

  app.post("/api/campaigns/:id/leads", async (req) => {
    const user = await requireUser(req);
    const { id } = req.params as { id: string };
    const { leadIds } = body(z.object({ leadIds: z.array(z.string().uuid()).min(1).max(500) }), req.body);
    const { data: campaign } = await sb.from("campaigns").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
    if (!campaign) throw new HttpError(404, "Campaign not found.");

    const [{ data: leads }, { data: suppressed }, { data: existing }] = await Promise.all([
      sb.from("leads").select("id,email").eq("user_id", user.id).in("id", leadIds).not("email", "is", null).neq("email_status", "invalid"),
      sb.from("suppression_list").select("email").eq("user_id", user.id),
      sb.from("campaign_leads").select("lead_id").eq("campaign_id", id),
    ]);
    const suppressedSet = new Set((suppressed ?? []).map((s) => s.email));
    const existingSet = new Set((existing ?? []).map((c) => c.lead_id));
    const eligible = (leads ?? []).filter((l) => l.email && !suppressedSet.has(l.email) && !existingSet.has(l.id));

    if (eligible.length > 0) {
      await sb.from("campaign_leads").insert(
        eligible.map((l) => ({
          campaign_id: id,
          lead_id: l.id,
          status: "active",
          current_step: 0,
          unsub_token: newUnsubToken(),
        }))
      );
    }
    const { count } = await sb.from("campaign_leads").select("id", { count: "exact", head: true }).eq("campaign_id", id);
    await sb.from("campaigns").update({ total_leads: count ?? 0, updated_at: new Date().toISOString() }).eq("id", id);

    if (campaign.status === "active" && eligible.length > 0) await scheduleStep(sb, user.id, id, 1);
    return { added: eligible.length };
  });

  app.post("/api/campaigns/:id/launch", async (req) => {
    const user = await requireUser(req);
    await assertFeature(user.id, "sequences");
    const { id } = req.params as { id: string };
    const { data: campaign } = await sb.from("campaigns").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
    if (!campaign) throw new HttpError(404, "Campaign not found.");
    if (!campaign.account_id) throw new HttpError(400, "Connect an SMTP sender in Settings first.");
    const [{ count: stepCount }, { count: leadCount }] = await Promise.all([
      sb.from("campaign_steps").select("id", { count: "exact", head: true }).eq("campaign_id", id),
      sb.from("campaign_leads").select("id", { count: "exact", head: true }).eq("campaign_id", id).eq("status", "active"),
    ]);
    if (!stepCount) throw new HttpError(400, "Add at least one email step.");
    if (!leadCount) throw new HttpError(400, "Add leads to this campaign first.");

    await sb.from("campaigns").update({ status: "active", updated_at: new Date().toISOString() }).eq("id", id);
    await scheduleStep(sb, user.id, id, 1);
    log.info("campaign launched", { user: user.id, campaign: id });
    return { ok: true };
  });

  app.post("/api/campaigns/:id/pause", async (req) => {
    const user = await requireUser(req);
    const { id } = req.params as { id: string };
    await sb.from("campaigns").update({ status: "paused", updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id);
    return { ok: true };
  });

  app.post("/api/campaigns/:id/resume", async (req) => {
    const user = await requireUser(req);
    const { id } = req.params as { id: string };
    const { data: campaign } = await sb.from("campaigns").select("account_id").eq("id", id).eq("user_id", user.id).maybeSingle();
    if (!campaign) throw new HttpError(404, "Campaign not found.");
    if (!campaign.account_id) throw new HttpError(400, "Connect an SMTP sender in Settings first.");
    await sb.from("campaigns").update({ status: "active", updated_at: new Date().toISOString() }).eq("id", id);
    return { ok: true };
  });

  // ————— Public: unsubscribe (one-click, token-authenticated) —————

  app.post(
    "/api/public/unsubscribe",
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (req) => {
      const { token } = body(z.object({ token: z.string().trim().min(8).max(100) }), req.body);
      const { data: cl } = await sb.from("campaign_leads").select("*").eq("unsub_token", token).maybeSingle();
      if (!cl) throw new HttpError(400, "This unsubscribe link is invalid.");
      const [{ data: campaign }, { data: lead }] = await Promise.all([
        sb.from("campaigns").select("*").eq("id", cl.campaign_id).maybeSingle(),
        sb.from("leads").select("*").eq("id", cl.lead_id).maybeSingle(),
      ]);
      if (!campaign || !lead?.email) throw new HttpError(400, "This unsubscribe link is invalid.");

      await sb
        .from("suppression_list")
        .upsert(
          { user_id: campaign.user_id, email: lead.email, reason: "unsubscribe" },
          { onConflict: "user_id,email", ignoreDuplicates: true }
        );
      if (cl.status === "active") {
        await sb.from("campaign_leads").update({ status: "unsubscribed", next_send_at: null }).eq("id", cl.id);
        await logEvent(sb, {
          user_id: campaign.user_id,
          campaign_id: campaign.id,
          type: "unsubscribed",
          meta: `${lead.email} unsubscribed`,
        });
      }
      return { email: lead.email };
    }
  );

  // ————— Inbound reply webhook (provider posts replies here) —————
  // Marks replies as events and stops the sequence for that recipient.

  app.post("/api/webhooks/inbound", async (req) => {
    if (req.headers["x-worker-secret"] !== env.workerSecret)
      throw new HttpError(401, "Unauthorized.");
    const { from_email } = body(z.object({ from_email: z.string().trim().email() }), req.body);

    const { data: leadMatches } = await sb.from("leads").select("id,user_id,email").eq("email", from_email.toLowerCase());
    let matched = 0;
    for (const lead of leadMatches ?? []) {
      const { data: cls } = await sb
        .from("campaign_leads")
        .select("*, campaigns!inner(user_id,status,name)")
        .eq("lead_id", lead.id)
        .eq("status", "active");
      for (const cl of cls ?? []) {
        await sb.from("campaign_leads").update({ status: "completed", next_send_at: null }).eq("id", cl.id);
        await logEvent(sb, {
          user_id: lead.user_id,
          campaign_id: cl.campaign_id,
          type: "replied",
          meta: `${from_email} replied — sequence stopped for them`,
        });
        matched++;
      }
    }
    return { ok: true, matched };
  });
}
