import { z } from "zod";
import {
  assertFeature,
  decryptSecret,
  encryptSecret,
  enforceRateLimit,
  HttpError,
  log,
  PLAN_LIMITS,
  planFor,
  requireUser,
  sb,
} from "./core.ts";
import type { Router } from "./http.ts";
import { logEvent, newUnsubToken, scheduleStep } from "./sequence.ts";
import { verifySmtp } from "./smtp.ts";

// ————————————————————————————————————————————————————————————
// SMTP senders, campaigns + sequences, suppression,
// public one-click unsubscribe.
// ————————————————————————————————————————————————————————————

const maskedAccount = "id,user_id,label,host,port,username,from_email,from_name,status,created_at";

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

export function registerOutreach(r: Router) {
  // ————— SMTP senders —————

  r.post("/api/accounts", async ({ req, json }) => {
    const user = await requireUser(req);
    const form = await json(
      z.object({
        label: z.string().trim().max(60).default(""),
        host: z.string().trim().min(3).max(120).refine((h) => h.includes("."), "Enter a valid SMTP host."),
        port: z.number().int().min(1).max(65535),
        username: z.string().trim().min(1, "SMTP username is required.").max(200),
        password: z.string().min(4, "SMTP password is required.").max(200),
        from_email: z.string().trim().email("Enter a valid from email.").max(200),
        from_name: z.string().trim().max(80).default(""),
      })
    );

    const { plan } = await planFor(user.id);
    const limit = PLAN_LIMITS[plan]?.senders ?? 1;
    const { count } = await sb
      .from("email_accounts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    if ((count ?? 0) >= limit)
      throw new HttpError(
        403,
        `Your plan supports ${limit} connected sender${limit > 1 ? "s" : ""}. Upgrade to connect more.`
      );

    // Live handshake before storing — invalid credentials fail here.
    try {
      await verifySmtp({
        host: form.host,
        port: form.port,
        username: form.username,
        password: form.password,
      });
    } catch (err) {
      throw new HttpError(
        400,
        `SMTP connection failed: ${(err as Error).message?.slice(0, 140) ?? "handshake failed"}`
      );
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

  r.delete("/api/accounts/:id", async ({ req, params }) => {
    const user = await requireUser(req);
    await sb
      .from("campaigns")
      .update({ status: "paused", updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("account_id", params.id)
      .eq("status", "active");
    await sb.from("campaigns").update({ account_id: null }).eq("user_id", user.id).eq("account_id", params.id);
    await sb.from("email_accounts").delete().eq("id", params.id).eq("user_id", user.id);
    return { ok: true };
  });

  r.post("/api/accounts/:id/test", async ({ req, params }) => {
    const user = await requireUser(req);
    const { data: account } = await sb
      .from("email_accounts")
      .select("host,port,username,password_enc")
      .eq("id", params.id)
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
      await sb.from("email_accounts").update({ status: "error" }).eq("id", params.id);
      throw new HttpError(400, `SMTP connection failed: ${(err as Error).message.slice(0, 140)}`);
    }
    await sb.from("email_accounts").update({ status: "active" }).eq("id", params.id);
    return { ok: true };
  });

  // ————— Suppression —————

  r.post("/api/suppression", async ({ req, json }) => {
    const user = await requireUser(req);
    const { email } = await json(z.object({ email: z.string().trim().email().max(200) }));
    await sb
      .from("suppression_list")
      .upsert(
        { user_id: user.id, email: email.toLowerCase(), reason: "manual" },
        { onConflict: "user_id,email", ignoreDuplicates: true }
      );
    const { data } = await sb
      .from("suppression_list")
      .select("*")
      .eq("user_id", user.id)
      .eq("email", email.toLowerCase())
      .maybeSingle();
    return data;
  });

  r.delete("/api/suppression/:email", async ({ req, params }) => {
    const user = await requireUser(req);
    await sb
      .from("suppression_list")
      .delete()
      .eq("user_id", user.id)
      .eq("email", params.email.toLowerCase());
    return { ok: true };
  });

  // ————— Campaigns —————

  r.post("/api/campaigns", async ({ req, json }) => {
    const user = await requireUser(req);
    await assertFeature(user.id, "sequences");
    const input = await json(campaignSchema);

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

  r.put("/api/campaigns/:id", async ({ req, json, params }) => {
    const user = await requireUser(req);
    await assertFeature(user.id, "sequences");
    const { data: existing } = await sb
      .from("campaigns")
      .select("status")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!existing) throw new HttpError(404, "Campaign not found.");
    if (existing.status === "active") throw new HttpError(409, "Pause the campaign before editing it.");
    const input = await json(campaignSchema);

    await sb
      .from("campaigns")
      .update({ name: input.name, account_id: input.account_id, updated_at: new Date().toISOString() })
      .eq("id", params.id);
    await sb.from("campaign_steps").delete().eq("campaign_id", params.id);
    await sb.from("campaign_steps").insert(
      input.steps.map((s, i) => ({
        campaign_id: params.id,
        position: i + 1,
        day_offset: s.day_offset,
        subject: s.subject,
        body: s.body,
      }))
    );
    return { ok: true };
  });

  r.delete("/api/campaigns/:id", async ({ req, params }) => {
    const user = await requireUser(req);
    await sb.from("campaigns").delete().eq("id", params.id).eq("user_id", user.id);
    return { ok: true };
  });

  r.post("/api/campaigns/:id/leads", async ({ req, json, params }) => {
    const user = await requireUser(req);
    await assertFeature(user.id, "sequences");
    const { leadIds } = await json(
      z.object({ leadIds: z.array(z.string().uuid()).min(1).max(500) })
    );
    const { data: campaign } = await sb
      .from("campaigns")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!campaign) throw new HttpError(404, "Campaign not found.");

    const [{ data: leads }, { data: suppressed }, { data: existing }] = await Promise.all([
      sb.from("leads").select("id,email").eq("user_id", user.id).in("id", leadIds).not("email", "is", null).neq("email_status", "invalid"),
      sb.from("suppression_list").select("email").eq("user_id", user.id),
      sb.from("campaign_leads").select("lead_id").eq("campaign_id", params.id),
    ]);
    const suppressedSet = new Set((suppressed ?? []).map((s) => s.email));
    const existingSet = new Set((existing ?? []).map((c) => c.lead_id));
    const eligible = (leads ?? []).filter(
      (l) => l.email && !suppressedSet.has(l.email) && !existingSet.has(l.id)
    );

    if (eligible.length > 0) {
      await sb.from("campaign_leads").insert(
        eligible.map((l) => ({
          campaign_id: params.id,
          lead_id: l.id,
          status: "active",
          current_step: 0,
          unsub_token: newUnsubToken(),
        }))
      );
    }
    const { count } = await sb
      .from("campaign_leads")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", params.id);
    await sb
      .from("campaigns")
      .update({ total_leads: count ?? 0, updated_at: new Date().toISOString() })
      .eq("id", params.id);

    if (campaign.status === "active" && eligible.length > 0)
      await scheduleStep(user.id, params.id, 1);
    return { added: eligible.length };
  });

  r.post("/api/campaigns/:id/launch", async ({ req, params }) => {
    const user = await requireUser(req);
    await assertFeature(user.id, "sequences");
    const { data: campaign } = await sb
      .from("campaigns")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!campaign) throw new HttpError(404, "Campaign not found.");
    if (!campaign.account_id) throw new HttpError(400, "Connect an SMTP sender in Settings first.");
    const [{ count: stepCount }, { count: leadCount }] = await Promise.all([
      sb.from("campaign_steps").select("id", { count: "exact", head: true }).eq("campaign_id", params.id),
      sb.from("campaign_leads").select("id", { count: "exact", head: true }).eq("campaign_id", params.id).eq("status", "active"),
    ]);
    if (!stepCount) throw new HttpError(400, "Add at least one email step.");
    if (!leadCount) throw new HttpError(400, "Add leads to this campaign first.");

    await sb
      .from("campaigns")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", params.id);
    await scheduleStep(user.id, params.id, 1);
    log.info("campaign launched", { user: user.id, campaign: params.id });
    return { ok: true };
  });

  r.post("/api/campaigns/:id/pause", async ({ req, params }) => {
    const user = await requireUser(req);
    await sb
      .from("campaigns")
      .update({ status: "paused", updated_at: new Date().toISOString() })
      .eq("id", params.id)
      .eq("user_id", user.id);
    return { ok: true };
  });

  r.post("/api/campaigns/:id/resume", async ({ req, params }) => {
    const user = await requireUser(req);
    await assertFeature(user.id, "sequences");
    const { data: campaign } = await sb
      .from("campaigns")
      .select("account_id")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!campaign) throw new HttpError(404, "Campaign not found.");
    if (!campaign.account_id) throw new HttpError(400, "Connect an SMTP sender in Settings first.");
    await sb
      .from("campaigns")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", params.id);
    return { ok: true };
  });

  // ————— Public one-click unsubscribe (token-authenticated) —————

  r.post("/api/public/unsubscribe", async ({ json, req }) => {
    const { token } = await json(z.object({ token: z.string().trim().min(8).max(100) }));
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
    await enforceRateLimit(ip, "unsubscribe", 30, 60);

    const { data: cl } = await sb
      .from("campaign_leads")
      .select("*")
      .eq("unsub_token", token)
      .maybeSingle();
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
      await sb
        .from("campaign_leads")
        .update({ status: "unsubscribed", next_send_at: null })
        .eq("id", cl.id);
      await logEvent({
        user_id: campaign.user_id,
        campaign_id: campaign.id,
        type: "unsubscribed",
        meta: `${lead.email} unsubscribed`,
      });
    }
    return { email: lead.email };
  });
}
