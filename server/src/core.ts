import crypto from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { FastifyRequest } from "fastify";

// ————————————————————————————————————————————————————————————
// Core: environment, structured logging, Supabase admin client,
// bearer-token authentication, AES-256-GCM secret encryption.
// All secrets are server-only — nothing leaves this process.
// ————————————————————————————————————————————————————————————

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

export const env = {
  port: Number(process.env.PORT ?? 8787),
  appUrl: (process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:5173").replace(/\/+$/, ""),
  supabaseUrl: required("SUPABASE_URL").replace(/\/+$/, ""),
  supabaseServiceKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  openaiKey: required("OPENAI_API_KEY"),
  openaiModel: process.env.OPENAI_MODEL ?? "o4-mini",
  razorpayKeyId: required("RAZORPAY_KEY_ID"),
  razorpayKeySecret: required("RAZORPAY_KEY_SECRET"),
  razorpayWebhookSecret: required("RAZORPAY_WEBHOOK_SECRET"),
  smtpEncryptionKey: required("SMTP_ENCRYPTION_KEY"),
  workerSecret: required("WORKER_SECRET"),
};

// ————— Structured logging (no secrets, ever) —————

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

// ————— HTTP errors —————

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// ————— Supabase (service role — bypasses RLS; every query is
//          still explicitly scoped to the authenticated user) —————

export const sb: SupabaseClient = createClient(env.supabaseUrl, env.supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export interface AuthedUser {
  id: string;
  email: string;
}

/** Verify the Supabase JWT from the Authorization header. */
export async function requireUser(req: FastifyRequest): Promise<AuthedUser> {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new HttpError(401, "Missing access token.");
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Invalid or expired access token.");
  return { id: data.user.id, email: data.user.email ?? "" };
}

// ————— AES-256-GCM for SMTP passwords —————

const KEY = Buffer.from(env.smtpEncryptionKey, "hex");
if (KEY.length !== 32) throw new Error("SMTP_ENCRYPTION_KEY must be 64 hex chars (32 bytes).");

/** Base64 transport form — PostgREST accepts base64 for bytea inserts. */
export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString("base64");
}

/** Accepts PostgREST bytea output ("\x<hex>"), base64, or Buffer. */
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

// ————— Plans — server-authoritative —————

export const PLAN_LIMITS: Record<string, { leads: number; ai: boolean; sequences: boolean; senders: number }> = {
  free: { leads: 100, ai: false, sequences: false, senders: 1 },
  growth: { leads: 5000, ai: true, sequences: true, senders: 3 },
  agency: { leads: 20000, ai: true, sequences: true, senders: 5 },
};

export async function planFor(userId: string): Promise<{ plan: string; status: string }> {
  const { data } = await sb
    .from("subscriptions")
    .select("plan,status")
    .eq("user_id", userId)
    .maybeSingle();
  return { plan: data?.plan ?? "free", status: data?.status ?? "active" };
}

export async function assertFeature(userId: string, feature: "ai" | "sequences") {
  const { plan } = await planFor(userId);
  if (!PLAN_LIMITS[plan]?.[feature]) {
    throw new HttpError(
      403,
      feature === "ai"
        ? "This AI feature is available on Growth and Agency plans."
        : "Email Sequences & Automation is available on Growth and Agency plans."
    );
  }
}

export const monthKey = () => new Date().toISOString().slice(0, 7);
