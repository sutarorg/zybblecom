# syntax=docker/dockerfile:1
FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    CHROME_BIN=/usr/bin/chromium

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       chromium chromium-driver fonts-liberation ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /worker
COPY worker/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY worker/scraper.py worker/email_finder.py worker/worker.py ./

# Only a health check for process liveness; job health is reported through
# /api/worker/heartbeat and visible in /api/ready.
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import os; os.kill(1, 0)" || exit 1

CMD ["python", "worker.py"]
