"""Voice assistant: the browser streams speech, Gemini Live answers in the worker's language.

    browser ──PCM 16 kHz──► /ws/voice ──► Gemini Live (speech-to-text, reasoning, speech)
    browser ◄──PCM 24 kHz── /ws/voice ◄──┘   └─ tool calls ─► services (pay, hours, hazards)

A slimmed-down version of the Eloquent voice bridge. Gemini handles voice-activity
detection, transcription and speech itself, so this module only forwards audio and
runs tool calls. Facts like pay and hours always come from a tool, never from the
model's memory.

It connects with GEMINI_API_KEY (mounted from Secret Manager on Cloud Run, never in
the code) when one is set, as the Eloquent bridge does; otherwise it signs in to
Vertex AI as the service's own identity, with no key at all.

The worker's language comes in with the first message, taken from the app at the
moment they tap the mic, so the assistant greets and answers in the language on
their screen rather than the one saved at sign-in.
"""

import asyncio
import json
import logging

import websockets
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from . import services
from .config import settings
from .security import user_from_token
from .store import User, db

log = logging.getLogger("shiftsaathi.voice")
router = APIRouter()

LANG_NAMES = {"en": "English", "hi": "Hindi", "ta": "Tamil", "te": "Telugu", "kn": "Kannada"}
VERTEX_MODEL, STUDIO_MODEL = "gemini-live-2.5-flash-native-audio", "gemini-3.1-flash-live-preview"
VOICE = "Kore"  # the Eloquent bridge's default voice
ACTIONS = {"report_hazard", "give_feedback"}  # tools that change something, confirmed on screen

TOOLS = [{"functionDeclarations": [
    {"name": "get_payslip", "description": "This month's pay: hours, overtime, deductions and take-home."},
    {"name": "get_wellbeing", "description": "Hours worked in the last 7 days and any fatigue warnings."},
    {"name": "list_my_reports", "description": "Status of safety reports this worker has filed."},
    {"name": "report_hazard",
     "description": "File a safety hazard. Confirm what, where and how dangerous it is with the worker first.",
     "parameters": {"type": "OBJECT", "required": ["category", "severity", "description"], "properties": {
         "category": {"type": "STRING", "enum": ["fall", "electrical", "fire", "chemical", "biohazard",
                                                  "equipment", "ergonomic", "other"]},
         "severity": {"type": "STRING", "enum": ["low", "medium", "high", "critical"]},
         "description": {"type": "STRING", "description": "What the hazard is, in English."},
         "location": {"type": "STRING", "description": "Where on site, in English."},
         "anonymous": {"type": "BOOLEAN", "description": "True if the worker does not want their name on it."}}}},
    {"name": "give_feedback",
     "description": "Record anonymous feedback about a manager, pay, safety or working conditions.",
     "parameters": {"type": "OBJECT", "required": ["topic", "rating"], "properties": {
         "topic": {"type": "STRING", "enum": ["manager", "conditions", "pay", "safety"]},
         "rating": {"type": "INTEGER", "description": "1 (very bad) to 5 (very good)."},
         "comment": {"type": "STRING"}}}},
]}]


def system_prompt(w: User, lang: str) -> str:
    site = db.sites[w.site_id]
    return (
        f"You are ShiftSaathi, a warm, patient helper for {w.name}, a {w.trade} at {site.name} "
        f"({site.sector}). Always speak {LANG_NAMES[lang]}, the language on the worker's screen; "
        "only change language if the worker clearly starts speaking another one. "
        "Many workers read little, so use short sentences and everyday words, and say amounts in rupees. "
        "Always use a tool for pay, hours or report status; never guess a number, and mention only "
        "what the tool returned (there are no bonuses or allowances unless a tool lists them). "
        "To report a hazard, work out the category and severity yourself from what the worker says "
        "(anything that could injure someone now is high, anything that could kill is critical); never ask them "
        "to choose. Ask only for what is missing, usually where it is. Read the report back in one short "
        "sentence and file it as soon as they agree, with their name unless they ask to stay anonymous. "
        "For feedback, work out the topic, ask for a 1 to 5 rating only if they gave none, read it back once and "
        "send it. Feedback is always anonymous: say so, because workers fear being identified. "
        "If anyone is in immediate danger, tell them to move away and call 112 before anything else."
    )


def run_tool(w: User, name: str, args: dict) -> dict:
    t = services.now()
    if name == "get_payslip":
        slip = services.payslip_for(w, t.year, t.month)
        return {k: slip[k] for k in ("period", "days_worked", "regular_hours", "overtime_hours", "gross", "net")}
    if name == "get_wellbeing":
        return services.fatigue_for(w)
    if name == "list_my_reports":
        mine = [services.hazard_view(h) for h in services.reports_by(w)]
        return {"reports": [{k: v[k] for k in ("description", "status", "overdue", "assigned_to")} for v in mine]}
    if name == "report_hazard":
        h = services.report_hazard(w, args["category"], args["severity"], args["description"][:500],
                                   str(args.get("location", ""))[:120], bool(args.get("anonymous")), "voice")
        v = services.hazard_view(h)
        return {"filed": True, "deadline": v["due"], "assigned_to": v["assigned_to"]}
    if name == "give_feedback":
        services.submit_feedback(w, args["topic"], max(1, min(5, int(args["rating"]))), args.get("comment"))
        return {"saved": True, "anonymous": True}
    return {"error": f"unknown tool {name}"}


async def _live_target() -> tuple[str, dict | None, str]:
    """(url, headers, model): the Gemini API with a key when one is set, else Vertex AI."""
    if settings.gemini_api_key:
        return ("wss://generativelanguage.googleapis.com/ws/"
                f"google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key={settings.gemini_api_key}",
                None, f"models/{settings.live_model or STUDIO_MODEL}")
    if settings.gcp_project:
        import google.auth
        import google.auth.transport.requests

        def token() -> str:
            creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
            creds.refresh(google.auth.transport.requests.Request())
            return creds.token

        loc = settings.gcp_location
        model = settings.live_model or VERTEX_MODEL
        return (f"wss://{loc}-aiplatform.googleapis.com/ws/"
                "google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent",
                {"Authorization": f"Bearer {await asyncio.to_thread(token)}"},
                f"projects/{settings.gcp_project}/locations/{loc}/publishers/google/models/{model}")
    raise RuntimeError("voice is not configured: set GEMINI_API_KEY or GOOGLE_CLOUD_PROJECT")


def setup_message(w: User, lang: str, model: str) -> dict:
    """The session's opening config: voice and language, the worker's context, and the tools."""
    return {"setup": {
        "model": model,
        "generation_config": {
            "response_modalities": ["AUDIO"],
            "speech_config": {"voice_config": {"prebuilt_voice_config": {"voice_name": VOICE}},
                              "language_code": f"{lang}-IN"},
        },
        "system_instruction": {"parts": [{"text": system_prompt(w, lang)}]},
        "tools": TOOLS,
        "input_audio_transcription": {},
        "output_audio_transcription": {},
    }}


def greeting(w: User, lang: str) -> dict:
    """A text turn that makes the assistant speak first, so the worker hears it is ready."""
    return {"client_content": {"turns": [{"role": "user", "parts": [{"text":
        f"The worker just opened the assistant. In {LANG_NAMES[lang]}, greet {w.name.split()[0]} by name "
        "in one short sentence and ask how you can help with pay, hours or safety."}]}], "turn_complete": True}}


async def _browser_to_gemini(ws: WebSocket, gemini) -> None:
    while True:
        msg = await ws.receive_json()
        if msg.get("type") == "audio" and isinstance(msg.get("data"), str):
            await gemini.send(json.dumps({"realtime_input": {
                "audio": {"data": msg["data"], "mimeType": "audio/pcm;rate=16000"}}}))


async def _gemini_to_browser(ws: WebSocket, gemini, w: User) -> None:
    async for raw in gemini:
        data = json.loads(raw)
        if sc := data.get("serverContent"):
            for part in sc.get("modelTurn", {}).get("parts", []):
                if "inlineData" in part:
                    await ws.send_json({"type": "audio", "data": part["inlineData"]["data"]})
            for key, role in (("inputTranscription", "user"), ("outputTranscription", "assistant")):
                if text := sc.get(key, {}).get("text"):
                    await ws.send_json({"type": "transcript", "role": role, "text": text})
            if sc.get("interrupted"):
                await ws.send_json({"type": "clear"})  # barge-in: drop queued audio
        elif call := data.get("toolCall"):
            responses = []
            for fc in call.get("functionCalls", []):
                try:
                    result = run_tool(w, fc["name"], fc.get("args") or {})
                except (KeyError, ValueError, TypeError) as e:
                    result = {"error": f"bad arguments: {e}"}
                responses.append({"id": fc.get("id"), "name": fc["name"], "response": {"result": result}})
                if fc["name"] in ACTIONS and "error" not in result:
                    # shown on screen, so the worker sees the report or feedback really went through
                    await ws.send_json({"type": "action", "name": fc["name"], "result": result})
            await gemini.send(json.dumps({"tool_response": {"function_responses": responses}}))


@router.websocket("/ws/voice")
async def voice(ws: WebSocket) -> None:
    await ws.accept()
    # The token comes in the first message, not the URL, so it never lands in access logs.
    try:
        hello = await asyncio.wait_for(ws.receive_json(), timeout=10)
    except (asyncio.TimeoutError, WebSocketDisconnect, ValueError):
        await ws.close(code=4401)
        return
    w = user_from_token(str(hello.get("token", "")))
    if not w or w.role != "worker":
        await ws.close(code=4401)
        return
    lang = hello.get("lang") if hello.get("lang") in LANG_NAMES else w.lang

    try:
        url, headers, model = await _live_target()
        async with websockets.connect(url, additional_headers=headers, close_timeout=1) as gemini:
            await gemini.send(json.dumps(setup_message(w, lang, model)))
            await asyncio.wait_for(gemini.recv(), timeout=10)  # setupComplete
            await gemini.send(json.dumps(greeting(w, lang)))
            await ws.send_json({"type": "ready"})
            tasks = [asyncio.create_task(_browser_to_gemini(ws, gemini)),
                     asyncio.create_task(_gemini_to_browser(ws, gemini, w))]
            done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
            for t in pending:
                t.cancel()
            for t in done:
                if not isinstance(t.exception(), (WebSocketDisconnect, websockets.ConnectionClosed, type(None))):
                    log.warning("voice session ended: %r", t.exception())
    except (RuntimeError, OSError, websockets.WebSocketException) as e:
        log.warning("voice unavailable: %s", e)
        try:
            await ws.send_json({"type": "error", "message": "Voice is unavailable right now. Please use the buttons."})
        except RuntimeError:
            pass
    finally:
        try:
            await ws.close()
        except RuntimeError:
            pass
