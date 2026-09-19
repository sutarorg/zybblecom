#!/usr/bin/env node
/**
 * Guard: the scraping engine must stay pinned, documented and honestly wired up.
 *
 * Zybble's Lead Finder discovery runs `gosom/google-maps-scraper` as a child
 * process (worker/gmaps_engine.py). That is a build-from-source dependency of a
 * Docker image, so the things that can silently rot are the ones a compiler
 * never checks:
 *
 *   1. the pin in worker/vendor/engine.json vs the ARGs worker/Dockerfile builds;
 *   2. the flags we document vs the flags the adapter actually sends (Go's flag
 *      package exits(2) on an unknown flag — a rename upstream breaks the worker
 *      at runtime, not at build time);
 *   3. the licence text we must redistribute with an MIT dependency;
 *   4. the retired Selenium/GoogleMapScraper stack creeping back in;
 *   5. every SCRAPER_ENGINE_* knob the worker reads being documented in
 *      .env.example, and the README naming the engine it actually uses.
 *
 * Run: node scripts/verify-scraper-engine.mjs   (also `npm run verify:engine`)
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const root = resolve(dirname(new URL(import.meta.url).pathname), "..");
const read = (relative) => readFileSync(join(root, relative), "utf8");
const exists = (relative) => existsSync(join(root, relative));

const problems = [];
const fail = (check, detail) => problems.push({ check, detail });
const ok = [];

const PIN_FILE = "worker/vendor/engine.json";
const DOCKERFILE = "worker/Dockerfile";
const ADAPTER = "worker/gmaps_engine.py";
const ENV_EXAMPLE = ".env.example";
const README = "README.md";

// ── 1. The pin manifest ───────────────────────────────────────────────────────
if (!exists(PIN_FILE)) {
  fail("pin", `${PIN_FILE} is missing`);
} else {
  let pin;
  try {
    pin = JSON.parse(read(PIN_FILE));
  } catch (err) {
    fail("pin", `${PIN_FILE} is not valid JSON: ${err.message}`);
  }
  if (pin) {
    const require = (path, predicate, detail) => {
      const value = path.split(".").reduce((node, key) => (node == null ? node : node[key]), pin);
      if (predicate(value)) {
        ok.push(`pin ${path}`);
      } else {
        fail("pin", `${PIN_FILE} → ${path} ${detail} (got ${JSON.stringify(value)})`);
      }
    };

    require("upstream", (v) => v === "https://github.com/gosom/google-maps-scraper", "must name the engine repository");
    require("version", (v) => /^v\d+\.\d+\.\d+$/.test(v ?? ""), "must be a released tag, e.g. v1.18.0");
    require("commit", (v) => /^[0-9a-f]{40}$/.test(v ?? ""), "must be a 40-char commit SHA");
    require("license", (v) => v === "MIT", "must state the licence");
    require("binary", (v) => v === "google-maps-scraper", "must name the binary");
    require("install_path", (v) => typeof v === "string" && v.startsWith("/"), "must be an absolute path");
    require("interface", (v) => v === "cli", "must be 'cli'");
    require("output_format", (v) => v === "jsonl", "must be 'jsonl'");
    require("build.go_version", (v) => /^\d+\.\d+/.test(v ?? ""), "must pin a Go toolchain");
    require("build.playwright_go_version", (v) => /^v\d+\./.test(v ?? ""), "must pin playwright-go");
    require("environment.DISABLE_TELEMETRY", (v) => v === "1", "must disable upstream telemetry");
    require("flags", (v) => Array.isArray(v) && v.length >= 8 && v.every((flag) => flag.startsWith("-")), "must list the CLI flags Zybble sends");
    require("entry_fields_used", (v) => Array.isArray(v) && v.includes("title") && v.includes("link"), "must list the entry fields Zybble reads");

    // ── 2. The Dockerfile must build exactly this pin ─────────────────────────
    if (!exists(DOCKERFILE)) {
      fail("dockerfile", `${DOCKERFILE} is missing`);
    } else {
      const dockerfile = read(DOCKERFILE);
      const arg = (name) => {
        const match = dockerfile.match(new RegExp(`^ARG\\s+${name}=(\\S+)`, "m"));
        return match ? match[1] : null;
      };
      const expectArg = (name, value) => {
        const actual = arg(name);
        if (actual === value) {
          ok.push(`dockerfile ARG ${name}`);
        } else {
          fail("dockerfile", `${DOCKERFILE} ARG ${name}=${actual ?? "<unset>"} but ${PIN_FILE} pins ${value}`);
        }
      };

      expectArg("GMS_VERSION", pin.version);
      expectArg("GMS_COMMIT", pin.commit);
      expectArg("GO_VERSION", pin.build.go_version);
      expectArg("PLAYWRIGHT_GO_VERSION", pin.build.playwright_go_version);

      const checks = [
        ['--branch "${GMS_VERSION}"', "must clone the pinned tag"],
        ["git rev-parse HEAD", "must verify the pinned commit before building"],
        [pin.install_path, `must install the binary to ${pin.install_path}`],
        ["DISABLE_TELEMETRY=1", "must disable upstream telemetry"],
        [`PLAYWRIGHT_BROWSERS_PATH=${pin.environment.PLAYWRIGHT_BROWSERS_PATH}`, "must keep the browser path from the pin"],
        [`PLAYWRIGHT_DRIVER_PATH=${pin.environment.PLAYWRIGHT_DRIVER_PATH}`, "must keep the driver path from the pin"],
        ["python3 -m venv", "must install the Python worker"],
        ["google-maps-scraper -version", "must prove the engine runs inside the image"],
        ["smoke_test.py --simulate", "must run the offline smoke test inside the image"],
      ];
      for (const [needle, detail] of checks) {
        const found = dockerfile.includes(needle);
        if (found) {
          ok.push(`dockerfile ${needle.slice(0, 48)}`);
        } else {
          fail("dockerfile", `${DOCKERFILE} ${detail}`);
        }
      }

      if (/^FROM\s+m?cr\.?|selenium|chromedriver/i.test(dockerfile)) {
        fail("dockerfile", `${DOCKERFILE} must not install Selenium or chromedriver — the engine drives Playwright`);
      }
    }

    // ── 3. Licence redistribution ─────────────────────────────────────────────
    const licencePath = `worker/vendor/${pin.license_file}`;
    if (!exists(licencePath)) {
      fail("licence", `${licencePath} is missing — an MIT dependency must ship its licence`);
    } else {
      const licence = read(licencePath);
      if (!licence.includes("MIT License")) fail("licence", `${licencePath} does not contain the MIT licence text`);
      else ok.push("licence text");
      if (!/Georgios Komninos/.test(licence)) fail("licence", `${licencePath} does not name the copyright holder`);
      else ok.push("licence holder");
    }

    // ── 4. Flags: documented ⇄ sent ───────────────────────────────────────────
    if (!exists(ADAPTER)) {
      fail("adapter", `${ADAPTER} is missing`);
    } else {
      const adapter = read(ADAPTER);
      const start = adapter.indexOf("def build_argv(");
      const end = adapter.indexOf("\n    def ", start + 1);
      const body = start >= 0 ? adapter.slice(start, end > start ? end : undefined) : "";
      if (!body) {
        fail("adapter", `${ADAPTER} has no build_argv() — the invocation contract is gone`);
      } else {
        const sent = new Set(
          [...body.matchAll(/"(-[a-z][a-z0-9-]*)"/g)].map((match) => match[1]),
        );
        const documented = new Set(pin.flags.filter((flag) => flag !== "-version"));

        for (const flag of documented) {
          if (!sent.has(flag)) {
            fail("adapter", `${PIN_FILE} documents ${flag} but build_argv() never sends it`);
          }
        }
        for (const flag of sent) {
          if (!documented.has(flag)) {
            fail("adapter", `build_argv() sends ${flag} but ${PIN_FILE} does not document it`);
          }
        }
        if (!adapter.includes('"-version"')) {
          fail("adapter", `${ADAPTER} must keep -version for the smoke test and the boot log`);
        }
        // Go's flag package: boolean flags take no value.
        if (/"-json",\s*"true"|"-email",\s*"true"/.test(body)) {
          fail("adapter", "boolean Go flags must be bare (-json, -email), never '-json true'");
        }
        if (!problems.some((problem) => problem.check === "adapter")) ok.push(`flags (${sent.size}) documented and sent`);

        // ── 5. Entry fields: documented ⇄ read ────────────────────────────────
        const scraper = read("worker/scraper.py");
        for (const field of pin.entry_fields_used) {
          const needle = `"${field}"`;
          if (!scraper.includes(needle) && !adapter.includes(needle)) {
            fail("fields", `${PIN_FILE} lists entry field ${field} but no worker module reads it`);
          }
        }
        if (!problems.some((problem) => problem.check === "fields")) {
          ok.push(`entry fields (${pin.entry_fields_used.length}) all read`);
        }
      }
    }
  }
}

// ── 6. The retired stack must stay retired ────────────────────────────────────
const retired = [
  ["worker/vendor/googlemapscraper.py", "the vendored SoCloseSociety scraper was replaced"],
  ["worker/tests/fake_maps.py", "the Selenium-shaped simulator was replaced by tests/fake_gms.py"],
];
for (const [path, why] of retired) {
  if (exists(path)) fail("retired", `${path} still exists — ${why}`);
  else ok.push(`retired ${path}`);
}

const requirements = exists("worker/requirements.txt") ? read("worker/requirements.txt") : "";
for (const banned of ["selenium", "webdriver", "beautifulsoup4", "bs4", "chromedriver"]) {
  const line = requirements
    .split("\n")
    .find((candidate) => !candidate.trim().startsWith("#") && candidate.toLowerCase().includes(banned));
  if (line) fail("retired", `worker/requirements.txt still depends on ${banned}: ${line.trim()}`);
}
if (!requirements.includes("requests") || !requirements.includes("dnspython")) {
  fail("requirements", "worker/requirements.txt must pin requests and dnspython");
} else {
  ok.push("requirements pinned");
}

const pythonSources = [
  "worker/gmaps_engine.py",
  "worker/scraper.py",
  "worker/worker.py",
  "worker/engine_contacts.py",
  "worker/site_enrichment.py",
  "worker/coverage.py",
  "worker/smoke_test.py",
];
for (const path of pythonSources) {
  if (!exists(path)) {
    fail("worker", `${path} is missing`);
    continue;
  }
  const source = read(path);
  for (const banned of [/^\s*(from|import)\s+selenium/m, /webdriver/, /GoogleMapScraper/, /from\s+vendor\s+import/, /FakeDriver/]) {
    if (banned.test(source)) fail("retired", `${path} still references the retired Selenium/GoogleMapScraper stack (${banned})`);
  }
}

// Emails have exactly one source: the pinned engine's `-email` extraction.
// Nothing in Zybble may own an address-discovery path of its own.
for (const path of ["api/_lib/contacts.ts", "worker/engine_contacts.py"]) {
  if (!exists(path)) fail("email policy", `${path} is missing — email validation lives there`);
}
for (const path of ["api/_lib/email-finder.ts", "worker/email_finder.py"]) {
  if (exists(path)) fail("email policy", `${path} must be gone: Zybble does not discover emails itself`);
}
const engineSource = read("worker/gmaps_engine.py");
if (!/-email/.test(engineSource) || !/extract_email: bool = True/.test(engineSource)) {
  fail("email policy", "the engine must request the business-published addresses by default (-email)");
} else {
  ok.push("engine-owned email extraction");
}

// ── 7. Every engine knob is documented ────────────────────────────────────────
if (!exists(ENV_EXAMPLE)) {
  fail("docs", `${ENV_EXAMPLE} is missing`);
} else {
  const envExample = read(ENV_EXAMPLE);
  const knobs = new Set();
  for (const path of ["worker/gmaps_engine.py", "worker/worker.py", "worker/scraper.py"]) {
    if (!exists(path)) continue;
    for (const match of read(path).matchAll(/"(SCRAPER_[A-Z0-9_]+|GOOGLE_MAPS_SCRAPER_BIN)"/g)) {
      knobs.add(match[1]);
    }
  }
  const undocumented = [...knobs].filter((knob) => !envExample.includes(knob)).sort();
  if (undocumented.length) {
    fail("docs", `${ENV_EXAMPLE} does not document: ${undocumented.join(", ")}`);
  } else {
    ok.push(`env knobs documented (${knobs.size})`);
  }
}

if (!exists(README)) {
  fail("docs", `${README} is missing`);
} else {
  const readme = read(README);
  for (const [needle, why] of [
    ["github.com/gosom/google-maps-scraper", "must name the engine repository"],
    ["google-maps-scraper", "must name the engine binary"],
    ["worker/vendor/engine.json", "must point at the pin manifest"],
    ["smoke_test.py", "must document the local end-to-end test"],
  ]) {
    if (!readme.includes(needle)) fail("docs", `${README} ${why} (${needle})`);
  }
  if (/GoogleMapScraper|SoCloseSociety/.test(readme)) {
    fail("docs", `${README} still advertises the retired GoogleMapScraper engine`);
  }
  if (!problems.some((problem) => problem.check === "docs")) ok.push("README");
}

// ── report ────────────────────────────────────────────────────────────────────
if (problems.length) {
  console.error("verify-scraper-engine: FAIL\n");
  for (const problem of problems) {
    console.error(`  [${problem.check}] ${problem.detail}`);
  }
  console.error(
    `\n${problems.length} problem(s). The engine pin, worker/Dockerfile, worker/vendor/engine.json, ` +
      "worker/gmaps_engine.py and the docs must agree.",
  );
  process.exit(1);
}

console.log(`verify-scraper-engine: OK — ${ok.length} checks passed (engine pinned, wired and documented).`);
