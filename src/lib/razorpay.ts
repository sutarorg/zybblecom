import crypto from "crypto";
import { uid } from "@/lib/utils";

/**
 * Server-side Razorpay integration.
 *
 * Env vars (never exposed to the client):
 *   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET     — orders + signature verification
 *   RAZORPAY_WEBHOOK_SECRET                  — webhook signature verification
 *   RAZORPAYX_ACCOUNT_NUMBER                 — RazorpayX payouts source account
 *
 * When keys are absent the app runs in TEST MODE: orders / payouts are
 * simulated server-side so the full flow stays functional end-to-end.
 */

const API = "https://api.razorpay.com/v1";

export function razorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function authHeader() {
  const key = process.env.RAZORPAY_KEY_ID!;
  const secret = process.env.RAZORPAY_KEY_SECRET!;
  return "Basic " + Buffer.from(`${key}:${secret}`).toString("base64");
}

async function rzFetch(path: string, body: unknown, extraHeaders: Record<string, string> = {}) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & {
    error?: { description?: string };
  };
  if (!res.ok) {
    throw new Error(data.error?.description || `Razorpay request failed (${res.status})`);
  }
  return data;
}

export async function createOrder(input: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{ orderId: string; keyId: string | null; testMode: boolean }> {
  if (!razorpayConfigured()) {
    return { orderId: uid("order_sim_"), keyId: null, testMode: true };
  }
  const order = await rzFetch("/orders", {
    amount: input.amountPaise,
    currency: "INR",
    receipt: input.receipt,
    payment_capture: 1,
    notes: input.notes ?? {},
  });
  return {
    orderId: order.id as string,
    keyId: process.env.RAZORPAY_KEY_ID!,
    testMode: false,
  };
}

export function verifyPaymentSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(input.signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function verifyWebhookSignature(rawBody: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * RazorpayX payout: contact -> fund account (bank) -> payout.
 * In test mode returns a simulated payout id.
 */
export async function executePayout(input: {
  name: string;
  email: string;
  holderName: string;
  accountNumber: string;
  ifsc: string;
  amountPaise: number;
  idempotencyKey: string;
}): Promise<{ payoutId: string; status: "processed" | "queued"; testMode: boolean }> {
  if (!razorpayConfigured() || !process.env.RAZORPAYX_ACCOUNT_NUMBER) {
    return { payoutId: uid("pout_sim_"), status: "processed", testMode: true };
  }
  const idem = { "X-Payout-Idempotency": input.idempotencyKey };

  const contact = (await rzFetch(
    "/contacts",
    { name: input.name, email: input.email, type: "vendor" },
    idem,
  )) as { id: string };

  const fund = (await rzFetch(
    "/fund_accounts",
    {
      contact_id: contact.id,
      account_type: "bank_account",
      bank_account: {
        name: input.holderName,
        ifsc: input.ifsc,
        account_number: input.accountNumber,
      },
    },
    idem,
  )) as { id: string };

  const payout = (await rzFetch(
    "/payouts",
    {
      account_number: process.env.RAZORPAYX_ACCOUNT_NUMBER,
      fund_account_id: fund.id,
      amount: input.amountPaise,
      currency: "INR",
      mode: "IMPS",
      purpose: "payout",
      queue_if_low_balance: true,
      narration: "Zybble creator settlement",
    },
    idem,
  )) as { id: string; status?: string };

  return {
    payoutId: payout.id,
    status: payout.status === "processed" ? "processed" : "queued",
    testMode: false,
  };
}

/** Simulated checkout token — only usable when Razorpay keys are absent. */
export function createSimulatedPaymentToken(orderId: string) {
  const secret = process.env.AUTH_SECRET || "zybble-dev-session-secret-do-not-use-in-prod";
  return crypto.createHmac("sha256", secret).update(`sim:${orderId}`).digest("hex");
}

export function verifySimulatedPaymentToken(orderId: string, token: string) {
  const expected = createSimulatedPaymentToken(orderId);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
