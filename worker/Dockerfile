FROM python:3.11-slim

# Chromium + driver for Selenium (runs headless inside this container —
# never inside serverless functions).
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    chromium-driver \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /worker
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONUNBUFFERED=1 \
    WORKER_POLL_SECONDS=5

CMD ["python", "worker.py"]
