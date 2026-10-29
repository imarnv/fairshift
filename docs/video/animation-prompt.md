# ShiftSaathi demo film: animation prompt and voice-over script

- **Voice-over:** already generated with Gemini Live (`gemini-3.1-flash-live-preview`), the model behind the app's voice
  assistant. Files are in `docs/video/voiceover/` (git-ignored): `voiceover.wav` is the full 3:00 track and
  `timeline.json` gives the exact start and end of every line. To retake one line: `python3 docs/video/make_voiceover.py A1`.
- **Workflow:** paste the prompt below into your animation tool and **attach all 9 PNGs from `docs/screenshots/`** (it can only use the images you attach; the prompt refers to them by file name),
  export the animation as 1920×1080 MP4, lay `voiceover.wav` under it from 0:00, and add the result to the README
  (see "Adding the video to the README" at the end).

---

## Prompt to paste into the animation tool

> Create a **3-minute (186 s) animated explainer film, 1920×1080, 30 fps**, for **ShiftSaathi**, an app that gives
> India's shift workers (construction, hospitals, colleges, factories) fair pay, safe work and a voice. It is a
> hackathon demo film shown at the top of a GitHub README. A finished voice-over track already exists, so **every
> scene must start and end at the exact times below** so the visuals land on the spoken words.
>
> **Look and feel: warm, human, paper-like, calm. Not a tech-startup neon style.**
> - Palette (use only these): cream background `#F5F2EA`, ivory cards `#FCFBF7`, ink brown text `#3D3929`,
>   muted text `#686050`, brown accent for buttons and highlights `#7A5236`, folder tan `#E9E3D3`, hairlines `#E0DACC`,
>   olive for "safe / done" `#42683B`, brick red for "danger / overdue" `#B03A2E`, amber for "attention" `#92400E`,
>   one red marker `#C8323F` used sparingly. Dark scenes use `#2A211C` with cream text.
> - Type: **Instrument Sans** for everything, **Geist Mono** for numbers and codes, **Noto Sans Tamil / Devanagari**
>   for Indian scripts. Big confident headlines, generous space.
> - Cards are ivory sheets resting on the cream desk: a hairline and a soft low shadow. Rounded corners 12–16 px.
> - Illustrations: simple flat line art in ink brown with tan fills (cranes, scaffolding, a hospital, a college, a
>   loom). People are friendly, simple, faceless or minimal-face, Indian workers in work clothes.
> - Motion: gentle and purposeful. Ease-in-out, 400–700 ms. Cards slide up 24 px and fade in, numbers count up,
>   lines draw on. No bounces, glitches or fast cuts. Hold each key frame long enough to read.
> - Phone mock-ups: a dark brown rounded phone frame showing the app UI recreated from the attached screenshots.
>   Desktop mock-ups: a light browser frame.
> - Subtitles: show every spoken line as a caption at the bottom (white text on a 60 % `#2A211C` pill). For the Tamil
>   and Hindi lines show the original script **and** a smaller English translation under it.
>
> **Scenes (times in seconds, matched to the voice-over):**
>
> **1. Cold open (0.0–18.5).** Dawn light over line drawings of a building site, a hospital ward, a college and a factory
> floor, panning slowly left to right as each is named (site 1.5 s, ward 3.5 s, college 5.5 s, factory 6.8 s). At 8.6 s
> cut to a close-up of a battered paper attendance register; hand-written hours get smudged; a pile of cash notes; a
> phone with a WhatsApp-style group chat where a complaint message scrolls up and away out of sight (16–18 s).
>
> **2. The problem (19.3–27.2).** Three short beats, one per sentence, each a single icon with a short caption:
> a payslip with a big "?" (19.3) · a worker with a hand over their mouth (22.0) · a work-history page fading to blank
> as the worker walks off-frame (24.5).
>
> **3. Reveal (28.2–33.5).** Everything clears to cream. The wordmark **ShiftSaathi** writes on in ink brown (28.2),
> then the tagline appears word by word in sync: **"Fair pay, safe work, and a voice that counts."** (30–33).
>
> **4. Check-in and hours (34.3–43.6).** Phone mock-up. A finger taps "Check in"; a QR poster with code `SKY-7Q2` is
> scanned with a sweep line (34.5–37). A live shift timer starts. The weekly hours bar fills past a "Legal limit:
> 48 hours" tick and turns brick red; a warning card slides in: **"Rest needed: too many hours"** with "84 hours this
> week" (40–43.6).
>
> **5. Payslip (44.1–53.7).** Phone shows the Pay screen: take-home **₹42,910.58** counts up. Lines appear one by
> one in sync with the narration: "Basic pay ₹20,520" (46.5) · "Overtime at double rate ₹24,852.98" in olive (48.0) ·
> "Provident Fund −₹2,462.40" in brick (49.5). A "Read aloud" button pulses and sound waves come out; the language pill
> flips English → தமிழ் and the labels change to Tamil (51–53.7).
>
> **6. Voice (54.5–111.6). The heart of the film; give it the most care.**
> - 54.5–59.7: the screen dims and the phone's text blurs ("can't read a screen"). On "So they just talk" a large
>   brown **Talk** button with a mic appears in the centre and is tapped; a soft listening waveform starts.
> - 60.4–78.5: a chat between **Murugan** (worker avatar, right, mason's helmet) and **ShiftSaathi** (left, a small
>   brown mic badge). Each bubble appears as its line is spoken, with an animated waveform while it plays:
>   - 60.4 Murugan: "கிழக்கு கிரேன் பக்கத்துல சாரம் ஆடுது. யாராவது விழுந்துடுவாங்க." *(The scaffolding near the east crane is shaking. Someone will fall.)* A small inset shows the wobbling scaffolding.
>   - 64.0 ShiftSaathi: "இது ஆபத்தானது. கிழக்கு கிரேன் சாரம் பற்றி புகார் அனுப்பட்டுமா?" *(This is dangerous. Shall I send a report about the east crane scaffolding?)*
>   - 69.3 Murugan: "சரி. ஆனா என் பேர் போட வேண்டாம்." *(Okay. But don't put my name.)*
>   - 72.7 ShiftSaathi: "உங்க பேர் இல்லாம அனுப்பிட்டேன். சூப்பர்வைசர் இருபத்து நான்கு மணி நேரத்துக்குள்ள சரி பண்ணணும்." *(Sent without your name. The supervisor must fix it within 24 hours.)*
>   - At 75 s an olive **confirmation card** drops into the chat: "✓ Report sent. Site supervisor must fix it by 30 Oct, 11:05 PM", with an "Anonymous" lock tag.
> - 79.2–88.7: zoom out. Three labels strike through one by one on "No forms. No categories. No fear." Then show
>   what happened behind the scenes as a tiny flow: speech → "Fall · High risk" chip → "Anonymous" chip → the card.
> - 89.3–102.0: a second worker, **Ramesh** (scaffolder), in Hindi:
>   - 89.3 Ramesh: "इस महीने मेरे हाथ में कितने पैसे आएंगे?" *(How much will I get in hand this month?)*
>   - 93.1 ShiftSaathi: "रमेश जी, इस महीने आपके हाथ में सोलह हज़ार दो सौ चार रुपये आएंगे। ओवरटाइम दुगनी दर पर जुड़ा है।" *(Ramesh-ji, you'll get ₹16,204 in hand this month. Overtime is added at double rate.)*
>   - While the assistant answers, a dotted line runs from the bubble to a small server icon labelled "live payslip"
>     and back; **₹16,204** counts up in Geist Mono.
> - 102.8–111.6: on "fetched live… never a guess" the dotted line pulses again. Then five language pills pop in one
>   by one exactly as they are spoken: **हिन्दी · தமிழ் · తెలుగు · ಕನ್ನಡ · English** (107–111).
>
> **7. Safety escalation (112.6–121.0).** A hazard card with a countdown clock. A three-step ladder: **Supervisor →
> Site manager → HR & Safety**. On "Miss it, and it climbs" the clock runs out (brick red) and the card climbs each
> step in sync (115.5, 117, 118.5). Small legend: "critical 4 h · high 24 h · medium 72 h · low 7 days".
>
> **8. Anonymous feedback (121.8–129.6).** Feedback cards fly into a padlocked box; a counter "1 of 5 … 4 of 5"
> ticks up; at "5 of 5" (126) the lock opens and comments appear shuffled with no names. Caption chip: "AES-256 encrypted".
>
> **9. Skill Passport (130.3–137.4).** A worker walks from one site to another holding a card "Skill Passport:
> Masonry, certified". A new employer scans it; a seal stamps **"Verified ✓"** in olive (135).
>
> **10. Employer dashboard (138.4–148.6).** Desktop mock-up of the dashboard (attached screenshot). Highlight each
> part as it is named: "On site now 4 of 23" (140.5) · "Need rest 4" (142) · "Likely to leave 1" with a reason
> tooltip (143.5–145) · four site cards ranked by **Fair Workplace Index** 80 / 73 / 72 / 72 with bars filling (146–148.6).
>
> **11. Payroll with PhonePe (149.3–160.1).** Payroll table (attached screenshot); the cursor clicks **"Pay ₹42,911"**
> next to Murugan S (150). Transition to a PhonePe-style checkout showing the **same amount ₹42,910.58**, with a
> link line from the payslip amount to the checkout amount (153–156). A "PhonePe confirmed ✓" stamp lands (157), the
> status flips to olive "Paid", then cut to the worker's phone where the payslip now reads "Paid on 31 Oct" (158.5–160).
> Show PhonePe only as the word "PhonePe" in text, not its logo.
>
> **12. Trust (161.1–168.2).** Four tiles appear one per phrase: 🔒 "Encrypted feedback" · ✍ "Signed passports" ·
> 🗣 "5 languages" · 📱 "Runs on a ₹6,000 phone" (the last one with a simple budget phone illustration).
>
> **13. Close (169.2–180.4).** The four sector line drawings return one by one on each word (Construction sites 169.2,
> Hospitals 170.9, Colleges 172.6, Factories 174.3) and slide together into a row. At 176.9 everything fades to cream;
> the wordmark **ShiftSaathi** appears, then on "Every shift…" the headline **"Every shift,"** and on "fair pay" (179)
> **"fair pay."** in the brown accent with a blinking text cursor. Below it, small: "PromptWars 2026 · UN SDG 8" and
> the live link `shiftsaathi-737262865993.asia-south1.run.app`. At 180.5 s glide into `landing-footer.png` as the last shot (see the screenshot table), hold, and fade out at 186 s.
>
> **Use the 9 attached screenshots as real footage. They are the product, so show them as they are; don't redraw them.**
> Treat each one like a camera shot, not a slide:
> - **Frame them:** desktop shots inside a light browser frame with a soft shadow; `worker-home.png` and `payslip.png`
>   inside the dark brown phone frame. Tilt frames slightly in 3D (5–8°) and settle them flat as they land.
> - **Move the camera:** slow push-ins and pans across each screenshot (Ken Burns, 4–8 % scale over the shot), so
>   nothing is ever static.
> - **Zoom to the detail being spoken about:** cut or glide into the exact region of the screenshot (e.g. the
>   "Rest needed" box, the overtime line, a Pay button), dim the rest to 40 %, and draw a rounded highlight outline
>   in `#7A5236` around it with a short label chip.
> - **Animate on top of them:** a cursor or finger that clicks the real button in the screenshot; counters and ticks
>   overlaid exactly over the screenshot's own numbers; a confirmation stamp landing on the real card.
> - **Transitions between screenshots:** match-cuts and smooth glides from one frame to the next (e.g. the Pay button
>   in `payroll.png` grows into `phonepe-checkout.png`), never hard slideshow cuts.
>
> Where each screenshot goes:
> | Scene | Screenshot | How to use it |
> |---|---|---|
> | 3 Reveal (28–33.5) | `landing.png` | After the wordmark, the browser frame rises in and the camera pushes into the "Every shift, fair pay." headline and the Tamil phone mock-up on the right. |
> | 4 Check-in (34–43.6) | `login.png` → `worker-home.png` | Quick glide past sign-in (highlight "Continue as a worker"), then the phone with `worker-home.png`: the finger taps "Check in", then zoom into the hours bar and the "Rest needed" box. |
> | 5 Payslip (44–53.7) | `payslip.png` | Phone frame; highlight each line as it's spoken (Basic pay, Overtime, PF), then the "Read aloud" button pulses. |
> | 6 Voice (54.5–111.6) | — | The chat is new animation (bubbles, waveforms, confirmation card) in the same style as the screenshots, using the "Talk" button from the top of `worker-home.png`. |
> | 8 Feedback (121.8–129.6) | `admin-feedback.png` | Start on the locked "Riverside College, withheld to protect anonymity" card, then pan to an unlocked site with its comments. |
> | 10 Dashboard (138–148.6) | `admin-dashboard.png` | Pan across: "On site now 4 of 23", the "This week" tiles, then the four site cards ranked by index. |
> | 11 Payroll (149–160) | `payroll.png` → `phonepe-checkout.png` | Cursor clicks "Pay ₹42,911" on Murugan's row; it grows into the PhonePe page; highlight the matching ₹42,910.58 on both. |
> | 13 Close (180.5–186) | `landing-footer.png` | After "fair pay." lands, the final shot: the huge "ShiftSaathi" wordmark rises from the bottom, with "Fair work, shift by shift." and "PromptWars 2026 · UN SDG 8". Hold, then fade. |
>
> Scenes with no screenshot (1, 2, 7, 9, 12) are illustrated animation in the same palette, so the film moves between
> the story's world and the real product. Keep all on-screen numbers exactly as written above.

---

## Voice-over script: tone, pace and timing

Times are where each line sits in `voiceover.wav`. Pace is the target speaking speed; the director's note is what
Gemini was told for that line.

| # | Time | Voice | Line | Tone and pace |
|---|---|---|---|---|
| N1 | 0:00 | Narrator (Charon) | Every morning, millions of Indians walk onto a building site, a hospital ward, a college, a factory floor. | Soft and slow, close to the mic, like a documentary's first line. ~120 wpm. |
| N2 | 0:09 | Narrator | They work long shifts. Written in paper registers. Paid in cash. Their complaints, lost in a WhatsApp group. | Slow, a small pause after each short sentence. |
| N3 | 0:19 | Narrator | They can't see how their pay was worked out. They're afraid to speak up. And when they move on, their work history disappears. | Steady and honest, a little heavier. Not dramatic. |
| N4 | 0:28 | Narrator | This is ShiftSaathi. Fair pay, safe work, and a voice that counts. | The lift: brighter and warm, a smile in the voice. |
| N5 | 0:34 | Narrator | A worker scans the site's QR code to start a shift. The app counts every hour, and warns them when they've worked too much, before tiredness causes an accident. | Clear, friendly, conversational. ~140 wpm. |
| N6 | 0:44 | Narrator | Their payslip is explained line by line. Basic pay. Overtime at double rate. Provident fund. And it can be read aloud, in their own language. | Clear and friendly, slower on the list. |
| N7 | 0:54 | Narrator | But many workers can't read a screen at all. So they just talk. | Warm, quietly proud. Slow right down on "So they just talk." |
| W1 | 1:00 | Murugan (Algenib), Tamil | கிழக்கு கிரேன் பக்கத்துல சாரம் ஆடுது. யாராவது விழுந்துடுவாங்க. | Worried, a little hurried, as if he has just seen it. |
| A1 | 1:04 | ShiftSaathi (Kore), Tamil | இது ஆபத்தானது. கிழக்கு கிரேன் சாரம் பற்றி புகார் அனுப்பட்டுமா? | Calm and caring, taking it seriously. |
| W2 | 1:09 | Murugan, Tamil | சரி. ஆனா என் பேர் போட வேண்டாம். | Relieved but cautious, quieter on the second sentence. |
| A2 | 1:13 | ShiftSaathi, Tamil | உங்க பேர் இல்லாம அனுப்பிட்டேன். சூப்பர்வைசர் இருபத்து நான்கு மணி நேரத்துக்குள்ள சரி பண்ணணும். | Reassuring and gentle, so he knows he is safe. |
| N8 | 1:19 | Narrator | No forms. No categories. No fear. The assistant works out how dangerous it is, files it anonymously, and shows a confirmation on screen. | Warm and clear, a beat after "No fear." |
| W3 | 1:29 | Ramesh (Iapetus), Hindi | इस महीने मेरे हाथ में कितने पैसे आएंगे? | Curious, a little tired at the end of a long day. |
| A3 | 1:33 | ShiftSaathi (Kore), Hindi | रमेश जी, इस महीने आपके हाथ में सोलह हज़ार दो सौ चार रुपये आएंगे। ओवरटाइम दुगनी दर पर जुड़ा है। | Friendly and clear, the amount said slowly. |
| N9 | 1:43 | Narrator | Every answer is fetched live, from the same rules as the app. Never a guess. In Hindi, Tamil, Telugu, Kannada or English. | Confident and warm; the languages flow. |
| N10 | 1:53 | Narrator | Every hazard gets a deadline. Miss it, and it climbs: from the supervisor, to the site manager, to HR and Safety. Nothing gets quietly ignored. | Brisk and purposeful, a touch faster. ~150 wpm. |
| N11 | 2:02 | Narrator | Feedback is encrypted, and stays locked until at least five different people have answered. So no one can be singled out. | Gentle and trustworthy. |
| N12 | 2:10 | Narrator | The skills a worker earns travel with them: a signed Skill Passport that any new employer can check in seconds. | Hopeful, forward-looking. |
| N13 | 2:18 | Narrator | For employers, one dashboard. Who's on site right now. Who needs rest. Who might quit, and why. And every site ranked by a Fair Workplace Index. | Professional and confident, speaking to an employer. |
| N14 | 2:29 | Narrator | When the month ends, wages are paid straight through PhonePe. The amount comes from the payslip itself, and counts only once PhonePe confirms it. The worker sees the day they were paid. | Confident, quiet satisfaction on the last sentence. |
| N15 | 2:41 | Narrator | Encrypted feedback. Signed passports. Five languages. And it runs on a six-thousand-rupee phone. | Calm and precise, a beat between items. |
| N16 | 2:49 | Narrator | Construction sites. Hospitals. Colleges. Factories. | Slow and warm, one beat after each word. |
| N17 | 2:57 | Narrator | ShiftSaathi. Every shift, fair pay. | The slowest line of the film. Warm and final, a pause before "fair pay." |

**Music bed (optional):** soft acoustic guitar or a light tabla-and-piano loop at about −22 dB under the voice. Drop it
almost to silence during the Tamil and Hindi conversation (1:00–1:43), and swell gently for the close (2:49–3:00).

## Adding the video to the README

GitHub plays a video inline only when it's uploaded through GitHub itself:

1. On github.com, open `README.md` → Edit, and drag the exported MP4 (under 100 MB) into the editor at the
   `<!-- demo video -->` line. GitHub uploads it and inserts a `https://github.com/user-attachments/assets/…` link.
2. Commit. The link renders as a video player at the top of the README.

Also keep a short GIF or a poster image linked to the video, for viewers where the player doesn't load.
