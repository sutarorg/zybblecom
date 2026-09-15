import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { db } from "./db";
import type { Table } from "./types";

// ————————————————————————————————————————————————————————————
// Production backend integration.
// When VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / VITE_API_URL
// are present, every feature talks to the real backend:
//   · Supabase Auth           — email/password, magic link, OAuth
//   · Zybble API (server/)    — jobs, AI, campaigns, billing
//   · The local engine remains the offline development fallback.
// The UI never changes — this layer is a drop-in data source.
// ————————————————————————————————————————————————————————————

const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env;

const SUPABASE_URL = env?.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env?.VITE_SUPABASE_ANON_KEY;
export const API_URL = env?.VITE_API_URL?.replace(/\/+$/, "");

export function isRemote(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && API_URL);
}

let _sb: SupabaseClient | null = null;
export function supabase(): SupabaseClient {
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

function sessionStorageKey(): string {
  const ref = new URL(SUPABASE_URL!).host.split(".")[0];
  return `sb-${ref}-auth-token`;
}

export function accessToken(): string | null {
  if (!isRemote()) return null;
  try {
    const raw = localStorage.getItem(sessionStorageKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { access_token?: string };
    return parsed.access_token ?? null;
  } catch {
    return null;
  }
}

export function remoteUserFromToken(): { id: string; email: string } | null {
  const token = accessToken();
  if (!token) return null;
  try {
    const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(b64)) as {
      sub: string;
      email?: string;
      exp?: number;
    };
    if (!payload.sub || (payload.exp && payload.exp * 1000 < Date.now())) return null;
    return { id: payload.sub, email: payload.email ?? "" };
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(
  path: string,
  opts: { method?: string; body?: unknown; auth?: boolean } = {}
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.auth !== false) {
    const token = accessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const j = (await res.json()) as { error?: string; message?: string };
      message = j.error ?? j.message ?? message;
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
  const token = accessToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const j = (await res.json()) as { error?: string };
      message = j.error ?? message;
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

type Bootstrap = Record<string, Record<string, unknown>[]>;

let syncing = false;
let lastSync = 0;

export async function syncFromServer(force = false): Promise<void> {
  if (!isRemote()) return;
  if (syncing) return;
  if (!force && Date.now() - lastSync < 1500) return;
  syncing = true;
  try {
    const data = await api<Bootstrap>("/api/bootstrap");
    for (const t of SYNC_TABLES) {
      if (Array.isArray(data[t])) db.replace(t, data[t] as never);
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
