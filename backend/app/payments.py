"""Paying a worker's monthly wages through PhonePe (Standard Checkout v2).

    employer ──Pay──► API: amount from the payslip ──► PhonePe payment ──► PhonePe's payment page
    PhonePe ──redirect back──► API asks PhonePe for the order's status ──► marked paid
    PhonePe ──webhook (signed with the dashboard username:password)──► marked paid

The amount always comes from the server's own payslip, never from the browser. The
redirect back proves nothing on its own, since anyone can open that link, so the
server asks PhonePe for the order's real state, and the webhook must carry the
SHA-256 of the configured username:password. A month can only be paid once.

Limit: wages are collected into the merchant account; sending them on to each
worker's bank or UPI needs PhonePe's payouts product. The record kept here is what
that call would use.
"""

import hashlib
import hmac
import json
import secrets
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime

from fastapi import APIRouter, HTTPException, Request, status

from .config import settings
from .store import IST, Payment, User, db

BASES = {  # (OAuth token URL, payments API base) per PhonePe environment
    "sandbox": ("https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token",
                "https://api-preprod.phonepe.com/apis/pg-sandbox"),
    "production": ("https://api.phonepe.com/apis/identity-manager/v1/oauth/token",
                   "https://api.phonepe.com/apis/pg"),
}
router = APIRouter()
_token: dict = {"value": None, "expires": 0.0}


def configured() -> bool:
    return bool(settings.phonepe_client_id and settings.phonepe_client_secret)


def _http(url: str, data: bytes | None, headers: dict, method: str) -> dict:
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        detail = json.loads(e.read() or b"{}").get("message", "PhonePe refused the request.")
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"PhonePe: {detail}") from e
    except (urllib.error.URLError, TimeoutError) as e:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "PhonePe could not be reached. Try again.") from e


def _phonepe(method: str, path: str, body: dict | None = None) -> dict:
    """Calls the payments API, fetching a fresh OAuth token when the cached one is about to expire."""
    token_url, base = BASES[settings.phonepe_env]
    if not _token["value"] or time.time() > _token["expires"] - 60:
        form = urllib.parse.urlencode({"client_id": settings.phonepe_client_id, "client_secret": settings.phonepe_client_secret,
                                       "client_version": settings.phonepe_client_version, "grant_type": "client_credentials"})
        got = _http(token_url, form.encode(), {"Content-Type": "application/x-www-form-urlencoded"}, "POST")
        _token.update(value=got["access_token"], expires=float(got.get("expires_at", time.time() + 900)))
    headers = {"Authorization": f"O-Bearer {_token['value']}", "Content-Type": "application/json"}
    return _http(f"{base}{path}", json.dumps(body).encode() if body is not None else None, headers, method)


def paid_for(worker_id: str, period: str) -> Payment | None:
    return next((p for p in db.payments.values()
                 if p.worker_id == worker_id and p.period == period and p.status == "paid"), None)


def create_order(worker: User, period: str, net_rupees: float, return_to: str) -> tuple[Payment, str]:
    """Starts a PhonePe payment and returns it with the PhonePe page to send the employer to."""
    if not configured():
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Payments are not set up on this server.")
    if paid_for(worker.id, period):
        raise HTTPException(status.HTTP_409_CONFLICT, f"{worker.name} is already paid for {period}.")
    amount = round(net_rupees * 100)
    if amount < 100:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Nothing to pay for this month.")
    order_id = f"SS{worker.id}{period.replace('-', '')}{secrets.token_hex(4)}"
    reply = _phonepe("POST", "/checkout/v2/pay", {
        "merchantOrderId": order_id,
        "amount": amount,
        "expireAfter": 1200,
        "metaInfo": {"udf1": worker.id, "udf2": period},
        "paymentFlow": {"type": "PG_CHECKOUT", "message": f"Wages for {period}: {worker.name}",
                        "merchantUrls": {"redirectUrl": f"{return_to}?paid={order_id}#payroll"}},
    })
    if "redirectUrl" not in reply:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "PhonePe did not return a payment page.")
    payment = Payment(order_id, worker.id, period, amount)
    db.payments[order_id] = payment
    return payment, reply["redirectUrl"]


def _apply(payment: Payment, state: str, amount: int | None, details: list, now) -> Payment:
    """Records PhonePe's verdict. A completed payment must be for exactly the payslip's amount."""
    if payment.status == "paid":
        return payment
    if state == "COMPLETED" and amount == payment.amount_paise:
        done = next((d for d in details if d.get("state") == "COMPLETED"), details[0] if details else {})
        payment.status, payment.payment_id, payment.paid_at = "paid", done.get("transactionId"), now
    elif state == "FAILED":
        payment.status = "failed"
    return payment


def check(order_id: str, now) -> Payment:
    """Asks PhonePe for the order's real state, after the employer returns from PhonePe's page."""
    payment = db.payments.get(order_id)
    if not payment:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such payment order.")
    if payment.status == "paid" or not configured():
        return payment
    order = _phonepe("GET", f"/checkout/v2/order/{order_id}/status")
    return _apply(payment, order.get("state", ""), order.get("amount"), order.get("paymentDetails", []), now)


def webhook_authorized(header: str | None) -> bool:
    """PhonePe sends SHA-256 of the username:password set on the dashboard's webhook."""
    user, password = settings.phonepe_webhook_user, settings.phonepe_webhook_password
    if not (user and password and header):
        return False
    expected = hashlib.sha256(f"{user}:{password}".encode()).hexdigest()
    return hmac.compare_digest(expected, header.removeprefix("SHA256 ").strip().lower())


@router.api_route("/api/payments/phonepe/webhook", methods=["GET", "HEAD"])
def phonepe_webhook_reachable() -> dict:
    """PhonePe's dashboard checks the URL answers before saving the webhook. Changes nothing."""
    return {"ok": True}


@router.post("/api/payments/phonepe/webhook")
async def phonepe_webhook(request: Request) -> dict:
    if not webhook_authorized(request.headers.get("authorization")):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Webhook signature did not match.")
    event = await request.json()
    payload = event.get("payload", {})
    payment = db.payments.get(str(payload.get("merchantOrderId", "")))
    if payment and event.get("event", "").startswith("checkout.order."):
        _apply(payment, payload.get("state", ""), payload.get("amount"), payload.get("paymentDetails", []), datetime.now(IST))
    return {"ok": True}   # always acknowledge, so PhonePe does not retry an order we do not know


def view(payment: Payment | None) -> dict | None:
    if not payment:
        return None
    return {"status": payment.status, "amount": payment.amount_paise / 100, "payment_id": payment.payment_id,
            "paid_at": payment.paid_at.isoformat() if payment.paid_at else None}
