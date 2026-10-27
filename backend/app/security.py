"""Sign-in with phone number and 4-digit PIN, and role checks on every route.

A PIN suits workers who find passwords hard and share basic phones. To make up for
a short secret, PINs are hashed with scrypt and a number is locked for 5 minutes
after 5 wrong tries.
"""

import time
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import settings
from .store import User, check_pin, db

TOKEN_TTL = timedelta(hours=12)
MAX_FAILURES, LOCKOUT_S = 5, 300

_failures: dict[str, tuple[int, float]] = {}  # phone -> (count, first failure time)
_bearer = HTTPBearer(auto_error=False)


def authenticate(phone: str, pin: str) -> User:
    count, since = _failures.get(phone, (0, 0.0))
    if count >= MAX_FAILURES and time.monotonic() - since < LOCKOUT_S:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many attempts. Try again in 5 minutes.")
    user = db.user_by_phone(phone)
    if not user or not check_pin(pin, user.pin_hash):
        _failures[phone] = (count + 1, since if count else time.monotonic())
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Phone number or PIN is wrong.")
    _failures.pop(phone, None)
    return user


def issue_token(user: User) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode({"sub": user.id, "role": user.role, "iat": now, "exp": now + TOKEN_TTL},
                      settings.jwt_secret, algorithm="HS256")


def user_from_token(token: str) -> User | None:
    try:
        claims = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None
    return db.users.get(claims["sub"])


def current_user(creds: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> User:
    user = user_from_token(creds.credentials) if creds else None
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sign in again.")
    return user


def require(role: str):
    def check(user: User = Depends(current_user)) -> User:
        if user.role != role:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not allowed for this account.")
        return user
    return check
