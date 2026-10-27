"""Runtime settings, read once from the environment.

Secrets never live in the repo. On Cloud Run they arrive as environment variables
mounted from Secret Manager, and a missing one stops the server from starting.
In development a missing key is generated once and kept in `backend/.dev-secrets.json`
(git-ignored), so signed passports and sign-ins survive a restart.
"""

import base64
import json
import logging
import os
import secrets
from dataclasses import dataclass
from pathlib import Path

log = logging.getLogger("shiftsaathi")
DEV_SECRETS = Path(__file__).resolve().parent.parent / ".dev-secrets.json"


def _secret(name: str, nbytes: int, production: bool) -> bytes:
    value = os.getenv(name)
    if not value and production:
        raise RuntimeError(f"{name} is required in production")
    if not value:
        saved = json.loads(DEV_SECRETS.read_text()) if DEV_SECRETS.exists() else {}
        if name not in saved:
            log.warning("%s not set: generating a development key in %s", name, DEV_SECRETS.name)
            saved[name] = base64.b64encode(secrets.token_bytes(nbytes)).decode()
            DEV_SECRETS.write_text(json.dumps(saved, indent=2))
            DEV_SECRETS.chmod(0o600)  # readable by this user only
        value = saved[name]
    raw = base64.b64decode(value)
    if len(raw) != nbytes:
        raise RuntimeError(f"{name} must be {nbytes} bytes, base64-encoded")
    return raw


@dataclass(frozen=True)
class Settings:
    production: bool
    data_key: bytes        # AES-256 key for anonymous feedback
    passport_seed: bytes   # Ed25519 seed for signing skill credentials
    jwt_secret: bytes
    allowed_origins: list[str]
    gemini_api_key: str | None
    gcp_project: str | None
    gcp_location: str
    live_model: str | None
    phonepe_client_id: str | None
    phonepe_client_secret: str | None    # never leaves the server
    phonepe_client_version: str
    phonepe_env: str                     # "sandbox" unless PHONEPE_ENV=production is set on purpose
    phonepe_webhook_user: str | None     # the username and password set on PhonePe's webhook
    phonepe_webhook_password: str | None


def load() -> Settings:
    production = os.getenv("APP_ENV") == "production"
    return Settings(
        production=production,
        data_key=_secret("DATA_KEY", 32, production),
        passport_seed=_secret("PASSPORT_SIGNING_KEY", 32, production),
        jwt_secret=_secret("JWT_SECRET", 32, production),
        allowed_origins=[o for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o],
        gemini_api_key=os.getenv("GEMINI_API_KEY") or None,
        gcp_project=os.getenv("GOOGLE_CLOUD_PROJECT") or None,
        gcp_location=os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1"),
        live_model=os.getenv("LIVE_MODEL") or None,
        phonepe_client_id=os.getenv("PHONEPE_CLIENT_ID") or None,
        phonepe_client_secret=os.getenv("PHONEPE_CLIENT_SECRET") or None,
        phonepe_client_version=os.getenv("PHONEPE_CLIENT_VERSION", "1"),
        phonepe_env="production" if os.getenv("PHONEPE_ENV") == "production" else "sandbox",
        phonepe_webhook_user=os.getenv("PHONEPE_WEBHOOK_USER") or None,
        phonepe_webhook_password=os.getenv("PHONEPE_WEBHOOK_PASSWORD") or None,
    )


settings = load()
