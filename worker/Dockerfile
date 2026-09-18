# syntax=docker/dockerfile:1
#
# Zybble Lead Finder worker image.
#
#   1. engine-builder   builds the pinned gosom/google-maps-scraper Go binary
#                       from source (tag + commit verified against the clone)
#   2. playwright-deps  installs the Chromium build the engine drives
#   3. runtime          Debian slim + Python worker + engine + browsers
#
# The version pins below are duplicated in worker/vendor/engine.json on purpose:
# `npm run verify:engine` (and CI) fail the build if the two ever drift apart.

ARG GO_VERSION=1.27.1
ARG GMS_VERSION=v1.18.0
ARG GMS_COMMIT=2b8616d0ccf7d3c578b42a7440e3c13bb22e5083
ARG GMS_REPO=https://github.com/gosom/google-maps-scraper.git
ARG PLAYWRIGHT_GO_VERSION=v0.6100.0

# ————————————————————————————————————————————————————————————
# 1. The scraping engine (Go, static, no CGO)
# ————————————————————————————————————————————————————————————
FROM golang:${GO_VERSION}-trixie AS engine-builder

ARG GMS_VERSION
ARG GMS_COMMIT
ARG GMS_REPO

RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src
RUN git clone --depth 1 --branch "${GMS_VERSION}" "${GMS_REPO}" google-maps-scraper

WORKDIR /src/google-maps-scraper
# Never build anything but the pinned commit: a moved tag must fail the build,
# not silently ship a different scraper.
RUN actual="$(git rev-parse HEAD)" \
    && if [ "${actual}" != "${GMS_COMMIT}" ]; then \
         echo "engine pin mismatch: ${GMS_VERSION} is ${actual}, expected ${GMS_COMMIT}" >&2; \
         echo "update worker/vendor/engine.json and ARG GMS_COMMIT together" >&2; \
         exit 1; \
       fi \
    && git config --global --add safe.directory /src/google-maps-scraper

ENV CGO_ENABLED=0 \
    GOOS=linux
RUN go build -trimpath -ldflags="-w -s" -o /out/google-maps-scraper . \
    && ls -l /out/google-maps-scraper

# ————————————————————————————————————————————————————————————
# 2. Playwright Chromium (same recipe as the upstream image)
# ————————————————————————————————————————————————————————————
FROM golang:${GO_VERSION}-trixie AS playwright-deps

ARG PLAYWRIGHT_GO_VERSION

ENV PLAYWRIGHT_BROWSERS_PATH=/opt/browsers \
    PLAYWRIGHT_DRIVER_PATH=/opt/ms-playwright-go

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && go install github.com/mxschmitt/playwright-go/cmd/playwright@${PLAYWRIGHT_GO_VERSION} \
    && mkdir -p /opt/browsers \
    && playwright install chromium --with-deps

# ————————————————————————————————————————————————————————————
# 3. Runtime: Python worker + engine + browsers
# ————————————————————————————————————————————————————————————
FROM debian:trixie-slim AS runtime

# Upstream telemetry is off, always: Zybble never reports usage to a third party.
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    DISABLE_TELEMETRY=1 \
    PLAYWRIGHT_BROWSERS_PATH=/opt/browsers \
    PLAYWRIGHT_DRIVER_PATH=/opt/ms-playwright-go \
    GOOGLE_MAPS_SCRAPER_BIN=/usr/local/bin/google-maps-scraper \
    VIRTUAL_ENV=/opt/venv \
    PATH="/opt/venv/bin:${PATH}"

# The browser libraries are the set upstream's own image installs; python3 +
# venv run the Zybble worker, and procps keeps `kill`/`ps` available for the
# engine's process-group teardown.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ca-certificates \
       python3 python3-pip python3-venv \
       procps \
       fonts-liberation \
       libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
       libdbus-1-3 libxkbcommon0 libatspi2.0-0 libx11-6 libxcomposite1 \
       libxdamage1 libxext6 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 \
       libcairo2 libasound2 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY --from=playwright-deps /opt/browsers /opt/browsers
COPY --from=playwright-deps /opt/ms-playwright-go /opt/ms-playwright-go
COPY --from=engine-builder /out/google-maps-scraper /usr/local/bin/google-maps-scraper

RUN chmod -R 0755 /opt/browsers /opt/ms-playwright-go \
    && chmod 0755 /usr/local/bin/google-maps-scraper

WORKDIR /worker

COPY worker/requirements.txt ./
RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

# The worker: engine adapter, coverage planner, filters, email finder, queue
# consumer, the local smoke test and the offline suite (the suite is also the
# build-time gate below, and lets an operator debug inside a running container).
COPY worker/*.py ./
COPY worker/tests ./tests/
COPY worker/vendor ./vendor/

# Fail the build — not the first production search — if the engine cannot run in
# this image, if a worker module cannot be imported, or if the offline end-to-end
# path (subprocess → streamed JSONL → dedupe → filters → lead payload) is broken.
# The env values here exist only so `import worker` can run at build time; the
# real ones come from Railway.
RUN google-maps-scraper -version \
    && python -c "import coverage, email_finder, filters, gmaps_engine, scraper; binary = gmaps_engine.find_binary(); assert binary, 'google-maps-scraper not found by the adapter'; print('engine:', binary, gmaps_engine.GosomEngine(binary=binary).version()); print('pin:', gmaps_engine.upstream_pin().get('version'))" \
    && ZYBBLE_APP_URL=https://build.invalid SCRAPER_WORKER_SECRET=build-time-check \
       python -c "import worker; print('worker module OK', worker.engine_label({'available': True}))" \
    && python smoke_test.py --simulate "gym" "Delhi" 5 --max-tiles 4 --targets-per-run 2

# Process liveness only; job health is reported through /api/worker/heartbeat
# and is visible in /api/ready.
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD python -c "import os, sys; os.kill(1, 0); sys.exit(0 if os.path.exists(os.environ.get('GOOGLE_MAPS_SCRAPER_BIN', '/usr/local/bin/google-maps-scraper')) else 1)" || exit 1

CMD ["python", "worker.py"]
