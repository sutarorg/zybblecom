import { db } from "./db";
import { api, apiText, syncFromServer } from "./remote";
import type { Lead } from "./types";

// ————— Bulk lead operations (server-authoritative) —————

/**
 * Delete leads on the server, then drop them from the local cache.
 *
 * The cache is cleared from the server's answer — the ids it confirms are
 * gone — before the resync, so the rows cannot flash back into the table (or
 * come back at all if the resync is still in flight).
 */
export async function deleteLeads(ids: string[]): Promise<number> {
  const result = await api<{ deleted?: number }>("/api/leads/delete", { body: { ids } });
  const removed = new Set(ids);
  db.removeWhere<Lead>("leads", (lead) => removed.has(lead.id));
  await syncFromServer(true);
  return Number(result?.deleted ?? ids.length);
}

export async function saveLeadNotes(leadId: string, notes: string): Promise<Lead> {
  return api<Lead>(`/api/leads/${leadId}`, { method: "PATCH", body: { notes } });
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

/** Server-side export — the full dataset, scoped by the caller's token. */
export async function exportLeadsCsv(ids: string[] | null): Promise<void> {
  const csv = await apiText("/api/leads/export", ids?.length ? { ids } : {});
  downloadCsv(`zybble-leads-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
