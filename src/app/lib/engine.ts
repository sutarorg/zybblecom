import { api, cacheRow, syncFromServer, tickJobs } from "./remote";
import type { SearchJob } from "./types";

// ————————————————————————————————————————————————————————————
// Lead Finder client.
//
// The server creates a durable search job in Supabase and the
// background processor (cron + in-app ticks) drives it through
// real Google Maps discovery, deduplication, enrichment and
// email verification. The UI polls job status.
// ————————————————————————————————————————————————————————————

export async function startSearch(input: {
  query: string;
  location: string;
  quantity: number;
  radiusMeters: number;
}): Promise<SearchJob> {
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
    },
  });
  cacheRow("search_jobs", job);
  // Start the work immediately rather than waiting for the next cron run.
  void tickJobs().then(() => syncFromServer(true));
  return job;
}
