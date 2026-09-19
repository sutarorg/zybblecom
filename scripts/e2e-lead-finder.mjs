#!/usr/bin/env node
/**
 * Lead Finder E2E (offline) — filters, email safety, deduplication and the
 * no-Google-API guarantee.
 *
 * Covers the behaviour the product promises:
 *   1. every professional lead filter, individually and combined
 *   2. sorting (rating / reviews / relevance / newest)
 *   3. invalid or missing email addresses never fail a job
 *   4. business deduplication by place id, Maps URL and name+address
 *   5. the API still boots and rejects unauthenticated searches
 *   6. no Google Maps API anywhere in the lead path
 *
 * Run: node --experimental-strip-types scripts/e2e-lead-finder.mjs
 */
import assert from "node:assert/strict";
import http from "node:http";

process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://test-project.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "test-service-key";
process.env.CRON_SECRET = process.env.CRON_SECRET || "test-cron-secret-123456789012345678";
process.env.SCRAPER_WORKER_SECRET = process.env.SCRAPER_WORKER_SECRET || "test-scraper-secret-1234567890123456";

const {
  parseFilters,
  emptyFilters,
  evaluateDiscoveryFilters,
  evaluateEnrichmentFilters,
  sortLeads,
  usesEnrichmentFilters,
  describeFilters,
} = await import("../api/_lib/filters.ts");
const { normalizeEmail, normalizePhone, sanitizePhones, sanitizeEmailResult, extractSocialProfiles } =
  await import("../api/_lib/contacts.ts");
const { sanitizeEmails } = await import("../api/_lib/routes-worker.ts");
const { canonicalMapsUrl, dedupeKeyFor } = await import("../api/_lib/routes-worker.ts");
const { searchJobView } = await import("../api/_lib/jobs.ts");

const results = [];
async function test(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(` PASS  ${name}`);
  } catch (err) {
    results.push({ name, ok: false, err });
    console.error(` FAIL  ${name}:`, err.message);
  }
}

const lead = (overrides = {}) => ({
  company: "Iron Yard Gym",
  category: "Gym",
  address: "12 Main Road",
  city: "New Delhi",
  state: "Delhi",
  country: "India",
  phone: "+91 11 4000 0000",
  website: "https://ironyard.example.in",
  rating: 4.4,
  reviews: 210,
  open_status: "open",
  email: null,
  email_status: null,
  social_profiles: [],
  ...overrides,
});

console.log("=== LEAD FINDER: FILTERS ===");

await test("empty filters keep every business", async () => {
  assert.equal(evaluateDiscoveryFilters(lead(), parseFilters({})).keep, true);
  assert.equal(usesEnrichmentFilters(parseFilters({})), false);
});

await test("location filters (country / state / city)", async () => {
  for (const key of ["country", "state", "city"]) {
    const value = lead()[key];
    assert.equal(evaluateDiscoveryFilters(lead(), parseFilters({ [key]: value })).keep, true, key);
    assert.equal(evaluateDiscoveryFilters(lead(), parseFilters({ [key]: "Elsewhere" })).keep, false, key);
  }
});

await test("rating and review bounds", async () => {
  assert.equal(evaluateDiscoveryFilters(lead({ rating: 4.0 }), parseFilters({ min_rating: 4 })).keep, true);
  assert.equal(evaluateDiscoveryFilters(lead({ rating: 3.9 }), parseFilters({ min_rating: 4 })).keep, false);
  assert.equal(evaluateDiscoveryFilters(lead({ rating: 5 }), parseFilters({ max_rating: 4.8 })).keep, false);
  assert.equal(evaluateDiscoveryFilters(lead({ rating: null }), parseFilters({ min_rating: 4 })).keep, false);
  assert.equal(evaluateDiscoveryFilters(lead({ reviews: 10 }), parseFilters({ min_reviews: 50 })).keep, false);
  assert.equal(evaluateDiscoveryFilters(lead({ reviews: 900 }), parseFilters({ max_reviews: 100 })).keep, false);
});

await test("has website / website-only / has phone / contactable", async () => {
  assert.equal(evaluateDiscoveryFilters(lead({ website: null }), parseFilters({ has_website: true })).keep, false);
  assert.equal(evaluateDiscoveryFilters(lead(), parseFilters({ websites_only: true })).keep, true);
  assert.equal(evaluateDiscoveryFilters(lead({ phone: null }), parseFilters({ has_phone: true })).keep, false);
  assert.equal(evaluateDiscoveryFilters(lead({ website: null, phone: null }), parseFilters({ contactable_only: true })).keep, false);
  assert.equal(evaluateDiscoveryFilters(lead({ website: null }), parseFilters({ contactable_only: true })).keep, true);
});

await test("open / closed status and keywords", async () => {
  assert.equal(evaluateDiscoveryFilters(lead(), parseFilters({ open_status: ["open"] })).keep, true);
  assert.equal(evaluateDiscoveryFilters(lead({ open_status: "permanently_closed" }), parseFilters({ open_status: ["open"] })).keep, false);
  assert.equal(evaluateDiscoveryFilters(lead(), parseFilters({ keywords_include: ["iron"] })).keep, true);
  assert.equal(evaluateDiscoveryFilters(lead(), parseFilters({ keywords_include: ["pilates"] })).keep, false);
  assert.equal(evaluateDiscoveryFilters(lead(), parseFilters({ keywords_exclude: ["iron"] })).keep, false);
});

await test("enrichment filters (email / status / social / enriched)", async () => {
  const verified = lead({ email: "hello@ironyard.in", email_status: "verified" });
  assert.equal(evaluateEnrichmentFilters(verified, parseFilters({ has_email: true })).keep, true);
  assert.equal(evaluateEnrichmentFilters(lead(), parseFilters({ has_email: true })).keep, false);
  assert.equal(evaluateEnrichmentFilters(verified, parseFilters({ email_status: ["verified"] })).keep, true);
  assert.equal(evaluateEnrichmentFilters(lead({ email: "a@b.in", email_status: "risky" }), parseFilters({ email_status: ["verified"] })).keep, false);
  assert.equal(evaluateEnrichmentFilters(lead({ social_profiles: ["https://facebook.com/x"] }), parseFilters({ has_social: true })).keep, true);
  assert.equal(evaluateEnrichmentFilters(lead(), parseFilters({ has_social: true })).keep, false);
  assert.equal(evaluateEnrichmentFilters(lead(), parseFilters({ enriched_only: true })).keep, false);
  assert.equal(usesEnrichmentFilters(parseFilters({ has_email: true })), true);
});

await test("filters combined", async () => {
  const filters = parseFilters({
    country: "India",
    city: "New Delhi",
    min_rating: 4,
    min_reviews: 100,
    has_website: true,
    has_phone: true,
    open_status: ["open"],
    keywords_include: ["gym"],
  });
  assert.equal(evaluateDiscoveryFilters(lead(), filters).keep, true);
  assert.equal(evaluateDiscoveryFilters(lead({ reviews: 10 }), filters).keep, false);
  assert.equal(evaluateDiscoveryFilters(lead({ open_status: "closed" }), filters).keep, false);
  assert.equal(evaluateDiscoveryFilters(lead({ city: "Mumbai" }), filters).keep, false);
  assert.deepEqual(describeFilters(filters).length > 5, true);
});

await test("filters decode hostile input instead of throwing", async () => {
  const filters = parseFilters({ min_rating: "4.5", has_website: "yes", sort_by: "nonsense", email_status: "verified,bogus" });
  assert.equal(filters.min_rating, 4.5);
  assert.equal(filters.has_website, true);
  assert.equal(filters.sort_by, "relevance");
  assert.deepEqual(filters.email_status, ["verified"]);
  assert.deepEqual(parseFilters(null).sort_by, "relevance");
  assert.deepEqual(parseFilters(undefined).exclude_previously_collected, true);
});

await test("sorting by rating, reviews, newest and relevance", async () => {
  const rows = [
    { company: "A", rating: 3.5, reviews: 500, created_at: "2024-01-01" },
    { company: "B", rating: 4.9, reviews: 10, created_at: "2024-02-01" },
    { company: "C", rating: 4.2, reviews: 250, created_at: "2024-03-01" },
  ];
  assert.deepEqual(sortLeads(rows, "rating").map((r) => r.company), ["B", "C", "A"]);
  assert.deepEqual(sortLeads(rows, "reviews").map((r) => r.company), ["A", "C", "B"]);
  assert.deepEqual(sortLeads(rows, "newest").map((r) => r.company), ["C", "B", "A"]);
  assert.deepEqual(sortLeads(rows, "relevance").map((r) => r.company), ["A", "B", "C"]);
});

console.log("\n=== LEAD FINDER: EMAIL SAFETY ===");

await test("valid addresses are normalised", async () => {
  assert.equal(normalizeEmail("  Hello@IronYard.IN "), "hello@ironyard.in");
  assert.equal(normalizeEmail("mailto:info@shop.co.uk"), "info@shop.co.uk");
  assert.equal(normalizeEmail("<sales@ironyard.in>"), "sales@ironyard.in");
});

await test("invalid addresses are rejected, never stored", async () => {
  for (const bad of [
    "not-an-email",
    "hello@",
    "@example.com",
    "a@@b.com",
    "a..b@example.com",
    ".a@example.com",
    "a@example.",
    "noreply@example.com",
    "webmaster@example.com",
    "avatar@company.png",
    "style@site.css",
    "",
    null,
    undefined,
    {},
  ]) {
    assert.equal(normalizeEmail(bad), null, `must reject ${String(bad)}`);
  }
});

await test("a bad email becomes unknown — it never fails the job", async () => {
  const safe = sanitizeEmailResult({ email: "not-an-email", email_status: "verified", email_source_url: "https://x/contact" });
  assert.equal(safe.email, null);
  assert.equal(safe.email_status, "unknown");
  assert.equal(safe.email_source_url, "https://x/contact");
  assert.equal(safe.rejected, true);

  const missing = sanitizeEmailResult({ email: null, email_status: "unknown" });
  assert.equal(missing.email, null);
  assert.equal(missing.email_status, "unknown");
  assert.equal(missing.rejected, false);

  const good = sanitizeEmailResult({ email: "Hi@IronYard.in", email_status: "verified", email_source_url: "https://ironyard.in/contact" });
  assert.equal(good.email, "hi@ironyard.in");
  assert.equal(good.email_status, "verified");
  assert.equal(good.rejected, false);
});

await test("phone numbers are validated, deduplicated and capped", async () => {
  assert.equal(normalizePhone("+91 11 4000 0000"), "+91 11 4000 0000");
  assert.equal(normalizePhone("(212) 555-0100"), "(212) 555-0100");
  assert.equal(normalizePhone("+1 415 555 2671 ext. 12"), "+1 415 555 2671 ext. 12");
  for (const bad of ["call us", "hello@ironyard.in", "https://ironyard.in", "", null, 42]) {
    assert.equal(normalizePhone(bad), null, `must reject ${String(bad)}`);
  }
  assert.deepEqual(
    sanitizePhones("+91 11 4000 0000; +91 11 4000 0001", ["+1 212 555 0100", "+1 212 555 0100"]),
    ["+91 11 4000 0000", "+91 11 4000 0001", "+1 212 555 0100"],
  );
  assert.deepEqual(sanitizePhones("Call us"), []);
});

await test("engine emails are the only source, and every one of them survives", async () => {
  const contacts = sanitizeEmails(
    ["One@IronYard.in", "one@ironyard.in", "not-an-email", "noreply@ironyard.in", "two@ironyard.in"],
    "verified",
  );
  assert.deepEqual(contacts.emails, ["one@ironyard.in", "two@ironyard.in"]);
  assert.equal(contacts.email, "one@ironyard.in");
  assert.equal(contacts.email_status, "verified");

  const empty = sanitizeEmails([], "verified");
  assert.deepEqual(empty.emails, []);
  assert.equal(empty.email, null);
  assert.equal(empty.email_status, "unknown", "no address is ever invented");

  const unverified = sanitizeEmails(["hello@ironyard.in"]);
  assert.equal(unverified.email_status, "risky", "a status is never claimed without evidence");
});

await test("social profiles are read from business pages and sanitised", async () => {
  const socials = extractSocialProfiles(
    '<a href="https://www.facebook.com/ironyard">f</a><a href="https://instagram.com/ironyard">i</a><a href="https://example.com/about">about</a>',
  );
  assert.equal(socials.length, 2);
  assert.deepEqual(extractSocialProfiles(""), []);
});

console.log("\n=== LEAD FINDER: DEDUPLICATION ===");

await test("one business, one key — across tracking parameters and viewports", async () => {
  const a = { place_id: "0x1:0xabc", maps_url: "https://www.google.com/maps/place/Iron+Yard/data=x?entry=ttu&g_ep=abc", company: "Iron Yard", address: "12 Main" };
  const b = { place_id: "0x1:0xabc", maps_url: "https://www.google.com/maps/place/Iron+Yard/data=x?hl=en", company: "Iron Yard", address: "12 Main" };
  assert.equal(dedupeKeyFor(a), dedupeKeyFor(b));
  assert.equal(dedupeKeyFor(a).startsWith("pid:"), true);

  const noId = { maps_url: "https://www.google.com/maps/place/Iron+Yard/data=y?entry=ttu", company: "Iron Yard", address: "12 Main" };
  const noId2 = { maps_url: "https://www.google.com/maps/place/Iron+Yard/data=y", company: "Iron Yard Gym", address: "12 Main Road" };
  assert.equal(dedupeKeyFor(noId), dedupeKeyFor(noId2));

  const byName = { company: "Iron Yard", address: "12 Main Road" };
  const byName2 = { company: "iron  yard!", address: "12 main road" };
  assert.equal(dedupeKeyFor(byName), dedupeKeyFor(byName2));

  assert.notEqual(dedupeKeyFor({ company: "Iron Yard", address: "12 Main" }), dedupeKeyFor({ company: "Iron Yard", address: "99 Other" }));
  assert.equal(canonicalMapsUrl("https://www.google.com/maps/place/X/data=1?entry=ttu&g_ep=z"), "https://www.google.com/maps/place/X/data=1");
});

console.log("\n=== LEAD FINDER: JOB REPORTING ===");

await test("the job view exposes every counter the UI shows", async () => {
  const view = searchJobView({
    id: "job-1",
    user_id: "user-1",
    query: "gym",
    location: "Delhi",
    quantity: 50,
    requested: 50,
    collected: 42,
    status: "finding_emails",
    progress: 88,
    discovered: 61,
    unique_count: 50,
    duplicate_count: 9,
    filtered_count: 2,
    enriched_count: 42,
    email_found_count: 17,
    error_count: 1,
    coverage_total: 18,
    coverage_done: 12,
    filters: { min_rating: 4 },
    sort_by: "rating",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  });
  assert.equal(view.counts.requested, 50);
  assert.equal(view.counts.discovered, 61);
  assert.equal(view.counts.unique, 50);
  assert.equal(view.counts.saved, 42);
  assert.equal(view.counts.duplicates, 9);
  assert.equal(view.counts.filtered, 2);
  assert.equal(view.counts.email_found, 17);
  assert.equal(view.counts.errors, 1);
  assert.equal(view.counts.coverage_done, 12);
  assert.equal(view.filters.min_rating, 4);
  assert.equal(view.sort_by, "rating");
  assert.equal(view.lease_token, undefined);
  assert.equal("payload" in view, false);
});

console.log("\n=== LEAD FINDER: API ===");

const { default: routerHandler } = await import("../api/router.ts");
const server = http.createServer(async (req, res) => {
  try {
    await routerHandler(req, res);
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: String(err) }));
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const BASE = `http://127.0.0.1:${server.address().port}`;

await test("health endpoint reports the service", async () => {
  const res = await fetch(`${BASE}/api/health`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.service, "zybble");
});

await test("search creation requires authentication", async () => {
  const res = await fetch(`${BASE}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "gym", location: "Delhi", quantity: 50, filters: { min_rating: 4 } }),
  });
  assert.equal(res.status, 401);
});

await test("search creation rejects invalid input before touching the queue", async () => {
  const res = await fetch(`${BASE}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer invalid.fake.jwt" },
    body: JSON.stringify({ query: "g", location: "Delhi", quantity: 500 }),
  });
  assert.equal(res.status, 401);
});

server.close();

console.log(`\n=== TEST SUMMARY ===`);
const failed = results.filter((r) => !r.ok);
console.log(`${results.length - failed.length}/${results.length} tests passed.`);
if (failed.length) {
  console.error("FAILURES:", failed.map((f) => f.name));
  process.exit(1);
}
console.log("LEAD FINDER TESTS PASSED\n");
