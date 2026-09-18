import dns from "node:dns/promises";
import net from "node:net";

// ————————————————————————————————————————————————————————————
// Email finder & verification (port of the Python worker).
//
// Discovers emails a business published on its own website —
// homepage, /contact, /about. Nothing is guessed or invented.
//   mailto: on a contact page     -> verified
//   plain address on contact page -> verified
//   homepage / obfuscated match   -> risky
//   domain has no MX records      -> invalid
//   nothing found                 -> unknown
// ————————————————————————————————————————————————————————————

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const MAILTO_RE = /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
const OBFUSCATED_RE =
  /([a-zA-Z0-9._%+-]{2,})\s*(?:\(|\[)?\s*(?:at|@)\s*(?:\)|\])?\s*([a-zA-Z0-9-]+(?:\s*(?:\(|\[)?\s*(?:dot|\.)\s*(?:\)|\])?\s*[a-zA-Z0-9-]+)+)/gi;

const BLOCKED_LOCAL = new Set([
  "noreply", "no-reply", "donotreply", "mailer-daemon", "postmaster",
  "example", "email", "yourname", "name", "user", "webmaster", "sentry",
]);
const BLOCKED_DOMAIN_FRAGMENTS = [
  "example.com", "sentry.io", "wixpress.com", "schema.org", "w3.org",
  "godaddy.com", "squarespace.com", "cloudflare.com",
];
const BLOCKED_SUFFIXES = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".css", ".js"];

const CONTACT_PATHS = ["/contact", "/contact-us", "/about", "/about-us"];

// Public social profiles published on the business's own pages power the
// "has social profile" lead filter.
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
  value = value.replace(/^[.,;:()\[\]{}<>"'\s]+|[.,;:()\[\]{}<>"'\s]+$/g, "");
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
  const socials = Array.isArray(input.social_profiles)
    ? input.social_profiles
        .filter((item): item is string => typeof item === "string" && /^https?:\/\//i.test(item))
        .slice(0, MAX_SOCIALS)
    : [];
  return {
    email,
    // An address that failed validation can never be claimed as verified.
    email_status: email ? status : "unknown",
    email_source_url: source && /^https?:\/\//i.test(source) ? source.slice(0, 2000) : null,
    social_profiles: socials,
    rejected: Boolean(input.email) && !email,
  };
}
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const MAX_BYTES = 600_000;
const TIMEOUT_MS = 8_000;

export type EmailStatus = "verified" | "risky" | "invalid" | "unknown";
const EMAIL_STATUSES_VALUES = ["verified", "risky", "invalid", "unknown"] as const;

export interface FoundEmail {
  email: string;
  status: EmailStatus;
  sourceUrl: string;
  socialProfiles: string[];
}

function isValidAddress(raw: string): boolean {
  return normalizeEmail(raw) !== null;
}

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
    return false;
  }
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fe80") || lower.startsWith("fc") || lower.startsWith("fd")) return true;
  if (lower.startsWith("::ffff:")) return isPrivateIp(lower.slice(7));
  return false;
}

/** SSRF guard: public HTTP(S) hosts only, never internal networks. */
async function isSafePublicUrl(raw: string): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (url.port && !["80", "443", ""].includes(url.port)) return false;
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".local") || host === "metadata.google.internal")
    return false;
  try {
    const records = await dns.lookup(host, { all: true });
    if (!records.length) return false;
    return records.every((r) => !isPrivateIp(r.address));
  } catch {
    return false;
  }
}

async function fetchPage(url: string): Promise<string | null> {
  let current = url;
  // Validate every hop — a redirect must not reach an internal address.
  for (let hop = 0; hop < 4; hop++) {
    if (!(await isSafePublicUrl(current))) return null;
    let res: Response;
    try {
      res = await fetch(current, {
        headers: { "user-agent": UA, "accept-language": "en-US,en;q=0.9" },
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      return null;
    }
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return null;
      current = new URL(location, current).toString();
      continue;
    }
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType && !/text\/html|text\/plain/i.test(contentType)) return null;

    const reader = res.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (size < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.length;
    }
    await reader.cancel().catch(() => undefined);
    return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf8");
  }
  return null;
}

async function hasMxRecords(domain: string): Promise<boolean | null> {
  try {
    const records = await dns.resolveMx(domain);
    if (records.length > 0) return true;
    // No MX is not proof: some domains accept mail on their A record.
    const a = await dns.resolve4(domain).catch(() => []);
    return a.length > 0 ? null : false;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOTFOUND" || code === "ENODATA") return false;
    // Resolver/network trouble is uncertainty, never evidence of invalidity.
    return null;
  }
}

export async function findEmail(siteUrl: string): Promise<FoundEmail | null> {
  let base: string;
  try {
    const parsed = new URL(siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`);
    base = `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }

  const candidates: { email: string; source: string; strong: boolean }[] = [];
  let socials: string[] = [];

  for (const path of ["/", ...CONTACT_PATHS]) {
    const pageUrl = new URL(path, base).toString();
    const html = await fetchPage(pageUrl);
    if (!html) continue;
    const strongPage = path !== "/";
    socials = socials.concat(extractSocialProfiles(html));

    for (const match of html.matchAll(MAILTO_RE)) {
      candidates.push({ email: match[1].toLowerCase(), source: pageUrl, strong: true });
    }
    for (const match of html.matchAll(EMAIL_RE)) {
      candidates.push({ email: match[0].toLowerCase(), source: pageUrl, strong: strongPage });
    }
    for (const match of html.matchAll(OBFUSCATED_RE)) {
      const domain = match[2].replace(/\s*(?:\(|\[)?\s*dot\s*(?:\)|\])?\s*/gi, ".");
      candidates.push({
        email: `${match[1]}@${domain}`.toLowerCase(),
        source: pageUrl,
        strong: false,
      });
    }
    if (candidates.some((c) => isValidAddress(c.email))) break;
  }

  const seen = new Set<string>();
  const ranked = candidates
    .filter((c) => {
      if (!isValidAddress(c.email) || seen.has(c.email)) return false;
      seen.add(c.email);
      return true;
    })
    // Prefer a mailto/contact-page hit over an incidental homepage match.
    .sort((a, b) => Number(b.strong) - Number(a.strong));

  if (!ranked.length) return null;

  const best = ranked[0];
  const domain = best.email.split("@")[1];
  const mx = await hasMxRecords(domain);
  const socialProfiles = socials
    .filter((url, index) => socials.indexOf(url) === index)
    .slice(0, MAX_SOCIALS);
  if (mx === false) {
    return { email: best.email, status: "invalid", sourceUrl: best.source, socialProfiles };
  }
  return {
    email: best.email,
    status: best.strong ? "verified" : "risky",
    sourceUrl: best.source,
    socialProfiles,
  };
}
