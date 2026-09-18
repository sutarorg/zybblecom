# syntax=docker/dockerfile:1
FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    CHROME_BIN=/usr/bin/chromium \
    CHROMIUM_FLAGS="--no-sandbox --disable-dev-shm-usage"

# Chromium needs its full dependency tree in slim images — a missing lib
# is the most common cause of the DevToolsActivePort crash. Installing the
# complete set keeps the browser launch reliable on Railway.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       chromium chromium-driver \
       fonts-liberation ca-certificates \
       libasound2 libatk-bridge2.0-0 libatk1.0-0 libatspi2.0-0 \
       libcups2 libdbus-1-3 libdrm2 libgbm1 libgtk-3-0 \
       libnspr4 libnss3 libxcomposite1 libxdamage1 libxfixes3 \
       libxrandr2 libxkbcommon0 libxshmfence1 libxcursor1 libxi6 \
       libxtst6 libpango-1.0-0 libcairo2 libxss1 libxtst6 \
       libappindicator3-1 libcurl4 libudev1 lsb-release wget xdg-utils \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && chmod 1777 /tmp \
    && mkdir -p /tmp/chrome-user-data \
    && chmod 777 /tmp/chrome-user-data

WORKDIR /worker
COPY worker/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# worker/vendor holds the vendored GoogleMapScraper core (MIT) used by scraper.py.
COPY worker/vendor ./vendor/
COPY worker/coverage.py worker/filters.py worker/scraper.py worker/email_finder.py worker/worker.py worker/smoke_test.py ./

# Only a health check for process liveness; job health is reported through
# /api/worker/heartbeat and visible in /api/ready.
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import os; os.kill(1, 0)" || exit 1

CMD ["python", "worker.py"]
