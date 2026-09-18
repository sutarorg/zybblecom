import { z } from "zod";

// ————————————————————————————————————————————————————————————
// Lead Finder filters.
//
// One JSON contract, two implementations: this one runs in the Vercel API,
// worker/filters.py runs the identical rules inside the scraper while it
// scrapes. The API re-applies them as a safety net, so a filter can never be
// bypassed by a worker that sends a batch straight to storage.
//
// Every field is optional; `null` / `[]` always means "do not care".
// ————————————————————————————————————————————————————————————

export const SORT_OPTIONS = ["relevance", "rating", "reviews", "newest"] as const;
export type SortBy = (typeof SORT_OPTIONS)[number];

export const EMAIL_STATUSES = ["verified", "risky", "invalid", "unknown"] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];

export const OPEN_STATUSES = ["open", "closed", "permanently_closed", "unknown"] as const;
export type OpenStatus = (typeof OPEN_STATUSES)[number];

export interface SearchFilters {
  /** Business type / category text; matched against category and company name. */
  category: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  min_rating: number | null;
  max_rating: number | null;
  min_reviews: number | null;
  max_reviews: number | null;
  has_website: boolean | null;
  has_phone: boolean | null;
  /** Applied after email discovery. */
  has_email: boolean | null;
  email_status: EmailStatus[];
  has_social: boolean | null;
  /** Keep only businesses whose email status has been resolved. */
  enriched_only: boolean;
  open_status: OpenStatus[];
  keywords_include: string[];
  keywords_exclude: string[];
  /** Skip businesses the user already collected in an earlier search. */
  exclude_previously_collected: boolean;
  /** Friendlier alias of has_website, used by the UI. */
  websites_only: boolean;
  /** Website or phone number must be public. */
  contactable_only: boolean;
  sort_by: SortBy;
  limit: number | null;
}

export interface FilterableLead {
  company?: string | null;
  category?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  phone?: string | null;
  website?: string | null;
  rating?: number | null;
  reviews?: number | null;
  open_status?: string | null;
  hours?: string | null;
  description?: string | null;
  email?: string | null;
  email_status?: string | null;
  social_profiles?: unknown;
  created_at?: string | null;
}

const text = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
const has = (value: unknown) =>
  Array.isArray(value) ? value.length > 0 : Boolean(value && String(value).trim().length > 0);

function optBool(value: unknown): boolean | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const raw = String(value).trim().toLowerCase();
  if (["true", "yes", "1", "on"].includes(raw)) return true;
  if (["false", "no", "0", "off"].includes(raw)) return false;
  return null;
}

function optNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function strList(value: unknown): string[] {
  if (value === null || value === undefined || value === "") return [];
  const items = Array.isArray(value) ? value : String(value).split(/[,\n]/);
  return items.map((item) => text(item)).filter(Boolean);
}

export function emptyFilters(): SearchFilters {
  return {
    category: null,
    country: null,
    state: null,
    city: null,
    min_rating: null,
    max_rating: null,
    min_reviews: null,
    max_reviews: null,
    has_website: null,
    has_phone: null,
    has_email: null,
    email_status: [],
    has_social: null,
    enriched_only: false,
    open_status: [],
    keywords_include: [],
    keywords_exclude: [],
    exclude_previously_collected: true,
    websites_only: false,
    contactable_only: false,
    sort_by: "relevance",
    limit: null,
  };
}

/** Lenient decode: unknown values are dropped, never rejected. */
export function parseFilters(raw: unknown): SearchFilters {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const base = emptyFilters();
  const sortBy = text(input.sort_by) as SortBy;
  return {
    ...base,
    category: input.category ? String(input.category).trim() : null,
    country: input.country ? String(input.country).trim() : null,
    state: input.state ? String(input.state).trim() : null,
    city: input.city ? String(input.city).trim() : null,
    min_rating: optNumber(input.min_rating),
    max_rating: optNumber(input.max_rating),
    min_reviews: optNumber(input.min_reviews),
    max_reviews: optNumber(input.max_reviews),
    has_website: optBool(input.has_website),
    has_phone: optBool(input.has_phone),
    has_email: optBool(input.has_email),
    email_status: strList(input.email_status).filter((value): value is EmailStatus =>
      (EMAIL_STATUSES as readonly string[]).includes(value),
    ),
    has_social: optBool(input.has_social),
    enriched_only: optBool(input.enriched_only) ?? false,
    open_status: strList(input.open_status).filter((value): value is OpenStatus =>
      (OPEN_STATUSES as readonly string[]).includes(value),
    ),
    keywords_include: strList(input.keywords_include),
    keywords_exclude: strList(input.keywords_exclude),
    exclude_previously_collected: optBool(input.exclude_previously_collected) ?? true,
    websites_only: optBool(input.websites_only) ?? false,
    contactable_only: optBool(input.contactable_only) ?? false,
    sort_by: (SORT_OPTIONS as readonly string[]).includes(sortBy) ? sortBy : "relevance",
    limit: optNumber(input.limit),
  };
}

/** Zod schema for the HTTP boundary (validates, then normalises). */
export const filtersSchema = z
  .object({
    category: z.string().trim().max(120).nullish(),
    country: z.string().trim().max(80).nullish(),
    state: z.string().trim().max(80).nullish(),
    city: z.string().trim().max(80).nullish(),
    min_rating: z.number().min(0).max(5).nullish(),
    max_rating: z.number().min(0).max(5).nullish(),
    min_reviews: z.number().int().min(0).max(10_000_000).nullish(),
    max_reviews: z.number().int().min(0).max(10_000_000).nullish(),
    has_website: z.boolean().nullish(),
    has_phone: z.boolean().nullish(),
    has_email: z.boolean().nullish(),
    email_status: z.array(z.enum(EMAIL_STATUSES)).max(4).nullish(),
    has_social: z.boolean().nullish(),
    enriched_only: z.boolean().nullish(),
    open_status: z.array(z.enum(OPEN_STATUSES)).max(4).nullish(),
    keywords_include: z.array(z.string().trim().max(60)).max(10).nullish(),
    keywords_exclude: z.array(z.string().trim().max(60)).max(10).nullish(),
    exclude_previously_collected: z.boolean().nullish(),
    websites_only: z.boolean().nullish(),
    contactable_only: z.boolean().nullish(),
    sort_by: z.enum(SORT_OPTIONS).nullish(),
    limit: z.number().int().min(1).max(200).nullish(),
  })
  .partial();

export function filtersFromInput(input: Record<string, unknown> | undefined | null): SearchFilters {
  return parseFilters(input ?? {});
}

export function wantsWebsite(filters: SearchFilters): boolean | null {
  return filters.websites_only ? true : filters.has_website;
}

export function usesEnrichmentFilters(filters: SearchFilters): boolean {
  return Boolean(
    filters.has_email !== null ||
      filters.email_status.length > 0 ||
      filters.has_social !== null ||
      filters.enriched_only,
  );
}

export type FilterVerdict = { keep: true } | { keep: false; reason: string };

/** Stage 1 — filters that only need the data Google Maps publishes. */
export function evaluateDiscoveryFilters(lead: FilterableLead, filters: SearchFilters): FilterVerdict {
  const company = text(lead.company);
  const category = text(lead.category);
  const haystack = [
    company,
    category,
    text(lead.address),
    text(lead.city),
    text(lead.state),
    text(lead.country),
    text(lead.description),
  ]
    .filter(Boolean)
    .join(" ");

  if (filters.category) {
    const needle = text(filters.category);
    if (!category.includes(needle) && !company.includes(needle) && !haystack.includes(needle)) {
      return { keep: false, reason: `category does not match “${filters.category}”` };
    }
  }
  if (filters.country && text(lead.country) !== text(filters.country)) {
    return { keep: false, reason: `country is not ${filters.country}` };
  }
  if (filters.state && !text(lead.state).includes(text(filters.state))) {
    return { keep: false, reason: `state/region is not ${filters.state}` };
  }
  if (filters.city && !text(lead.city).includes(text(filters.city))) {
    return { keep: false, reason: `city is not ${filters.city}` };
  }

  const rating = typeof lead.rating === "number" ? lead.rating : Number(lead.rating ?? NaN);
  if (filters.min_rating !== null) {
    if (!Number.isFinite(rating)) return { keep: false, reason: `no rating (minimum ${filters.min_rating})` };
    if (rating < filters.min_rating) return { keep: false, reason: `rating ${rating} below ${filters.min_rating}` };
  }
  if (filters.max_rating !== null) {
    if (!Number.isFinite(rating)) return { keep: false, reason: `no rating (maximum ${filters.max_rating})` };
    if (rating > filters.max_rating) return { keep: false, reason: `rating ${rating} above ${filters.max_rating}` };
  }

  const reviews = typeof lead.reviews === "number" ? lead.reviews : Number(lead.reviews ?? NaN);
  if (filters.min_reviews !== null) {
    if (!Number.isFinite(reviews)) return { keep: false, reason: `no review count (minimum ${filters.min_reviews})` };
    if (reviews < filters.min_reviews) return { keep: false, reason: `${reviews} reviews below ${filters.min_reviews}` };
  }
  if (filters.max_reviews !== null) {
    if (!Number.isFinite(reviews)) return { keep: false, reason: `no review count (maximum ${filters.max_reviews})` };
    if (reviews > filters.max_reviews) return { keep: false, reason: `${reviews} reviews above ${filters.max_reviews}` };
  }

  const hasWebsite = has(lead.website);
  const websiteWanted = wantsWebsite(filters);
  if (websiteWanted === true && !hasWebsite) return { keep: false, reason: "no website" };
  if (websiteWanted === false && hasWebsite) return { keep: false, reason: "has a website" };

  const hasPhone = has(lead.phone);
  if (filters.has_phone === true && !hasPhone) return { keep: false, reason: "no phone number" };
  if (filters.has_phone === false && hasPhone) return { keep: false, reason: "has a phone number" };

  if (filters.contactable_only && !hasWebsite && !hasPhone) {
    return { keep: false, reason: "no public contact details" };
  }

  if (filters.open_status.length > 0) {
    const status = (text(lead.open_status) || "unknown") as OpenStatus;
    if (!filters.open_status.includes(status)) {
      return { keep: false, reason: `opening status “${status}” not selected` };
    }
  }

  for (const keyword of filters.keywords_include) {
    if (!haystack.includes(text(keyword))) return { keep: false, reason: `missing keyword “${keyword}”` };
  }
  for (const keyword of filters.keywords_exclude) {
    if (haystack.includes(text(keyword))) return { keep: false, reason: `contains excluded keyword “${keyword}”` };
  }

  return { keep: true };
}

/** Stage 2 — filters that need email / social discovery to have run. */
export function evaluateEnrichmentFilters(lead: FilterableLead, filters: SearchFilters): FilterVerdict {
  const email = lead.email ?? null;
  const status = lead.email_status ?? null;
  const socials = Array.isArray(lead.social_profiles) ? lead.social_profiles.length : 0;

  if (filters.enriched_only && status === null) {
    return { keep: false, reason: "not enriched (email status unknown)" };
  }
  if (filters.has_email === true && !email) return { keep: false, reason: "no email found" };
  if (filters.has_email === false && email) return { keep: false, reason: "has an email" };
  if (filters.email_status.length > 0) {
    if (!status || !filters.email_status.includes(status as EmailStatus)) {
      return { keep: false, reason: `email status “${status ?? "unknown"}” not selected` };
    }
  }
  if (filters.has_social === true && socials === 0) return { keep: false, reason: "no social profile found" };
  if (filters.has_social === false && socials > 0) return { keep: false, reason: "has a social profile" };
  return { keep: true };
}

export function passesAllFilters(lead: FilterableLead, filters: SearchFilters): FilterVerdict {
  const discovery = evaluateDiscoveryFilters(lead, filters);
  if (!discovery.keep) return discovery;
  return evaluateEnrichmentFilters(lead, filters);
}

export function sortLeads<T extends FilterableLead>(rows: T[], sortBy: SortBy): T[] {
  const items = [...rows];
  if (sortBy === "rating") {
    return items.sort((a, b) => Number(b.rating ?? 0) - Number(a.rating ?? 0));
  }
  if (sortBy === "reviews") {
    return items.sort((a, b) => Number(b.reviews ?? 0) - Number(a.reviews ?? 0));
  }
  if (sortBy === "newest") {
    return items.sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
  }
  return items; // relevance = the order Google Maps returned
}

/** Human-readable summary for the UI and job logs. */
export function describeFilters(filters: SearchFilters): string[] {
  const out: string[] = [];
  if (filters.category) out.push(`category: ${filters.category}`);
  for (const [label, value] of [
    ["country", filters.country],
    ["state", filters.state],
    ["city", filters.city],
  ] as const) {
    if (value) out.push(`${label}: ${value}`);
  }
  if (filters.min_rating !== null) out.push(`rating ≥ ${filters.min_rating}`);
  if (filters.max_rating !== null) out.push(`rating ≤ ${filters.max_rating}`);
  if (filters.min_reviews !== null) out.push(`reviews ≥ ${filters.min_reviews}`);
  if (filters.max_reviews !== null) out.push(`reviews ≤ ${filters.max_reviews}`);
  if (wantsWebsite(filters) === true) out.push("has website");
  if (filters.has_phone === true) out.push("has phone");
  if (filters.contactable_only) out.push("has contact details");
  if (filters.has_email === true) out.push("has email");
  if (filters.email_status.length) out.push(`email: ${filters.email_status.join("/")}`);
  if (filters.has_social === true) out.push("has social profile");
  if (filters.enriched_only) out.push("enriched only");
  if (filters.open_status.length) out.push(`status: ${filters.open_status.join("/")}`);
  if (filters.keywords_include.length) out.push(`includes: ${filters.keywords_include.join(", ")}`);
  if (filters.keywords_exclude.length) out.push(`excludes: ${filters.keywords_exclude.join(", ")}`);
  if (filters.exclude_previously_collected) out.push("excluding previously collected");
  if (filters.sort_by !== "relevance") out.push(`sort: ${filters.sort_by}`);
  return out;
}
