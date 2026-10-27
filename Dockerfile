# One container for Cloud Run: the API, the voice socket and the web app on one origin.

# 1. Build the web app into static files.
FROM node:22-slim AS web
WORKDIR /web
ENV NEXT_TELEMETRY_DISABLED=1
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
# Only set these when the web app is hosted apart from the API (e.g. on Vercel).
ARG NEXT_PUBLIC_API_BASE=""
ARG NEXT_PUBLIC_VOICE_WS_URL=""
RUN npx next build

# 2. Run the API and serve the built pages from it.
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 APP_ENV=production
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/app ./app
COPY --from=web /web/out ./static
RUN useradd --uid 10001 --no-create-home app
USER app
# Cloud Run sets $PORT; --proxy-headers trusts its load balancer for the client's scheme and IP.
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --proxy-headers --forwarded-allow-ips='*'
