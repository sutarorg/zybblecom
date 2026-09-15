import { db } from "./db";
import { api, apiText, isRemote, syncFromServer } from "./remote";
import type { CampaignLead, Lead } from "./types";

// ————— Bulk lead operations —————

export async function deleteLeads(userId: string, ids: string[]) {
  if (isRemote()) {
    await api("/api/leads/delete", { body: { ids } });
    void syncFromServer(true);
    return;
  }
  const set = new Set(ids);
  db.removeWhere<Lead>("leads", (l) => l.user_id === userId && set.has(l.id));
  db.removeWhere<CampaignLead>(
    "campaign_leads",
    (cl) => set.has(cl.lead_id)
  );
}

function csvEscape(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function leadsToCsv(leads: Lead[]): string {
  const header = [
    "company",
    "category",
    "address",
    "city",
    "state",
    "country",
    "phone",
    "website",
    "google_maps_url",
    "rating",
    "reviews",
    "hours",
    "description",
    "email",
    "email_status",
    "ai_score",
    "created_at",
  ];
  const lines = leads.map((l) =>
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
      l.rating,
      l.reviews,
      l.hours,
      l.description,
      l.email,
      l.email_status,
      l.ai_score,
      l.created_at,
    ]
      .map(csvEscape)
      .join(",")
  );
  return "﻿" + header.join(",") + "\n" + lines.join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Server-authoritative export — full dataset, RLS-scoped. */
export async function exportLeadsCsv(ids: string[] | null): Promise<void> {
  const csv = await apiText("/api/leads/export", ids?.length ? { ids } : {});
  downloadCsv(`zybble-leads-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
