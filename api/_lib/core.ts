import crypto from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ————————————————————————————————————————————————————————————
// Shared runtime for every Zybble serverless function:
// environment, logging, Supabase admin client, JWT auth,
// AES-256-GCM secret encryption, plan gating, rate limiting.
// Secrets live only in this process — never sent to the browser.
// ————————————————————————————————————————————————————————————

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export class MissingEnvError extends HttpError {
  constructor(name: string) {
    super(
      503,
      `${name} is not configured. Set it in Vercel → Project → Settings → Environment Variables, then redeploy.`
    );
    this.name = "MissingEnvError";
  }
}

function optional(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

export function checkConfig(name: string): string {
  if (!optional(name)) throw new MissingEnvError(name);
  return process.env[name]!;
}

function resolveAppUrl(): string {
  const explicit = optional("APP_URL");
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = optional("VERCEL_PROJECT_PRODUCTION_URL") ?? optional("VERCEL_URL");
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;
  return "http://localhost:3000";
}

/** Defend against the #1 paste error: the REST endpoint instead of the
 *  project URL. Strips a trailing /rest/v1 path so supabase-js doesn't
 *  build /rest/v1/rest/v1/... URLs that fail opaquely. */
function normalizeSupabaseUrl(raw: string): string {
  return raw
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/rest\/v1$/i, "");
}

export const env = {
  appUrl: resolveAppUrl(),
  supabaseUrl: optional("SUPABASE_URL")
    ? normalizeSupabaseUrl(optional("SUPABASE_URL")!)
    : "https://missing.example",
  supabaseServiceKey: optional("SUPABASE_SERVICE_ROLE_KEY") ?? "missing",
  openaiKey: optional("OPENAI_API_KEY") ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "o4-mini",
  googleMapsKey: optional("GOOGLE_MAPS_API_KEY") ?? "",
  leadProvider:
    process.env.LEAD_PROVIDER === "places" ? ("places" as const) : ("worker" as const),
  scraperWorkerSecret: optional("SCRAPER_WORKER_SECRET") ?? "",
  razorpayKeyId: optional("RAZORPAY_KEY_ID") ?? "",
  razorpayKeySecret: optional("RAZORPAY_KEY_SECRET") ?? "",
  razorpayWebhookSecret: optional("RAZORPAY_WEBHOOK_SECRET") ?? "",
  smtpEncryptionKey: optional("SMTP_ENCRYPTION_KEY") ?? "",
  cronSecret: optional("CRON_SECRET") ?? "",
  isProduction: process.env.VERCEL_ENV === "production",
  commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 12),
};

// ————— Structured logging (never logs secrets) —————

type Fields = Record<string, unknown>;
function emit(level: string, msg: string, fields: Fields = {}) {
  const line = JSON.stringify({ level, msg, ts: new Date().toISOString(), ...fields });
  if (level === "error") console.error(line);
  else console.log(line);
}
export const log = {
  info: (msg: string, fields?: Fields) => emit("info", msg, fields),
  warn: (msg: string, fields?: Fields) => emit("warn", msg, fields),
  error: (msg: string, fields?: Fields) => emit("error", msg, fields),
};

// ————— Supabase (service role — bypasses RLS; every query is
//          still explicitly scoped to the authenticated user) —————
//
// The client is created lazily inside a recovering Proxy: if the env URL is
// malformed, construction would otherwise throw at module import and kill
// the ENTIRE function (Vercel then returns a bare 500 with no JSON body —
// "Request failed (500)" with no hint). Deferred creation turns that into a
// clear 503 naming the exact variable.

let _sb: SupabaseClient | null = null;

function getSb(): SupabaseClient {
  if (_sb) return _sb;
  const raw = optional("SUPABASE_URL");
  if (!raw) throw new MissingEnvError("SUPABASE_URL");
  const url = normalizeSupabaseUrl(raw);
  // Must be a bare host: https://xyz.supabase.co (no path, no /rest/v1).
  if (!/^https?:\/\/[^\/]+$/i.test(url)) {
    throw new MissingEnvError(
      `SUPABASE_URL must be the project URL like https://xyz.supabase.co — not the /rest/v1/ endpoint and not a path-bearing URL (received: ${url.slice(0, 60)})`
    );
  }
  try {
    _sb = createClient(url, env.supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch (err) {
    throw new MissingEnvError(
      `SUPABASE_URL is invalid (${(err as Error).message.slice(0, 80)}) — use the full Project URL like https://xyz.supabase.co`
    );
  }
  return _sb;
}

export const sb = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSb() as unknown as Record<PropertyKey, unknown>;
    // Read with the real client as `this` from the start (getters included),
    // and preserve it through method calls (sb.from, sb.rpc, sb.auth.x()).
    const value = client[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export interface AuthedUser {
  id: string;
  email: string;
}

export async function requireUser(req: Request): Promise<AuthedUser> {
  checkConfig("SUPABASE_URL");
  checkConfig("SUPABASE_SERVICE_ROLE_KEY");
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new HttpError(401, "Missing access token.");
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Invalid or expired access token.");
  return { id: data.user.id, email: data.user.email ?? "" };
}

/** Cron + internal endpoints. Vercel Cron sends the configured secret. */
export function requireCronAuth(req: Request) {
  checkConfig("CRON_SECRET");
  const header = req.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : null;
  const provided = bearer ?? req.headers.get("x-cron-secret");
  if (!provided) throw new HttpError(401, "Unauthorized.");
  const a = Buffer.from(provided);
  const b = Buffer.from(env.cronSecret);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b))
    throw new HttpError(401, "Unauthorized.");
}

/** Constant-time authentication for the optional Selenium worker. */
export function requireWorkerAuth(req: Request) {
  checkConfig("SCRAPER_WORKER_SECRET");
  const header = req.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(provided);
  const b = Buffer.from(env.scraperWorkerSecret);
  if (!provided || a.length !== b.length || !crypto.timingSafeEqual(a, b))
    throw new HttpError(401, "Unauthorized worker.");
}

// ————— AES-256-GCM for SMTP passwords —————

const KEY = optional("SMTP_ENCRYPTION_KEY")
  ? Buffer.from(optional("SMTP_ENCRYPTION_KEY")!, "hex")
  : null;

function encryptionKey(): Buffer {
  if (!KEY) throw new MissingEnvError("SMTP_ENCRYPTION_KEY");
  if (KEY.length !== 32)
    throw new MissingEnvError("SMTP_ENCRYPTION_KEY must be 64 hex chars (32 bytes)");
  return KEY;
}

/** PostgreSQL bytea hex transport form accepted by PostgREST. */
export function encryptSecret(plain: string): string {
  const key = encryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `\\x${Buffer.concat([iv, cipher.getAuthTag(), enc]).toString("hex")}`;
}

export function decryptSecret(packed: string | Buffer): string {
  const key = encryptionKey();
  const buf = Buffer.isBuffer(packed)
    ? packed
    : packed.startsWith("\\x")
      ? Buffer.from(packed.slice(2), "hex")
      : Buffer.from(packed, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

export function hmacSha256(secret: string, payload: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

export function randomToken(bytes = 16): string {
  return crypto.randomBytes(bytes).toString("hex");
}

// ————— Plans (server-authoritative) —————

export const PLAN_LIMITS: Record<
  string,
  { leads: number; ai: boolean; sequences: boolean; senders: number }
> = {
  free: { leads: 100, ai: false, sequences: false, senders: 1 },
  growth: { leads: 5000, ai: true, sequences: true, senders: 3 },
  agency: { leads: 20000, ai: true, sequences: true, senders: 5 },
};

export async function planFor(userId: string): Promise<{
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
}> {
  const { data } = await sb
    .from("subscriptions")
    .select("plan,status,current_period_end")
    .eq("user_id", userId)
    .maybeSingle();
  return {
    plan: data?.plan ?? "free",
    status: data?.status ?? "active",
    currentPeriodEnd: data?.current_period_end ?? null,
  };
}

export async function assertFeature(userId: string, feature: "ai" | "sequences") {
  const { plan, status, currentPeriodEnd } = await planFor(userId);
  // Canceled subscriptions keep access until the period ends. Past-due
  // accounts cannot consume paid AI or sending capacity.
  const entitled =
    status === "active" ||
    (status === "canceled" &&
      Boolean(currentPeriodEnd) &&
      new Date(currentPeriodEnd!).getTime() > Date.now());
  if (!entitled || !PLAN_LIMITS[plan]?.[feature]) {
    throw new HttpError(
      403,
      feature === "ai"
        ? "This AI feature is available on Growth and Agency plans."
        : "Email Sequences & Automation is available on Growth and Agency plans."
    );
  }
}

/** Database-backed rate limiting — correct across every serverless instance. */
export async function enforceRateLimit(
  key: string,
  action: string,
  limit: number,
  windowSeconds: number
) {
  const { data, error } = await sb.rpc("consume_rate_limit", {
    p_key: key,
    p_action: action,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    log.error("rate limit unavailable", { action, error: error.message });
    const hint = error.message.includes("does not exist")
      ? " Missing migration: run supabase/migrations/003_production_hardening.sql (and later files) in the SQL Editor."
      : "";
    throw new HttpError(503, `Service temporarily unavailable. (${error.message.slice(0, 120)})${hint}`);
  }
  if (!data) throw new HttpError(429, "Too many requests. Please wait and try again.");
}

export const monthKey = () => new Date().toISOString().slice(0, 7);
