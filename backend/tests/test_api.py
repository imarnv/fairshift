"""End to end through HTTP: sign-in, role checks, and each worker and manager flow."""

import pytest
from fastapi.testclient import TestClient

from app import security, store
from app.main import app
from app.store import DEMO_MANAGER_PHONE, DEMO_MANAGER_PIN, DEMO_WORKER_PHONE, DEMO_WORKER_PIN

client = TestClient(app)


@pytest.fixture(autouse=True)
def fresh_data():
    """Each test starts from the demo seed, so tests never depend on each other."""
    vars(store.db).update(vars(store.seed()))
    security._failures.clear()
    return store.db


def login(phone: str, pin: str) -> dict:
    token = client.post("/api/auth/login", json={"phone": phone, "pin": pin}).json()["token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def worker():
    return login(DEMO_WORKER_PHONE, DEMO_WORKER_PIN)


@pytest.fixture
def manager():
    return login(DEMO_MANAGER_PHONE, DEMO_MANAGER_PIN)


def test_wrong_pin_is_rejected_then_locked_out():
    for _ in range(security.MAX_FAILURES):
        assert client.post("/api/auth/login", json={"phone": DEMO_WORKER_PHONE, "pin": "0000"}).status_code == 401
    right = client.post("/api/auth/login", json={"phone": DEMO_WORKER_PHONE, "pin": DEMO_WORKER_PIN})
    assert right.status_code == 429


def test_malformed_login_is_rejected():
    assert client.post("/api/auth/login", json={"phone": "12", "pin": "abcd"}).status_code == 422


def test_routes_need_a_token():
    assert client.get("/api/me").status_code == 401
    assert client.get("/api/me", headers={"Authorization": "Bearer forged"}).status_code == 401


def test_worker_cannot_open_the_dashboard(worker):
    assert client.get("/api/admin/overview", headers=worker).status_code == 403


def test_check_in_needs_the_site_code_and_presence(worker):
    assert client.post("/api/shifts/check-in", json={"code": "WRONG"}, headers=worker).status_code == 422
    far = {"code": "SKY-7Q2", "lat": 28.61, "lng": 77.21}  # Delhi, not Chennai
    assert client.post("/api/shifts/check-in", json=far, headers=worker).status_code == 422
    near = {"code": "sky-7q2", "lat": 13.0419, "lng": 80.2342}
    assert client.post("/api/shifts/check-in", json=near, headers=worker).status_code == 201
    assert client.post("/api/shifts/check-in", json=near, headers=worker).status_code == 409
    manager = login(DEMO_MANAGER_PHONE, DEMO_MANAGER_PIN)
    me = next(w for w in client.get("/api/admin/workers", headers=manager).json() if w["id"] == "w1")
    assert me["checked_in"] and me["on_site_since"]
    assert client.post("/api/shifts/check-out", headers=worker).status_code == 200


def test_payslip_and_wellbeing(worker):
    slip = client.get("/api/me/payslip", headers=worker).json()
    assert {line["key"] for line in slip["lines"]} == {"basic", "overtime", "pf", "esi"}
    assert client.get("/api/me/payslip?month=2026-13", headers=worker).status_code == 422
    # the demo worker is seeded with 7-day weeks of 12-hour shifts
    assert client.get("/api/me/wellbeing", headers=worker).json()["level"] == "high"


def test_anonymous_hazard_hides_the_reporter(worker, manager):
    body = {"category": "fire", "severity": "critical", "description": "Gas cylinder leaking", "anonymous": True}
    created = client.post("/api/hazards", json=body, headers=worker).json()
    assert created["reporter"] == "Anonymous" and created["assigned_to"] == "Site supervisor"
    queue = client.get("/api/admin/hazards", headers=manager).json()
    assert any(h["id"] == created["id"] and h["reporter"] == "Anonymous" for h in queue)

    done = client.patch(f"/api/admin/hazards/{created['id']}", json={"status": "resolved"}, headers=manager).json()
    assert done["status"] == "resolved" and done["met_deadline"]

    # the reporter can still follow it, and sees the manager's update
    mine = client.get("/api/me/hazards", headers=worker).json()
    assert mine[0]["id"] == created["id"] and mine[0]["status"] == "resolved"
    other = login("9000000002", DEMO_WORKER_PIN)
    assert created["id"] not in {h["id"] for h in client.get("/api/me/hazards", headers=other).json()}
    assert "reporter_tag" not in str(queue)


def test_feedback_is_stored_encrypted(worker, fresh_data):
    client.post("/api/feedback", json={"topic": "pay", "rating": 2, "comment": "OT missing"}, headers=worker)
    stored = list(fresh_data.feedback.values())[-1]
    assert "OT missing" not in stored.sealed_comment
    assert not hasattr(stored, "worker_id")


def test_one_worker_cannot_unlock_feedback_alone(manager):
    deepa = login("9000000017", DEMO_WORKER_PIN)     # Riverside College, which has 3 of 5 people
    for _ in range(4):
        client.post("/api/feedback", json={"topic": "pay", "rating": 1, "comment": "spam"}, headers=deepa)
    groups = {g["site_id"]: g for g in client.get("/api/admin/feedback", headers=manager).json()}
    assert groups["s3"]["hidden"] and groups["s3"]["people"] == 4

    client.post("/api/feedback", json={"topic": "pay", "rating": 3}, headers=login("9000000018", DEMO_WORKER_PIN))
    groups = {g["site_id"]: g for g in client.get("/api/admin/feedback", headers=manager).json()}
    assert not groups["s3"]["hidden"]


def test_dashboard_withholds_small_feedback_groups(manager):
    groups = {g["site_id"]: g for g in client.get("/api/admin/feedback", headers=manager).json()}
    assert groups["s3"]["hidden"]                # 3 responses
    assert not groups["s1"]["hidden"] and groups["s1"]["comments"]


def test_overview_covers_every_sector(manager):
    overview = client.get("/api/admin/overview", headers=manager).json()
    assert {s["sector"] for s in overview["sites"]} == {"construction", "hospital", "education", "factory"}
    assert overview["fatigue_high"] > 0 and overview["overdue_hazards"] > 0
    assert len(overview["daily_hours"]) == 14 and sum(d["hours"] for d in overview["daily_hours"]) > 0


def test_endorsed_skill_verifies_publicly(manager):
    token = client.post("/api/admin/workers/w2/credentials", json={"skill": "Scaffold erection"},
                        headers=manager).json()["token"]
    check = client.post("/api/passport/verify", json={"token": token}).json()
    assert check["valid"] and check["claims"]["name"] == "Ramesh Yadav"
    assert not client.post("/api/passport/verify", json={"token": token[:-4] + "AAAA"}).json()["valid"]


def test_responses_carry_security_headers():
    headers = client.get("/health").headers
    assert headers["X-Content-Type-Options"] == "nosniff"
    assert "frame-ancestors 'none'" in headers["Content-Security-Policy"]


def test_unexpected_errors_return_a_plain_500(worker, monkeypatch):
    def broken(_user):
        raise ValueError("internal detail")
    monkeypatch.setattr("app.routes.worker.services.fatigue_for", broken)
    r = TestClient(app, raise_server_exceptions=False).get("/api/me/wellbeing", headers=worker)
    assert r.status_code == 500
    assert "internal detail" not in r.text and r.json()["detail"]
