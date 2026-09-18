# Upstream engine — gosom/google-maps-scraper

Zybble's Lead Finder discovers businesses with the open-source scraper
**[gosom/google-maps-scraper](https://github.com/gosom/google-maps-scraper)**
(MIT, © 2023 Georgios Komninos — see `LICENSE-google-maps-scraper.txt` beside
this file). It drives a real Chromium browser through the public Google Maps UI
with Playwright and needs **no Google Maps API key**.

| | |
| --- | --- |
| Repository | https://github.com/gosom/google-maps-scraper |
| Pinned tag | `v1.18.0` |
| Pinned commit | `2b8616d0ccf7d3c578b42a7440e3c13bb22e5083` |
| License | MIT |
| Language | Go 1.27 (browser automation via `mxschmitt/playwright-go`) |
| Binary | `google-maps-scraper`, installed at `/usr/local/bin/google-maps-scraper` |
| Pin manifest | `engine.json` (single source of truth for the version, commit and flags) |

The pin is recorded once, in `engine.json`. `worker/Dockerfile` builds that exact
tag from source and refuses to continue if the checked-out commit differs, and
`scripts/verify-scraper-engine.mjs` (part of `npm test` and CI) fails if the
Dockerfile build args and `engine.json` ever drift apart.

## How Zybble calls it

The engine is a child process of the Python worker — one invocation per batch of
Google Maps viewports:

```bash
google-maps-scraper \
  -input  /tmp/zybble-gms-*/queries.txt \
  -results /tmp/zybble-gms-*/results.jsonl \
  -json \
  -c 2 -depth 4 -lang en \
  -browser-pool-size 1 -pages-per-browser 2 \
  -exit-on-inactivity 3m
```

`queries.txt` holds one line per coverage target, using upstream's custom-input-id
syntax so every result can be attributed to the viewport that found it:

```text
https://www.google.com/maps/search/gym+in+Delhi/@28.613900,77.209000,12.14z#!#t0
https://www.google.com/maps/search/gym+near+Delhi/@28.530000,77.290000,12.14z#!#t1
```

`results.jsonl` is one `gmaps.Entry` JSON object per line. Zybble **tails that
file while the engine is still running**, so leads are stored, counters updated
and progress reported per business instead of at the end of a sweep
(`worker/gmaps_engine.py`).

`DISABLE_TELEMETRY=1` is always set: upstream ships optional PostHog telemetry
and Zybble never sends usage data to a third party.

## What Zybble adds around it

Upstream is a CLI that turns keywords into a file. Everything that makes Lead
Finder a product stays in Zybble's own code and is deliberately *not* delegated
to the engine:

| Concern | Where | Why not the engine |
| --- | --- | --- |
| Area coverage (Nominatim geocode → viewport tiles, centre-out, query variants) | `worker/coverage.py` | Upstream's `-grid-bbox` needs a bounding box Zybble already computes, and Zybble's plan is serialised into the job so a slice can resume mid-sweep |
| Resumable cursor, crash-safe batches | `worker/scraper.py` (`ScrapeState`) | Upstream's `-resume` is file-scoped; Zybble resumes through the API and Supabase |
| Deduplication across viewports, variants and slices | `worker/scraper.py` (`place_key`) | Must match `dedupeKeyFor` in `api/_lib/routes-worker.ts` exactly |
| Professional lead filters | `worker/filters.py` + `api/_lib/filters.ts` | Applied twice: while scraping and again server-side |
| Email discovery + DNS MX verification, SSRF-guarded | `worker/email_finder.py` | See below |
| Time budget, process-group kill, error taxonomy, counters | `worker/gmaps_engine.py` | A stuck browser must never orphan a Chromium process on Railway |

### Why `-email` is off by default

Upstream can crawl each business website for addresses (`-email`). Zybble's own
finder already does that with two things upstream does not: an SSRF guard on
every redirect hop, and DNS MX verification that separates `verified` /
`risky` / `invalid`. So the engine's addresses are treated as **candidates**:
set `SCRAPER_ENGINE_EXTRACT_EMAIL=1` and they are handed to
`email_finder.verify_candidate_emails()`, which validates syntax and MX before
anything is stored — and are used only when Zybble's own scan finds nothing.
Nothing is ever invented, and an unverifiable address stays `unknown`.

## Updating the engine

1. Pick the new upstream tag and its commit:
   `git ls-remote --tags https://github.com/gosom/google-maps-scraper.git`
2. Update `version` + `commit` in `engine.json` (beside this file).
3. Update `ARG GMS_VERSION` / `ARG GMS_COMMIT` in `worker/Dockerfile`
   (or just run `npm run verify:engine` — it reports the mismatch).
4. Check upstream's `runner/runner.go` for flag changes; `build_argv()` in
   `worker/gmaps_engine.py` is the only place flags are assembled, and
   `worker/tests/test_engine.py` asserts the exact invocation.
5. Run `python worker/run_tests.py`, then
   `python worker/smoke_test.py "dentists" "Austin, Texas" 5` against real
   Google Maps before deploying.

## Legal

Scraping Google Maps may conflict with Google's Terms of Service; the upstream
project carries the same warning. Zybble uses the engine only for public
business research, never bypasses a CAPTCHA or access control (a challenge is
reported and the job retries later), and rate-limits itself through bounded
concurrency and scroll depth. Obtain legal advice for your jurisdiction and
scale.
