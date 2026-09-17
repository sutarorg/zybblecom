import crypto from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ————————————————————————————————————————————————————————————
// Shared runtime for every Zybble serverless function:
// environment, logging, Supabase admin client, JWT auth,
// AES-256-GCM secret encryption, plan gating, rate limiting.
// Secrets live only in this process — never sent to the browser.
// ————————————————————————————————————————————————————————————

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

function optional(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

/** Public origin of this deployment (used for unsubscribe links). */
function resolveAppUrl(): string {
  const explicit = optional("APP_URL");
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = optional("VERCEL_PROJECT_PRODUCTION_URL") ?? optional("VERCEL_URL");
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;
  return "http://localhost:5173";
}

export const env = {
  appUrl: resolveAppUrl(),
  supabaseUrl: required("SUPABASE_URL").replace(/\/+$/, ""),
  supabaseServiceKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  openaiKey: required("OPENAI_API_KEY"),
  openaiModel: process.env.OPENAI_MODEL ?? "o4-mini",
  googleMapsKey: required("GOOGLE_MAPS_API_KEY"),
  razorpayKeyId: required("RAZORPAY_KEY_ID"),
  razorpayKeySecret: required("RAZORPAY_KEY_SECRET"),
  razorpayWebhookSecret: required("RAZORPAY_WEBHOOK_SECRET"),
  smtpEncryptionKey: required("SMTP_ENCRYPTION_KEY"),
  cronSecret: required("CRON_SECRET"),
  isProduction: process.env.VERCEL_ENV === "production",
  commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 12),
};

if (env.openaiModel !== "o4-mini") {
  throw new Error("OPENAI_MODEL must be o4-mini for this deployment.");
}

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

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// ————— Supabase service role. RLS is defense in depth; every
//        query below is still explicitly scoped to the caller. —————

export const sb: SupabaseClient = createClient(env.supabaseUrl, env.supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export interface AuthedUser {
  id: string;
  email: string;
}

export async function requireUser(req: Request): Promise<AuthedUser> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new HttpError(401, "Missing access token.");
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Invalid or expired access token.");
  return { id: data.user.id, email: data.user.email ?? "" };
}

/** Cron + internal endpoints. Vercel Cron sends the configured secret. */
export function requireCronAuth(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : null;
  const provided = bearer ?? req.headers.get("x-cron-secret");
  if (!provided) throw new HttpError(401, "Unauthorized.");
  const a = Buffer.from(provided);
  const b = Buffer.from(env.cronSecret);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b))
    throw new HttpError(401, "Unauthorized.");
}

// ————— AES-256-GCM (SMTP credentials) —————

const KEY = Buffer.from(env.smtpEncryptionKey, "hex");
if (KEY.length !== 32) throw new Error("SMTP_ENCRYPTION_KEY must be 64 hex chars (32 bytes).");

/** PostgreSQL bytea hex transport form accepted by PostgREST. */
export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `\\x${Buffer.concat([iv, cipher.getAuthTag(), enc]).toString("hex")}`;
}

export function decryptSecret(packed: string | Buffer): string {
  const buf = Buffer.isBuffer(packed)
    ? packed
    : packed.startsWith("\\x")
      ? Buffer.from(packed.slice(2), "hex")
      : Buffer.from(packed, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
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
    throw new HttpError(503, "Service temporarily unavailable.");
  }
  if (!data) throw new HttpError(429, "Too many requests. Please wait and try again.");
}

export const monthKey = () => new Date().toISOString().slice(0, 7);
