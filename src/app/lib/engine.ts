import { api, cacheRow, syncFromServer, tickJobs } from "./remote";
import type { SearchFilters, SearchJob } from "./types";

// ————————————————————————————————————————————————————————————
// Lead Finder client.
//
// The server creates a durable search job in Supabase; the GoogleMapScraper
// worker (Railway) drives real Google Maps discovery and streams businesses
// back. The UI polls job status, which now carries the full counter set:
// requested → discovered → unique → enriched → saved, plus duplicates,
// filtered, emails found, errors and search-coverage progress.
// ————————————————————————————————————————————————————————————

export interface StartSearchInput {
  query: string;
  location: string;
  quantity: number;
  radiusMeters: number;
  filters?: Partial<SearchFilters>;
  sortBy?: SearchFilters["sort_by"];
}

/** Filters with no effect are dropped so the UI only shows what's active. */
function cleanFilters(filters: Partial<SearchFilters> | undefined): Partial<SearchFilters> {
  if (!filters) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === null || value === undefined || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (value === false) continue;
    out[key] = value;
  }
  return out as Partial<SearchFilters>;
}

export async function startSearch(input: StartSearchInput): Promise<SearchJob> {
  const query = input.query.trim();
  const location = input.location.trim();
  if (!query) throw new Error("Describe who you're looking for.");
  if (!location) throw new Error("Add a city, state or country.");

  const job = await api<SearchJob>("/api/search", {
    body: {
      query,
      location,
      quantity: Math.max(1, Math.min(200, Math.round(input.quantity))),
      radius_meters: input.radiusMeters,
      filters: cleanFilters(input.filters),
      sort_by: input.sortBy ?? "relevance",
    },
  });
  cacheRow("search_jobs", job);
  // Start the work immediately rather than waiting for the next cron run. The
  // discovery itself happens in the worker; this only nudges the queue.
  void tickJobs().then(() => syncFromServer(true));
  return job;
}
