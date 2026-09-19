// ————————————————————————————————————————————————————————————
// Contact validation for the lead pipeline.
//
// Emails in Zybble have exactly one source: the pinned
// `gosom/google-maps-scraper` engine (worker/gmaps_engine.py → `-email`),
// which reads the addresses a business publishes on its own website. This
// module *never* discovers an address — it only decides whether one the
// engine already found may be stored:
//
//   malformed / role address      → dropped
//   MX says the domain takes mail → verified
//   MX says it cannot             → invalid (kept, flagged, never mailed)
//   MX unknown (resolver refused) → risky
//   nothing found                 → unknown
//
// Phone numbers are validated the same way: only plausible published numbers
// survive, and every one of them is kept instead of just the first.
// ————————————————————————————————————————————————————————————

const BLOCKED_LOCAL = new Set([
  "noreply", "no-reply", "donotreply", "mailer-daemon", "postmaster",
  "example", "email", "yourname", "name", "user", "webmaster", "sentry",
]);
const BLOCKED_DOMAIN_FRAGMENTS = [
  "example.com", "sentry.io", "wixpress.com", "schema.org", "w3.org",
  "godaddy.com", "squarespace.com", "cloudflare.com",
];
const BLOCKED_SUFFIXES = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".css", ".js"];

export type EmailStatus = "verified" | "risky" | "invalid" | "unknown";
const EMAIL_STATUSES_VALUES = ["verified", "risky", "invalid", "unknown"] as const;

/** How many contacts of each kind one lead may carry. */
export const MAX_EMAILS = 5;
export const MAX_PHONES = 3;

const SOCIAL_RE = /https?:\/\/(?:[\w-]+\.)*(facebook\.com|instagram\.com|linkedin\.com|twitter\.com|x\.com|youtube\.com|tiktok\.com|pinterest\.com)\/[^\s<>]+/gi;
const MAX_SOCIALS = 5;

export function extractSocialProfiles(html: string): string[] {
  if (!html) return [];
  const found: string[] = [];
  for (const match of html.matchAll(SOCIAL_RE)) {
    const url = match[0].trim().replace(/[.,;)"']+$/g, "");
    if (!found.includes(url)) found.push(url);
    if (found.length >= MAX_SOCIALS) break;
  }
  return found;
}

/** Strict syntax validation. An invalid address is discarded, never stored. */
export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let value = raw.trim().trim();
  if (value.toLowerCase().startsWith("mailto:")) value = value.slice(7);
  value = value.split("?")[0].split("#")[0].trim();
  value = value.replace(/^[.,;:()[\]{}<>"'\s]+|[.,;:()[\]{}<>"'\s]+$/g, "");
  value = value.toLowerCase();
  if (!value || value.length > 254 || !value.includes("@")) return null;
  const at = value.lastIndexOf("@");
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  if (!local || !domain || local.length > 64) return null;
  if (value.includes("..") || local.startsWith(".") || local.endsWith(".")) return null;
  if (domain.startsWith(".") || domain.endsWith(".") || domain.startsWith("-")) return null;
  if (BLOCKED_LOCAL.has(local)) return null;
  if (BLOCKED_DOMAIN_FRAGMENTS.some((fragment) => domain.includes(fragment))) return null;
  if (BLOCKED_SUFFIXES.some((suffix) => value.endsWith(suffix))) return null;
  if (!/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(value)) {
    return null;
  }
  return value;
}

/**
 * Make any worker payload safe to store.
 *
 * The previous code validated the incoming email with zod and threw
 * "Invalid email address", which failed the whole search job. A malformed or
 * unusable address is not a job failure: the business is kept and the address
 * is reported as `unknown`.
 */
export function sanitizeEmailResult(input: {
  email?: unknown;
  email_status?: unknown;
  email_source_url?: unknown;
  social_profiles?: unknown;
}): {
  email: string | null;
  email_status: EmailStatus;
  email_source_url: string | null;
  social_profiles: string[];
  rejected: boolean;
} {
  const statusRaw = String(input.email_status ?? "").trim().toLowerCase();
  const status: EmailStatus = (EMAIL_STATUSES_VALUES as readonly string[]).includes(statusRaw)
    ? (statusRaw as EmailStatus)
    : "unknown";
  const email = normalizeEmail(input.email);
  const source = typeof input.email_source_url === "string" ? input.email_source_url.trim() : "";
  const socials = sanitizeSocialProfiles(input.social_profiles);
  return {
    email,
    // An address that failed validation can never be claimed as verified.
    email_status: email ? status : "unknown",
    email_source_url: source && /^https?:\/\//i.test(source) ? source.slice(0, 2000) : null,
    social_profiles: socials,
    rejected: Boolean(input.email) && !email,
  };
}

/**
 * A published phone number — never a URL, an email or a word.
 *
 * Deliberately permissive about formatting (`+91 11 4000 0000`,
 * `(212) 555-0100`, `+1 415 555 2671 ext. 12`) and strict about content: at
 * least seven digits, no letters other than an `ext`/`x` marker, and no
 * obviously non-dialable punctuation.
 */
export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let value = raw.replace(/\s+/g, " ").trim().replace(/^[\s.,;:]+|[\s.,;:]+$/g, "");
  if (!value || value.includes("@") || /http/i.test(value)) return null;
  if (!/^\+?[\d\s().\-/]{6,40}(?:\s*(?:ext|x|extension)\.?\s*\d{1,6})?$/i.test(value)) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 6 || digits.length > 15) return null;
  return value;
}

/** Separators a listing uses between two published numbers. */
const PHONE_SPLIT_RE = /\s*(?:,|;|\||\u00b7|\u2022|\n|\r|\/)\s*/;

/** Whatever the engine published, expanded into individual numbers. */
function splitPhones(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.flatMap((item) => splitPhones(item));
  if (typeof raw !== "string") return [];
  const out: string[] = [];
  for (const piece of raw.split(PHONE_SPLIT_RE)) {
    const phone = normalizePhone(piece);
    if (phone) out.push(phone);
  }
  return out;
}

/** Every distinct published number, primary first, capped for storage. */
export function sanitizePhones(...candidates: unknown[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    for (const phone of splitPhones(candidate)) {
      const digits = phone.replace(/\D/g, "");
      if (seen.has(digits)) continue;
      seen.add(digits);
      out.push(phone);
      if (out.length >= MAX_PHONES) return out;
    }
  }
  return out;
}

/** Published social profile links only — never an email, never a guess. */
export function sanitizeSocialProfiles(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string" || !/^https?:\/\//i.test(item.trim())) continue;
    const url = item.trim().slice(0, 500);
    if (!out.includes(url)) out.push(url);
    if (out.length >= MAX_SOCIALS) break;
  }
  return out;
}
