#!/usr/bin/env node
/**
 * Guard: lead discovery must never depend on a Google Maps API.
 *
 * Zybble finds businesses with the open-source gosom/google-maps-scraper engine
 * that runs in the Railway worker (worker/gmaps_engine.py →
 * worker/scraper.py), pinned in worker/vendor/engine.json. No Google Maps API
 * key, Places API or Geocoding API is used — or even referenced — in the
 * lead-generation path.
 *
 * This script fails the build if any of that ever creeps back in.
 *
 * Run: node scripts/verify-no-google-maps.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const root = resolve(dirname(new URL(import.meta.url).pathname), "..");

const SCAN_DIRS = ["api", "worker", "src", "supabase", "scripts"];
const SKIP_FILES = new Set(["verify-no-google-maps.mjs", "e2e-lead-finder.mjs", "package-lock.json"]);
// Tests deliberately *mention* these strings to assert their absence elsewhere;
// only application code is scanned.
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", ".vercel", "__pycache__", "vendor", "tests"]);

// Forbidden: paid Google endpoints, their key env var, and the retired provider.
const FORBIDDEN = [
  { pattern: /places\.googleapis\.com/i, why: "Google Places API endpoint" },
  { pattern: /maps\.googleapis\.com/i, why: "Google Geocoding/Directions API endpoint" },
  { pattern: /maps\.gstatic\.com\/maps\/api/i, why: "Google Maps JS API endpoint" },
  { pattern: /GOOGLE_MAPS_API_KEY/, why: "Google Maps API key" },
  { pattern: /X-Goog-Api-Key/i, why: "Google API key header" },
  { pattern: /AIza[0-9A-Za-z_-]{20,}/, why: "hard-coded Google API key" },
  { pattern: /provider\s*===\s*["']places["']/i, why: "retired Google Places lead provider" },
  { pattern: /leadProvider/i, why: "retired Google Places lead provider switch" },
];

// The scraping engine is allowed to *name* Google Maps: it drives the public
// maps UI in a headless browser, which is the whole point of it.
const ALLOWED_CONTEXT =
  /vendor|google-maps-scraper|google_maps_scraper|gosom|gmaps_engine|fake_gms|google\.com\/maps\/search|www\.google\.com\/maps/i;

const violations = [];
let scanned = 0;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full);
      continue;
    }
    if (!/\.(ts|tsx|mjs|js|py|sql|json|yml|yaml|example)$/.test(name)) continue;
    if (SKIP_FILES.has(name)) continue;
    scanned += 1;
    const source = readFileSync(full, "utf8");
    source.split("\n").forEach((line, index) => {
      for (const rule of FORBIDDEN) {
        if (!rule.pattern.test(line)) continue;
        if (ALLOWED_CONTEXT.test(line)) continue;
        violations.push({
          file: relative(root, full),
          line: index + 1,
          why: rule.why,
          snippet: line.trim().slice(0, 160),
        });
      }
    });
  }
}

for (const dir of SCAN_DIRS) {
  const full = join(root, dir);
  try {
    walk(full);
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
}

if (violations.length) {
  console.error("verify-no-google-maps: FAIL\n");
  for (const violation of violations) {
    console.error(`  ${violation.file}:${violation.line} — ${violation.why}`);
    console.error(`    ${violation.snippet}`);
  }
  console.error(
    "\nLead discovery runs through the google-maps-scraper worker. Remove every Google Maps API dependency.",
  );
  process.exit(1);
}

console.log(`verify-no-google-maps: OK — ${scanned} files scanned, no Google Maps API dependency found.`);
