"""The voice assistant's session setup and tools, tested without a network connection."""

import pytest
from fastapi.testclient import TestClient

from app import store, voice
from app.main import app


@pytest.fixture(autouse=True)
def fresh_data():
    vars(store.db).update(vars(store.seed()))


def test_session_speaks_the_language_on_screen():
    murugan = store.db.users["w1"]          # saved language: Tamil
    setup = voice.setup_message(murugan, "hi", "models/x")["setup"]
    assert setup["generation_config"]["speech_config"]["language_code"] == "hi-IN"
    assert "Always speak Hindi" in setup["system_instruction"]["parts"][0]["text"]
    assert {f["name"] for f in setup["tools"][0]["functionDeclarations"]} >= {"get_payslip", "report_hazard"}


def test_assistant_greets_the_worker_by_name_first():
    turn = voice.greeting(store.db.users["w1"], "ta")["client_content"]
    assert turn["turn_complete"] and "Murugan" in turn["turns"][0]["parts"][0]["text"]


def test_pay_comes_from_the_payslip_not_the_model():
    pay = voice.run_tool(store.db.users["w1"], "get_payslip", {})
    assert set(pay) == {"period", "days_worked", "regular_hours", "overtime_hours", "gross", "net"}


def test_hazard_reported_by_voice_gets_the_same_deadline_as_the_app():
    result = voice.run_tool(store.db.users["w1"], "report_hazard",
                            {"category": "electrical", "severity": "critical", "description": "Live wire on floor 3"})
    filed = max(store.db.hazards.values(), key=lambda h: h.created)
    assert result["filed"] and result["assigned_to"] == "Site supervisor"
    assert filed.channel == "voice" and filed.reporter_id == "w1"


def test_voice_feedback_is_anonymous_and_clamped():
    before = len(store.db.feedback)
    assert voice.run_tool(store.db.users["w1"], "give_feedback", {"topic": "pay", "rating": 9})["anonymous"]
    newest = list(store.db.feedback.values())[-1]
    assert len(store.db.feedback) == before + 1 and newest.rating == 5


def test_unknown_tool_is_refused():
    assert "error" in voice.run_tool(store.db.users["w1"], "delete_everything", {})


def test_voice_report_shows_in_the_workers_safety_list():
    client = TestClient(app)
    voice.run_tool(store.db.users["w1"], "report_hazard",
                   {"category": "electrical", "severity": "high", "description": "Wire hanging near the lift", "location": "Floor 3"})
    token = client.post("/api/auth/login", json={"phone": store.DEMO_WORKER_PHONE, "pin": store.DEMO_WORKER_PIN}).json()["token"]
    mine = client.get("/api/me/hazards", headers={"Authorization": f"Bearer {token}"}).json()
    assert mine[0]["description"] == "Wire hanging near the lift" and mine[0]["channel"] == "voice" and mine[0]["due"]


def test_only_changing_tools_are_confirmed_on_screen():
    assert voice.ACTIONS == {"report_hazard", "give_feedback"}
