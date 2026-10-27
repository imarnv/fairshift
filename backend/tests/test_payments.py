"""Paying wages through PhonePe, with PhonePe's API replaced by a stand-in so no credentials or network are needed."""

import dataclasses
import hashlib
from datetime import date

import pytest
from fastapi.testclient import TestClient

from app import payments, security, store
from app.main import app
from app.routes import admin

client = TestClient(app)
MONTH = date.today().strftime("%Y-%m")
HOOK_USER, HOOK_PASS = "hook-user", "hook-pass-for-this-run"


class StandIn:
    """Plays PhonePe: hands out payment pages and reports whatever state a test sets."""
    def __init__(self):
        self.sent, self.state, self.amount = [], "PENDING", None

    def __call__(self, method, path, body=None):
        if method == "POST":
            self.sent.append(body)
            return {"orderId": "OMO1", "state": "PENDING", "redirectUrl": "https://mercury-uat.phonepe.com/transact/x"}
        amount = self.amount if self.amount is not None else self.sent[-1]["amount"]
        return {"state": self.state, "amount": amount, "paymentDetails": [{"transactionId": "OM123TXN", "state": self.state}]}


@pytest.fixture(autouse=True)
def phonepe(monkeypatch):
    vars(store.db).update(vars(store.seed()))
    security._failures.clear()
    keys = dataclasses.replace(payments.settings, phonepe_client_id="SANDBOX_ID", phonepe_client_secret="sandbox-secret",
                               phonepe_webhook_user=HOOK_USER, phonepe_webhook_password=HOOK_PASS)
    monkeypatch.setattr(payments, "settings", keys)
    monkeypatch.setattr(admin, "settings", keys)
    fake = StandIn()
    monkeypatch.setattr(payments, "_phonepe", fake)
    return fake


def login(phone: str, pin: str) -> dict:
    return {"Authorization": f"Bearer {client.post('/api/auth/login', json={'phone': phone, 'pin': pin}).json()['token']}"}


@pytest.fixture
def manager():
    return login(store.DEMO_MANAGER_PHONE, store.DEMO_MANAGER_PIN)


def start(manager, worker="w1") -> dict:
    return client.post(f"/api/admin/payroll/{worker}/order", json={"month": MONTH}, headers=manager).json()


def test_payment_amount_comes_from_the_payslip(manager, phonepe):
    row = next(w for w in client.get(f"/api/admin/payroll?month={MONTH}", headers=manager).json()["workers"] if w["id"] == "w1")
    order = start(manager)
    sent = phonepe.sent[0]
    assert sent["amount"] == round(row["net"] * 100) == order["amount"]
    assert order["redirect_url"].startswith("https://mercury-uat.phonepe.com/")
    assert sent["paymentFlow"]["merchantUrls"]["redirectUrl"].endswith(f"admin/?paid={order['order_id']}#payroll")


def test_returning_from_phonepe_checks_the_real_status(manager, phonepe):
    order = start(manager)
    assert client.post(f"/api/admin/payroll/check/{order['order_id']}", headers=manager).json()["status"] == "created"

    phonepe.state = "COMPLETED"
    paid = client.post(f"/api/admin/payroll/check/{order['order_id']}", headers=manager).json()
    assert paid["status"] == "paid" and paid["payment_id"] == "OM123TXN"

    slip = client.get(f"/api/me/payslip?month={MONTH}", headers=login(store.DEMO_WORKER_PHONE, store.DEMO_WORKER_PIN)).json()
    assert slip["payment"]["payment_id"] == "OM123TXN"
    assert client.post("/api/admin/payroll/w1/order", json={"month": MONTH}, headers=manager).status_code == 409


def test_a_completed_payment_for_the_wrong_amount_is_not_accepted(manager, phonepe):
    order = start(manager)
    phonepe.state, phonepe.amount = "COMPLETED", 100
    assert client.post(f"/api/admin/payroll/check/{order['order_id']}", headers=manager).json()["status"] == "created"


def test_webhook_needs_the_dashboard_credentials(manager, phonepe):
    order = start(manager)
    event = {"event": "checkout.order.completed", "payload": {"merchantOrderId": order["order_id"], "state": "COMPLETED",
             "amount": order["amount"], "paymentDetails": [{"transactionId": "OMHOOK1", "state": "COMPLETED"}]}}
    bad = client.post("/api/payments/phonepe/webhook", json=event, headers={"Authorization": "0" * 64})
    assert bad.status_code == 401 and store.db.payments[order["order_id"]].status == "created"

    good = hashlib.sha256(f"{HOOK_USER}:{HOOK_PASS}".encode()).hexdigest()
    assert client.post("/api/payments/phonepe/webhook", json=event, headers={"Authorization": good}).status_code == 200
    assert store.db.payments[order["order_id"]].payment_id == "OMHOOK1"


def test_webhook_url_answers_the_dashboard_check():
    assert client.get("/api/payments/phonepe/webhook").status_code == 200
    assert client.head("/api/payments/phonepe/webhook").status_code == 200


def test_only_managers_can_pay(manager):
    worker = login(store.DEMO_WORKER_PHONE, store.DEMO_WORKER_PIN)
    assert client.post("/api/admin/payroll/w1/order", json={"month": MONTH}, headers=worker).status_code == 403
    assert client.post("/api/admin/payroll/check/SSw1202610abcd1234", headers=worker).status_code == 403


def test_payments_report_when_not_set_up(manager, monkeypatch):
    monkeypatch.setattr(payments, "settings", dataclasses.replace(payments.settings, phonepe_client_secret=None))
    assert client.post("/api/admin/payroll/w1/order", json={"month": MONTH}, headers=manager).status_code == 503
