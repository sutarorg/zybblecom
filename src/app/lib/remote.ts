import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { db } from "./db";
import type { Table } from "./types";
import { isConfigured } from "./config";

export { isConfigured } from "./config";

// ————————————————————————————————————————————————————————————
// Backend integration.
//
// Zybble is a single application: the API lives at /api on the
// same origin as this frontend, so there is no API base URL to
// configure. Only Supabase Auth runs in the browser (anon key);
// every privileged operation goes through the server.
// ————————————————————————————————————————————————————————————

const viteEnv = (import.meta as unknown as { env: Record<string, string | undefined> }).env;

const SUPABASE_URL = viteEnv?.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = viteEnv?.VITE_SUPABASE_ANON_KEY;

/** The API is always same-origin — there is no separately hosted API. */
export const API_URL = "";

let _sb: SupabaseClient | null = null;
export function supabase(): SupabaseClient {
  if (!isConfigured())
    throw new Error("Supabase is not configured for this deployment.");
  if (!_sb)
    _sb = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  return _sb;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function authHeader(): Promise<Record<string, string>> {
  if (!isConfigured()) return {};
  // getSession refreshes an expired token transparently.
  const { data } = await supabase().auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function api<T>(
  path: string,
  opts: { method?: string; body?: unknown; auth?: boolean; timeoutMs?: number } = {}
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.auth !== false) Object.assign(headers, await authHeader());

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), opts.timeoutMs ?? 60_000);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError")
      throw new ApiError(408, "The request timed out. Please try again.");
    throw new ApiError(503, "Could not reach Zybble. Check your connection and try again.");
  } finally {
    window.clearTimeout(timeout);
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const text = await res.text();
      try {
        const j = JSON.parse(text) as { error?: string; message?: string };
        message = j.error ?? j.message ?? message;
      } catch {
        if (text && text.length < 300 && !text.includes("<!DOCTYPE") && !text.includes("<html")) {
          message = text.trim();
        } else if (res.status === 500) {
          message = "Server error (500). Please try again in a few moments.";
        }
      }
    } catch {
      /* keep default */
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Raw-text request (CSV exports). */
export async function apiText(path: string, body?: unknown): Promise<string> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const text = await res.text();
      try {
        const j = JSON.parse(text) as { error?: string };
        message = j.error ?? message;
      } catch {
        if (text && text.length < 300 && !text.includes("<!DOCTYPE") && !text.includes("<html")) {
          message = text.trim();
        }
      }
    } catch {
      /* keep default */
    }
    throw new ApiError(res.status, message);
  }
  return res.text();
}

// ————— Server → local cache sync —————

const SYNC_TABLES: Table[] = [
  "profiles",
  "subscriptions",
  "usage",
  "search_jobs",
  "leads",
  "ai_research",
  "ai_scores",
  "email_accounts",
  "campaigns",
  "campaign_steps",
  "campaign_leads",
  "email_jobs",
  "email_events",
  "suppression_list",
  "billing_events",
];

type Bootstrap = Record<string, unknown> & {
  lead_count?: number;
  leads?: Record<string, unknown>[];
};

let syncing = false;
let lastSync = 0;
let lastLeadCount = -1;

export async function syncFromServer(force = false): Promise<void> {
  if (!isConfigured() || syncing) return;
  if (!force && Date.now() - lastSync < 1500) return;
  syncing = true;
  try {
    const data = await api<Bootstrap>("/api/bootstrap");
    const expected = data.lead_count ?? data.leads?.length ?? 0;
    const freshPage = data.leads ?? [];
    const cachedLeads = db.all<Record<string, unknown>>("leads");

    // The server is the source of truth: a lead deleted (or filtered out) on
    // the server must not survive in the local cache. The cache is only reused
    // verbatim when nothing changed since the last sync — never merged back
    // in, which is what used to resurrect deleted leads.
    let allLeads = freshPage;
    const unchanged = !force && expected === lastLeadCount && cachedLeads.length === expected;
    if (unchanged) {
      allLeads = cachedLeads;
    } else if (expected > freshPage.length) {
      allLeads = [...freshPage];
      for (let offset = freshPage.length; offset < expected && offset < 20_000; offset += 1000) {
        const page = await api<{ leads: Record<string, unknown>[]; count: number }>(
          `/api/leads?offset=${offset}&limit=1000`
        );
        if (page.leads.length === 0) break;
        allLeads.push(...page.leads);
      }
    }
    data.leads = allLeads;
    lastLeadCount = allLeads.length;

    for (const t of SYNC_TABLES) {
      const rows = data[t];
      if (Array.isArray(rows)) db.replace(t, rows as never);
    }
    lastSync = Date.now();
  } finally {
    syncing = false;
  }
}

/** Upsert a server row into the local cache so the UI updates immediately. */
export function cacheRow<T extends { id: string }>(table: Table, row: T): T {
  db.upsert(table, row);
  return row;
}

export async function saveRemoteProfile(input: {
  name: string;
  company: string;
  from_name: string;
}) {
  const row = await api<{ id: string } & typeof input>("/api/profile", {
    method: "PATCH",
    body: input,
  });
  cacheRow("profiles", row);
  return row;
}

export async function deleteRemoteAccount() {
  await api<void>("/api/account", { method: "DELETE" });
}

/**
 * Nudge background processing while the app is open. The server only does
 * work when this user actually has something pending, and every unit of
 * work is lease-protected, so this is safe to call on a timer.
 */
let ticking = false;
export async function tickJobs(): Promise<void> {
  // One nudge in flight at a time — a tick can run for up to 45s, and
  // overlapping calls would just contend for the same job leases.
  if (ticking) return;
  ticking = true;
  try {
    await api<{ idle: boolean }>("/api/jobs/tick", { body: {}, timeoutMs: 55_000 });
  } catch {
    // Cron is the safety net; a failed nudge is not user-facing.
  } finally {
    ticking = false;
  }
}
