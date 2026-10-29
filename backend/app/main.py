"""ShiftSaathi API. Serves the JSON API, the voice socket and the built web app from one origin."""

import logging
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from . import payments, voice
from .config import settings
from .routes import admin, worker

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("shiftsaathi")

app = FastAPI(title="ShiftSaathi", docs_url=None if settings.production else "/docs", redoc_url=None)
app.include_router(worker.router)
app.include_router(admin.router)
app.include_router(voice.router)
app.include_router(payments.router)

if settings.allowed_origins:  # only for local dev, where the web app runs on another port
    app.add_middleware(CORSMiddleware, allow_origins=settings.allowed_origins,
                       allow_methods=["*"], allow_headers=["Authorization", "Content-Type"])

SECURITY_HEADERS = {
    "Content-Security-Policy": ("default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; "
                                "img-src 'self' data: blob:; connect-src 'self' wss: ws:; media-src 'self' blob:; "
                                "frame-ancestors 'none'"),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(self), microphone=(self), geolocation=(self)",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
}


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.update(SECURITY_HEADERS)
    path = request.url.path
    if path.startswith("/api"):
        response.headers["Cache-Control"] = "no-store"
    elif path.startswith("/_next/static/"):  # file names carry a content hash, so they never change
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    else:  # pages: always check for a newer release
        response.headers["Cache-Control"] = "no-cache"
    return response


@app.exception_handler(Exception)
async def unexpected_error(request: Request, exc: Exception) -> JSONResponse:
    """Any error a route did not expect: log the trace, show the client a plain message, never the details."""
    log.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse({"detail": "Something went wrong on our side. Please try again."}, status_code=500)


@app.get("/health")  # not /healthz: Cloud Run reserves paths ending in "z"
def health() -> dict:
    return {"ok": True}


# The exported Next.js app, copied in by the Dockerfile. Mounted last so it never shadows /api.
STATIC = Path(__file__).resolve().parent.parent / "static"
if STATIC.is_dir():
    app.mount("/", StaticFiles(directory=STATIC, html=True), name="web")
