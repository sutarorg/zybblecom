#!/usr/bin/env node
/**
 * Zybble single-app production E2E. Real integrations only — no mocks.
 *
 * Required:
 *   APP_URL              the deployed Vercel URL (frontend + /api)
 *   CRON_SECRET          to drive background processing deterministically
 *   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 *   RAZORPAY_WEBHOOK_SECRET
 *
 * Optional (enable the full external journey):
 *   E2E_RUN_SCRAPER=true       real Google Maps search
 *   E2E_RUN_RAZORPAY=true      real Test Mode subscription
 *   E2E_SMTP_*                 real SMTP send
 *   E2E_RECIPIENT_EMAIL        an inbox you own and authorize
 *
 * Run: npm run e2e
 */
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const required = (name, fallback) => {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing ${name}`);
  return typeof v === "string" ? v.replace(/\/+$/, "") : v;
};

const APP_URL = required("APP_URL");
const API_URL = `${APP_URL}/api`;
const SUPABASE_URL = required("SUPABASE_URL");
const ANON_KEY = required("SUPABASE_ANON_KEY");
const SERVICE_KEY = required("SUPABASE_SERVICE_ROLE_KEY");
const WEBHOOK_SECRET = required("RAZORPAY_WEBHOOK_SECRET");
const CRON_SECRET = required("CRON_SECRET");
const FULL = process.env.E2E_FULL === "true";
const RUN_SCRAPER = process.env.E2E_RUN_SCRAPER === "true";

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const results = [];
let testUser = null;
let token = null;
let razorpayPending = null;
const testWebhookId = `e2e-${Date.now()}`;

const pass = (name, detail = "") => {
  results.push({ name, ok: true });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
};
const fail = (name, err) => {
  const detail = err instanceof Error ? err.message : String(err);
  results.push({ name, ok: false, detail });
  console.error(`FAIL  ${name} — ${detail}`);
};
const skip = (name, detail) => {
  results.push({ name, ok: !FULL, detail });
  console.log(`${FULL ? "FAIL" : "SKIP"}  ${name} — ${detail}`);
};
async function test(name, fn) {
  try {
    pass(name, (await fn()) ?? "");
  } catch (err) {
    fail(name, err);
  }
}

async function request(path, options = {}) {
  const headers = { "content-type": "application/json", ...(options.headers ?? {}) };
  if (options.auth !== false && token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? (options.body === undefined ? "GET" : "POST"),
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(options.timeout ?? 70_000),
  });
  const text = await res.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  if (!res.ok) {
    const err = new Error(payload?.error ?? `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return payload;
}

/** Drive background work deterministically instead of waiting for cron. */
const drive = () =>
  request("/cron/tick", {
    body: {},
    auth: false,
    headers: { authorization: `Bearer ${CRON_SECRET}` },
    timeout: 70_000,
  });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`Zybble single-app E2E\nApp + API: ${APP_URL}\n`);

  await test("Single-app routing (frontend + same-origin API)", async () => {
    for (const route of ["/", "/features", "/pricing", "/blog", "/about"]) {
      const res = await fetch(`${APP_URL}${route}`, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) throw new Error(`${route} returned ${res.status}`);
      if (!(await res.text()).includes('id="root"'))
        throw new Error(`${route} did not return the app shell`);
    }
    const robots = await (await fetch(`${APP_URL}/robots.txt`)).text();
    if (!robots.includes("Sitemap:")) throw new Error("robots.txt was rewritten");
    const health = await request("/health", { auth: false });
    if (!health?.ok) throw new Error("API not reachable on the same origin");
    return `5 pages + /api/health (version ${health.version})`;
  });

  await test("API readiness", async () => {
    const data = await request("/ready", { auth: false });
    if (!data?.ok) throw new Error(JSON.stringify(data));
    return `database ${data.database}`;
  });

  await test("Protected API rejects anonymous access", async () => {
    try {
      await request("/bootstrap", { auth: false });
    } catch (err) {
      if (err.status === 401) return "401 as expected";
      throw err;
    }
    throw new Error("anonymous request was accepted");
  });

  await test("Cron endpoint rejects an unauthenticated call", async () => {
    const res = await fetch(`${API_URL}/cron/tick`, { method: "POST" });
    if (res.status !== 401) throw new Error(`expected 401, got ${res.status}`);
    return "401 without CRON_SECRET";
  });

  const suffix = crypto.randomBytes(6).toString("hex");
  const email = `e2e-${suffix}@example.com`;
  const password = `E2e!${crypto.randomBytes(12).toString("base64url")}`;

  await test("Signup provisioning (profile + Free plan + usage)", async () => {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: "Zybble E2E" },
    });
    if (error || !data.user) throw error ?? new Error("user not created");
    testUser = data.user;
    const [{ data: profile }, { data: sub }, { data: usage }] = await Promise.all([
      admin.from("profiles").select("*").eq("id", testUser.id).maybeSingle(),
      admin.from("subscriptions").select("*").eq("user_id", testUser.id).maybeSingle(),
      admin.from("usage").select("*").eq("user_id", testUser.id).maybeSingle(),
    ]);
    if (!profile || sub?.plan !== "free" || usage?.leads_used !== 0)
      throw new Error("post-signup trigger incomplete");
    return "trigger created all three rows";
  });

  await test("Supabase authentication", async () => {
    const { data, error } = await anon.auth.signInWithPassword({ email, password });
    if (error || !data.session) throw error ?? new Error("no session");
    token = data.session.access_token;
    return "real JWT issued";
  });

  await test("RLS blocks direct plan escalation", async () => {
    await anon.from("subscriptions").update({ plan: "agency" }).eq("user_id", testUser.id);
    const { data } = await admin
      .from("subscriptions")
      .select("plan")
      .eq("user_id", testUser.id)
      .single();
    if (data.plan !== "free") throw new Error("RLS allowed escalation");
    return "Agency self-grant blocked";
  });

  await test("Profile persistence", async () => {
    const data = await request("/profile", {
      method: "PATCH",
      body: { name: "Zybble E2E", company: "Zybble Test", from_name: "Zybble" },
    });
    if (data.company !== "Zybble Test") throw new Error("profile did not persist");
  });

  await test("Server-side Free usage limit", async () => {
    const month = new Date().toISOString().slice(0, 7);
    await admin.from("usage").update({ leads_used: 100 }).eq("user_id", testUser.id).eq("month", month);
    try {
      await request("/search", {
        body: { query: "dentists", location: "Austin, Texas", quantity: 1, radius_meters: 25000 },
      });
    } catch (err) {
      if (err.status === 402) {
        await admin.from("usage").update({ leads_used: 0 }).eq("user_id", testUser.id).eq("month", month);
        return "101st lead rejected with 402";
      }
      throw err;
    }
    throw new Error("quota bypassed");
  });

  let lead = null;
  if (RUN_SCRAPER) {
    await test("Real Google Maps search → dedupe → published-contact validation", async () => {
      const job = await request("/search", {
        body: { query: "dentists", location: "Austin, Texas", quantity: 5, radius_meters: 25000 },
      });
      const deadline = Date.now() + 10 * 60_000;
      let current;
      while (Date.now() < deadline) {
        await drive();
        current = await request(`/search/${job.id}`);
        if (current.status === "complete") {
          const { leads } = await request("/leads?limit=1000");
          const found = leads.filter((l) => l.job_id === job.id);
          if (!found.length) throw new Error("job completed without leads");
          lead = found[0];
          if (!lead.company || !lead.maps_url) throw new Error("lead lacks Maps identity");
          if (!found.every((l) => l.email_status))
            throw new Error("email validation did not run for every lead");
          const invented = found.filter(
            (l) => (l.emails?.length ?? 0) > 0 && !l.website,
          );
          if (invented.length)
            throw new Error("an address was stored for a business with no website to read it from");
          const withEmail = found.filter((l) => l.email && l.email_source_url);
          return `${found.length} real businesses, ${withEmail.length} engine-sourced emails`;
        }
        if (current.status === "failed") throw new Error(current.error ?? "search failed");
        await sleep(2000);
      }
      throw new Error(`search timed out in state ${current?.status}`);
    });

    await test("Duplicate-job protection (dedupe on re-search)", async () => {
      const before = (await request("/leads?limit=1")).count;
      const job = await request("/search", {
        body: { query: "dentists", location: "Austin, Texas", quantity: 5, radius_meters: 25000 },
      });
      const deadline = Date.now() + 8 * 60_000;
      while (Date.now() < deadline) {
        await drive();
        const s = await request(`/search/${job.id}`);
        if (s.status === "complete" || s.status === "failed") break;
        await sleep(2000);
      }
      const after = (await request("/leads?limit=1")).count;
      if (after > before + 5) throw new Error("duplicates were inserted");
      return `${after - before} net-new leads on repeat search`;
    });
  } else {
    skip("Real Google Maps search → dedupe → published-contact validation", "set E2E_RUN_SCRAPER=true");
  }

  // A controlled recipient exercises real OpenAI/SMTP without emailing a
  // business that never asked to hear from us.
  if (!lead) {
    const { data } = await admin
      .from("leads")
      .insert({
        user_id: testUser.id,
        company: "Zybble E2E Fixture",
        category: "Software services",
        city: "Austin",
        state: "TX",
        country: "United States",
        website: "https://zybble.com",
        maps_url: "https://maps.google.com",
        rating: 4.8,
        reviews: 120,
      })
      .select("*")
      .single();
    lead = data;
  }

  await test("AI is plan-gated on Free", async () => {
    try {
      await request("/ai/score", { body: { leadId: lead.id } });
    } catch (err) {
      if (err.status === 403) return "403 before upgrade";
      throw err;
    }
    throw new Error("AI ran on the Free plan");
  });

  await admin
    .from("subscriptions")
    .update({ plan: "growth", status: "active" })
    .eq("user_id", testUser.id);

  await test("Real OpenAI o4-mini research", async () => {
    const row = await request("/ai/research", { body: { leadId: lead.id } });
    if (!row.summary || !row.angle) throw new Error("research incomplete");
    return `${row.summary.length} chars cached in ai_research`;
  });
  await test("Real OpenAI o4-mini scoring", async () => {
    const row = await request("/ai/score", { body: { leadId: lead.id } });
    if (!Number.isInteger(row.score) || !row.reasons?.length) throw new Error("score incomplete");
    return `${row.score}/100 with ${row.reasons.length} reasons`;
  });
  await test("Real OpenAI o4-mini email writer", async () => {
    const row = await request("/ai/write", { body: { leadId: lead.id, tone: "friendly" } });
    if (!row.subject || !row.body) throw new Error("draft incomplete");
    return `${row.body.length}-char personalized draft`;
  });

  const smtpVars = [
    "E2E_SMTP_HOST", "E2E_SMTP_PORT", "E2E_SMTP_USERNAME",
    "E2E_SMTP_PASSWORD", "E2E_SMTP_FROM_EMAIL", "E2E_RECIPIENT_EMAIL",
  ];
  const missingSmtp = smtpVars.filter((n) => !process.env[n]);
  if (missingSmtp.length) {
    skip("Real SMTP + sequence delivery", `missing ${missingSmtp.join(", ")}`);
  } else {
    await test("Real SMTP handshake, encrypted storage and delivery", async () => {
      const { data: recipient } = await admin
        .from("leads")
        .insert({
          user_id: testUser.id,
          company: "Zybble Authorized Delivery Test",
          category: "Software services",
          city: "Austin",
          state: "TX",
          country: "United States",
          maps_url: "https://maps.google.com",
          email: process.env.E2E_RECIPIENT_EMAIL,
          email_status: "verified",
        })
        .select("*")
        .single();

      const account = await request("/accounts", {
        body: {
          label: "E2E sender",
          host: process.env.E2E_SMTP_HOST,
          port: Number(process.env.E2E_SMTP_PORT),
          username: process.env.E2E_SMTP_USERNAME,
          password: process.env.E2E_SMTP_PASSWORD,
          from_email: process.env.E2E_SMTP_FROM_EMAIL,
          from_name: "Zybble E2E",
        },
      });
      if (account.password_enc) throw new Error("API leaked the SMTP credential");
      const { data: stored } = await admin
        .from("email_accounts")
        .select("password_enc")
        .eq("id", account.id)
        .single();
      if (String(stored.password_enc).includes(process.env.E2E_SMTP_PASSWORD))
        throw new Error("credential stored in plaintext");

      const campaign = await request("/campaigns", {
        body: {
          name: "E2E delivery",
          account_id: account.id,
          steps: [
            {
              day_offset: 0,
              subject: "Zybble E2E {{company}}",
              body: "Authorized Zybble production delivery test for {{company}}.\n\nBest,\n{{sender}}",
            },
          ],
        },
      });
      await request(`/campaigns/${campaign.campaign.id}/leads`, {
        body: { leadIds: [recipient.id] },
      });
      await request(`/campaigns/${campaign.campaign.id}/launch`, { body: {} });

      const deadline = Date.now() + 4 * 60_000;
      while (Date.now() < deadline) {
        await drive();
        const { data: jobs } = await admin
          .from("email_jobs")
          .select("status,last_error")
          .eq("campaign_id", campaign.campaign.id);
        if (jobs?.some((j) => j.status === "sent")) {
          // Duplicate protection: another tick must not resend.
          await drive();
          const { data: after } = await admin
            .from("email_jobs")
            .select("id,status")
            .eq("campaign_id", campaign.campaign.id);
          if (after.filter((j) => j.status === "sent").length !== 1)
            throw new Error("email job was processed twice");
          return "handshake, encrypted storage, real delivery, no duplicate";
        }
        if (jobs?.some((j) => j.status === "failed"))
          throw new Error(jobs.find((j) => j.status === "failed").last_error);
        await sleep(3000);
      }
      throw new Error("no delivery within 4 minutes");
    });

    await test("Unsubscribe suppresses the address", async () => {
      const { data: cls } = await admin
        .from("campaign_leads")
        .select("unsub_token")
        .limit(1);
      await request("/public/unsubscribe", { auth: false, body: { token: cls[0].unsub_token } });
      const { data: suppressed } = await admin
        .from("suppression_list")
        .select("id")
        .eq("user_id", testUser.id);
      if (!suppressed?.length) throw new Error("suppression not persisted");
      return "one-click unsubscribe honored";
    });
  }

  await test("Razorpay webhook signature + idempotency", async () => {
    const raw = JSON.stringify({
      event: "e2e.ignored",
      payload: { subscription: { entity: { id: `sub_${suffix}`, status: "created" } } },
    });
    const signature = crypto.createHmac("sha256", WEBHOOK_SECRET).update(raw).digest("hex");
    const send = () =>
      fetch(`${API_URL}/webhooks/razorpay`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-razorpay-signature": signature,
          "x-razorpay-event-id": testWebhookId,
        },
        body: raw,
      });

    const bad = await fetch(`${API_URL}/webhooks/razorpay`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-razorpay-signature": "deadbeef" },
      body: raw,
    });
    if (bad.status !== 401) throw new Error("forged webhook was accepted");

    const first = await send();
    const second = await send();
    if (!first.ok || !second.ok) throw new Error(`webhook ${first.status}/${second.status}`);
    if (!(await second.json()).deduped) throw new Error("duplicate webhook processed twice");
    return "forgery rejected; duplicate deduped";
  });

  if (process.env.E2E_RUN_RAZORPAY === "true") {
    await test("Real Razorpay subscription creation", async () => {
      const data = await request("/billing/subscription", { body: { plan: "growth" } });
      if (!data.subscription_id?.startsWith("sub_"))
        throw new Error("Razorpay did not create a subscription");
      razorpayPending = data.subscription_id;
      return razorpayPending;
    });
  } else {
    skip("Real Razorpay subscription creation", "set E2E_RUN_RAZORPAY=true");
  }

  await test("Failure handling: invalid SMTP is rejected, not stored", async () => {
    const before = await admin
      .from("email_accounts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", testUser.id);
    try {
      await request("/accounts", {
        body: {
          label: "bad",
          host: "smtp.invalid.example.com",
          port: 587,
          username: "nobody",
          password: "wrong-password",
          from_email: "nobody@example.com",
          from_name: "Bad",
        },
      });
    } catch (err) {
      if (err.status !== 400) throw err;
      const after = await admin
        .from("email_accounts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", testUser.id);
      if (after.count !== before.count) throw new Error("invalid sender was stored");
      return "handshake failure surfaced; nothing persisted";
    }
    throw new Error("invalid SMTP credentials were accepted");
  });
}

async function cleanup() {
  if (razorpayPending && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    try {
      await fetch(`https://api.razorpay.com/v1/subscriptions/${razorpayPending}/cancel`, {
        method: "POST",
        headers: {
          authorization: `Basic ${Buffer.from(
            `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
          ).toString("base64")}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ cancel_at_cycle_end: 0 }),
      });
    } catch { /* best effort */ }
  }
  if (testUser) {
    try { await admin.auth.admin.deleteUser(testUser.id); } catch { /* best effort */ }
  }
  try { await admin.from("webhook_events").delete().eq("id", testWebhookId); } catch { /* best effort */ }
}

try {
  await main();
} catch (err) {
  fail("Test harness", err);
} finally {
  await cleanup();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed${FULL ? " (FULL)" : ""}.`);
if (failed.length) {
  console.error("Failures:");
  failed.forEach((r) => console.error(`- ${r.name}: ${r.detail}`));
  process.exitCode = 1;
}
