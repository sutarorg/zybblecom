# syntax=docker/dockerfile:1

FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive

# Chromium + driver for Selenium (runs headless inside this container —
# never inside serverless functions).
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       chromium \
       chromium-driver \
       fonts-liberation \
       ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /worker
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY scraper.py email_finder.py worker.py ./

ENV PYTHONUNBUFFERED=1 \
    WORKER_POLL_SECONDS=5 \
    CHROME_BIN=/usr/bin/chromium

CMD ["python", "worker.py"]
