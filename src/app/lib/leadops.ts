import { api, apiText, syncFromServer } from "./remote";
import type { Lead } from "./types";

// ————— Bulk lead operations (server-authoritative) —————

export async function deleteLeads(ids: string[]) {
  await api("/api/leads/delete", { body: { ids } });
  await syncFromServer(true);
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
