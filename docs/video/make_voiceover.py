"""Generate the README video's voice-over with Gemini Live, the model behind the app's voice assistant.

Each line is spoken in its own Live session with a director's note for tone and pace. Gemini's transcript
of what it said is compared with the script, and a line that drifts is taken again. Output, in voiceover/:
one WAV per line, voiceover.wav (all lines with their pauses) and timeline.json (start and end of each line).

    GEMINI_API_KEY=... python3 docs/video/make_voiceover.py          # every line
    GEMINI_API_KEY=... python3 docs/video/make_voiceover.py A1 N7    # retake only these lines
"""

import asyncio
import base64
import difflib
import json
import os
import sys
import wave
from pathlib import Path

import websockets

MODEL = "models/gemini-3.1-flash-live-preview"
URL = ("wss://generativelanguage.googleapis.com/ws/"
       "google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key={key}")
RATE = 24000  # Gemini Live speaks 16-bit mono PCM at 24 kHz
OUT = Path(__file__).resolve().parent / "voiceover"

NARRATOR = ("Charon", "en-IN", "A warm Indian-English documentary narrator: unhurried, sincere, quietly confident.")
MURUGAN = ("Algenib", "ta-IN", "Murugan, a construction mason from Chennai, speaking everyday spoken Tamil.")
RAMESH = ("Iapetus", "hi-IN", "Ramesh, a scaffolder from Uttar Pradesh, speaking everyday Hindi.")
SAATHI = ("Kore", "ta-IN", "ShiftSaathi, the app's voice assistant: calm, kind, patient, reassuring.")
SAATHI_HI = ("Kore", "hi-IN", SAATHI[2])

# (id, scene, speaker, direction, line, seconds of silence after it)
LINES = [
    ("N1", "1 Cold open", NARRATOR, "Soft and slow, close to the mic, like the first line of a documentary.",
     "Every morning, millions of Indians walk onto a building site, a hospital ward, a college, a factory floor.", 0.6),
    ("N2", "1 Cold open", NARRATOR, "Slow, with a small pause after each short sentence.",
     "They work long shifts. Written in paper registers. Paid in cash. Their complaints, lost in a WhatsApp group.", 0.8),
    ("N3", "2 The problem", NARRATOR, "Steady and honest, a little heavier. Not dramatic.",
     "They can't see how their pay was worked out. They're afraid to speak up. "
     "And when they move on, their work history disappears.", 1.0),
    ("N4", "3 Reveal", NARRATOR, "Lift the energy: brighter and warm, with a smile in the voice.",
     "This is ShiftSaathi. Fair pay, safe work, and a voice that counts.", 0.8),
    ("N5", "4 Check-in and hours", NARRATOR, "Clear, friendly, conversational pace.",
     "A worker scans the site's QR code to start a shift. The app counts every hour, "
     "and warns them when they've worked too much, before tiredness causes an accident.", 0.5),
    ("N6", "5 Payslip", NARRATOR, "Clear and friendly, slightly slower on the list.",
     "Their payslip is explained line by line. Basic pay. Overtime at double rate. Provident fund. "
     "And it can be read aloud, in their own language.", 0.8),
    ("N7", "6 Voice", NARRATOR, "Warm, quietly proud. Slow right down on the last three words.",
     "But many workers can't read a screen at all. So they just talk.", 0.7),
    ("W1", "6 Voice", MURUGAN, "Worried and a little hurried, as if he has just seen it.",
     "கிழக்கு கிரேன் பக்கத்துல சாரம் ஆடுது. யாராவது விழுந்துடுவாங்க.", 0.4),
    ("A1", "6 Voice", SAATHI, "Calm and caring, taking it seriously.",
     "இது ஆபத்தானது. கிழக்கு கிரேன் சாரம் பற்றி புகார் அனுப்பட்டுமா?", 0.4),
    ("W2", "6 Voice", MURUGAN, "Relieved but cautious, lowering his voice on the second sentence.",
     "சரி. ஆனா என் பேர் போட வேண்டாம்.", 0.4),
    ("A2", "6 Voice", SAATHI, "Reassuring and gentle, so he knows he is safe.",
     "உங்க பேர் இல்லாம அனுப்பிட்டேன். சூப்பர்வைசர் இருபத்து நான்கு மணி நேரத்துக்குள்ள சரி பண்ணணும்.", 0.7),
    ("N8", "6 Voice", NARRATOR, "Warm and clear, a short beat after 'no fear'.",
     "No forms. No categories. No fear. The assistant works out how dangerous it is, "
     "files it anonymously, and shows a confirmation on screen.", 0.6),
    ("W3", "6 Voice", RAMESH, "Curious, a little tired at the end of a long day.",
     "इस महीने मेरे हाथ में कितने पैसे आएंगे?", 0.4),
    ("A3", "6 Voice", SAATHI_HI, "Friendly and clear, saying the amount slowly.",
     "रमेश जी, इस महीने आपके हाथ में सोलह हज़ार दो सौ चार रुपये आएंगे। ओवरटाइम दुगनी दर पर जुड़ा है।", 0.7),
    ("N9", "6 Voice", NARRATOR, "Confident and warm; let the list of languages flow.",
     "Every answer is fetched live, from the same rules as the app. Never a guess. "
     "In Hindi, Tamil, Telugu, Kannada or English.", 1.0),
    ("N10", "7 Safety escalation", NARRATOR, "Brisk and purposeful, a touch faster.",
     "Every hazard gets a deadline. Miss it, and it climbs: from the supervisor, to the site manager, "
     "to HR and Safety. Nothing gets quietly ignored.", 0.8),
    ("N11", "8 Anonymous feedback", NARRATOR, "Gentle and trustworthy.",
     "Feedback is encrypted, and stays locked until at least five different people have answered. "
     "So no one can be singled out.", 0.8),
    ("N12", "9 Skill Passport", NARRATOR, "Hopeful, forward-looking.",
     "The skills a worker earns travel with them: a signed Skill Passport that any new employer "
     "can check in seconds.", 1.0),
    ("N13", "10 Employer dashboard", NARRATOR, "Professional and confident, speaking to an employer.",
     "For employers, one dashboard. Who's on site right now. Who needs rest. Who might quit, and why. "
     "And every site ranked by a Fair Workplace Index.", 0.8),
    ("N14", "11 Payroll with PhonePe", NARRATOR, "Confident, with quiet satisfaction on the last sentence.",
     "When the month ends, wages are paid straight through PhonePe. The amount comes from the payslip itself, "
     "and counts only once PhonePe confirms it. The worker sees the day they were paid.", 1.0),
    ("N15", "12 Trust", NARRATOR, "Calm and precise, a quick list with a beat between items.",
     "Encrypted feedback. Signed passports. Five languages. And it runs on a six-thousand-rupee phone.", 1.0),
    ("N16", "13 Close", NARRATOR, "Slow and warm, one beat after each word.",
     "Construction sites. Hospitals. Colleges. Factories.", 0.9),
    ("N17", "13 Close", NARRATOR, "Slowest line of the film. Warm and final, a pause before 'fair pay'.",
     "ShiftSaathi. Every shift, fair pay.", 5.6),  # holds under the closing footer shot, to 3:06
]

ACTOR = ("You are a professional voice-over artist recording a script. {who} "
         "You will get a director's note and one line. Perform ONLY that line, word for word, exactly as written, "
         "in its language, following the note for tone and pace. Never add, skip, translate, answer or comment.")


async def take(key: str, speaker: tuple, direction: str, line: str) -> tuple[bytes, str]:
    """One Live session: returns the PCM audio and Gemini's transcript of it."""
    voice, lang, who = speaker
    async with websockets.connect(URL.format(key=key), max_size=None) as ws:
        await ws.send(json.dumps({"setup": {
            "model": MODEL,
            "generation_config": {"response_modalities": ["AUDIO"], "speech_config": {
                "voice_config": {"prebuilt_voice_config": {"voice_name": voice}}, "language_code": lang}},
            "system_instruction": {"parts": [{"text": ACTOR.format(who=who)}]},
            "output_audio_transcription": {},
        }}))
        await asyncio.wait_for(ws.recv(), timeout=20)  # setupComplete
        await ws.send(json.dumps({"client_content": {"turns": [{"role": "user", "parts": [
            {"text": f"Director's note: {direction}\nLine: {line}"}]}], "turn_complete": True}}))
        pcm, said = bytearray(), []
        async for raw in ws:
            sc = json.loads(raw).get("serverContent", {})
            for part in sc.get("modelTurn", {}).get("parts", []):
                if "inlineData" in part:
                    pcm += base64.b64decode(part["inlineData"]["data"])
            if text := sc.get("outputTranscription", {}).get("text"):
                said.append(text)
            if sc.get("turnComplete"):
                break
    return bytes(pcm), "".join(said)


def similarity(a: str, b: str) -> float:
    norm = lambda s: "".join(ch for ch in s.lower() if ch.isalnum())
    return difflib.SequenceMatcher(None, norm(a), norm(b)).ratio()


def trim(pcm: bytes, threshold: int = 500, pad: float = 0.08) -> bytes:
    """Cut the silence Gemini leaves before and after a line, keeping a short natural edge."""
    samples = memoryview(pcm).cast("h")
    loud = [i for i in range(0, len(samples), 240) if max(map(abs, samples[i:i + 240])) > threshold]
    if not loud:
        return pcm
    keep = int(pad * RATE)
    start, end = max(0, loud[0] - keep), min(len(samples), loud[-1] + 240 + keep)
    return pcm[start * 2:end * 2]


def write_wav(path: Path, pcm: bytes) -> None:
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1), w.setsampwidth(2), w.setframerate(RATE), w.writeframes(pcm)


async def main(only: set[str]) -> None:
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        sys.exit("Set GEMINI_API_KEY first.")
    OUT.mkdir(exist_ok=True)
    for lid, _, speaker, direction, line, _ in LINES:
        if only and lid not in only:
            continue
        best = (b"", "", -1.0)
        for attempt in range(1, 5):  # ponytail: fixed retries; tune the note if a line keeps failing
            try:
                pcm, said = await take(key, speaker, direction, line)
            except (OSError, asyncio.TimeoutError, websockets.WebSocketException) as e:
                print(f"{lid} take {attempt}: {e}")
                continue
            score = similarity(line, said)
            if score > best[2]:
                best = (pcm, said, score)
            if score >= 0.85:
                break
        if not best[0]:
            sys.exit(f"{lid}: no audio after 4 takes")
        flag = "" if best[2] >= 0.85 else "   <-- CHECK: drifted from the script"
        print(f"{lid} {len(best[0]) / 2 / RATE:5.1f}s  match {best[2]:.2f}  {best[1]!r}{flag}")
        write_wav(OUT / f"{lid}.wav", best[0])

    # Stitch every line with its pause into one track, and record when each line starts and ends.
    track, timeline, t = bytearray(), [], 0.0
    for lid, scene, speaker, _, line, pause in LINES:
        with wave.open(str(OUT / f"{lid}.wav")) as w:
            pcm = trim(w.readframes(w.getnframes()))
        dur = len(pcm) / 2 / RATE
        timeline.append({"id": lid, "scene": scene, "voice": speaker[0], "start": round(t, 2),
                         "end": round(t + dur, 2), "text": line})
        track += pcm + bytes(int(pause * RATE) * 2)
        t += dur + pause
    write_wav(OUT / "voiceover.wav", bytes(track))
    (OUT / "timeline.json").write_text(json.dumps(timeline, ensure_ascii=False, indent=2))
    print(f"\nvoiceover.wav: {t:.1f}s  ->  {OUT}")


if __name__ == "__main__":
    asyncio.run(main(set(sys.argv[1:])))
