# ShiftSaathi

**Fair pay, safe work, and a voice that counts, for India's shift workers.**
PromptWars 2026 · FairShift challenge · UN SDG 8, Decent Work and Economic Growth.

Construction sites, hospitals, colleges and factories still run their workforce on paper registers and
WhatsApp groups. Workers can't see how their pay was worked out, are afraid to complain, and lose their
work history when they move on. Employers can't see who is overworked or about to quit until it is too
late. ShiftSaathi gives each side one screen built for them: a voice-first phone app for workers in five
Indian languages, and a dashboard for employers.

## Contents
[Features](#features) · [Four sectors](#four-sectors-one-platform) · [Try it](#try-it) ·
[Architecture](#architecture) · [Key flows](#key-flows) · [How it meets the judging criteria](#how-it-meets-the-judging-criteria) ·
[Security](#security-and-privacy) · [Accessibility](#accessibility-and-low-end-phones) · [Tests](#tests) ·
[Run locally](#run-locally) · [Deploy](#deploy-to-google-cloud-run) · [Known limits](#known-limits)

## Features

| Worker app (phone, voice first, five languages) | Employer dashboard |
|---|---|
| QR check-in with a live shift timer and overtime warning | Who is on site right now, per site |
| Payslip explained line by line, read aloud | Fair Workplace Index ranking every site |
| Payslip shows when it was paid, with the PhonePe transaction | **Payroll: pay each worker's take-home through PhonePe** |
| Hazard reports with a fix-by deadline | Hazard queue that escalates missed deadlines |
| Anonymous, encrypted feedback | Feedback shown only once 5+ different people answer |
| Skill Passport any employer can verify | Certify a worker's skill with a signature |
| Fatigue warnings past 48 / 60 hours | Fatigue and quit-risk flags with their reasons |
| Voice assistant in Hindi, Tamil, Telugu, Kannada, English | Hours worked per day across all sites |

## Four sectors, one platform

The demo is seeded with one site per sector the problem statement names; the same rules apply to all.

| Sector | Demo site | What ShiftSaathi changes there |
|---|---|---|
| Construction | Skyline Towers, Chennai | Daily-wage masons see overtime past 9 h a day or 48 h a week paid at double rate (Factories Act s.51, s.54, s.59); fall hazards carry a 4-hour deadline. |
| Hospitals | City General, Chennai | Night shifts with under 11 hours' rest are flagged before fatigue causes mistakes on the ward. |
| Colleges & schools | Riverside, Bengaluru | With only three feedback responses, the site's comments stay hidden so no one can be singled out. |
| Factories | Sri Lakshmi Textiles, Tiruppur | A removed machine guard climbs to HR & Safety when the site misses its deadline. |

## Try it

**Live:** https://shiftsaathi-737262865993.asia-south1.run.app

Choose **Try the demo**, then **Continue as a worker** (Murugan, a mason) or
**Continue as an employer** (Anita, HR & Safety). Every worker's PIN is `1234`; phones run from
`9000000001` to `9000000023`. Site codes for check-in: `SKY-7Q2`, `CGH-4K9`, `RVC-2M5`, `SLT-8F3`.

## Architecture

One Cloud Run container: FastAPI serves the JSON API, the `/ws/voice` socket and the exported Next.js app from one
origin. Secrets come from Secret Manager at start-up, and the voice assistant talks to Gemini Live.

| Path | What it holds |
|---|---|
| `backend/app/main.py` | App, security headers, cache rules, static web app |
| `backend/app/routes/` | `worker.py` (sign-in, shifts, pay, safety, feedback, passport) and `admin.py` (dashboard) |
| `backend/app/services.py` | Actions shared by the REST routes and the voice assistant |
| `backend/app/payroll.py` · `wellbeing.py` · `safety.py` · `feedback.py` | The rules, each a small pure module |
| `backend/app/crypto.py` · `security.py` · `config.py` | Encryption, signing, sign-in and secrets |
| `backend/app/voice.py` | Gemini Live bridge with five tools |
| `backend/app/payments.py` | PhonePe payments, status checks and webhook for payroll |
| `ios/` | iPhone app: the worker app in a native shell with a camera QR scanner |
| `frontend/app/` | Pages: landing, login, `worker`, `admin`, `verify` |
| `frontend/components/` · `frontend/lib/` | Shared UI kit, the two apps' sections, API client, translations |

## Key flows

**A shift, from check-in to payslip.** The worker scans the site's QR poster; the API checks the code
belongs to their site and, when the phone sends a location, that they are within the site's radius. A live
timer runs until check-out. The payslip splits hours per ISO week into regular and overtime (past 9 h a day
or 48 h a week, paid at double rate), then deducts PF and ESI, and every line can be read aloud.

**A hazard report and its deadline.** A report starts with the site supervisor. Its deadline depends on
severity (critical 4 h, high 24 h, medium 72 h, low 7 days). Missed once, it moves to the site manager;
missed by twice the deadline, to HR & Safety. Reports filed by voice follow exactly the same path.

**Anonymous feedback.** A rating and comment are stored with the site and ISO week only; the comment is
sealed with AES-256-GCM. The worker's voter tag goes into a separate per-site set. Until five different
people have answered, the dashboard shows a lock; after that, comments are decrypted, shuffled and shown
without dates.

**Paying wages.** In Payroll the employer picks a month and presses **Pay** next to a worker. The server
works out the amount from that worker's payslip and starts a PhonePe Standard Checkout payment for it, so the
browser never sets the amount, then sends the employer to PhonePe's own payment page. When PhonePe sends them back,
the server asks PhonePe for the order's real state rather than trusting the return link, and accepts it only if
the amount matches the payslip. PhonePe's webhook is a second confirmation, accepted only with the SHA-256 of the
username and password set on the dashboard. A month can't be paid twice, and the worker's payslip then shows the
payment date and PhonePe transaction.

**A voice conversation.** The app opens `/ws/voice` with the worker's token and the language on screen.
The server starts a Gemini Live session in that language with the worker's context and five tools, and the
assistant greets the worker by name. Questions about pay, hours or reports become tool calls into
`services.py`, so every number spoken comes from the same rules as the app.

## How it meets the judging criteria

| Criterion | Where to look |
|---|---|
| **Problem alignment** | Every item in the brief is built: shift tracking (`services.check_in`), clear payslips (`payroll.py`), safety reporting (`safety.py`), honest feedback (`feedback.py`), Skill Passport (`crypto.PassportSigner`), fatigue alerts (`wellbeing.fatigue`), admin dashboard (`routes/admin.py`), voice in local languages (`voice.py`), plus wage payment through PhonePe (`payments.py`) and an iPhone app (`ios/`). Two interfaces, four sectors. |
| **Code quality** | Each rule is a small pure function with its reasons returned; routes stay thin and call `services.py`; one shared UI kit (`components/ui.tsx`); typed request bodies (`schemas.py`) and typed responses (`lib/api.ts`); ESLint and TypeScript `strict` with no unused code. |
| **Security** | No secrets in the repo, Secret Manager at runtime, a fail-fast start in production, scrypt PINs with lockout, JWT with role checks, bounded inputs, AES-256-GCM, Ed25519, HMAC reporter tags, CSP and HSTS. See [Security](#security-and-privacy). |
| **Efficiency** | One container and one origin; the web app is static files; about 130 KB of JavaScript for the worker app; fonts load per script; hashed assets cached for a year; pages poll every 15 s only while visible. |
| **Testing** | 72 pytest tests: labour rules, encryption and signatures, every API flow and role check, the voice tools, translation completeness and colour contrast. CI runs them, plus ESLint (Next.js rules), a strict type check and a production build, on every push. |
| **Accessibility** | WCAG AA contrast enforced by a test, 48 px touch targets, a skip link, visible focus, labelled controls, `lang` set per language, `prefers-reduced-motion` respected, read-aloud and pictures for low literacy. |

## Security and privacy

- **Feedback is anonymous by construction.** Feedback records hold no worker id, only the ISO week. Comments
  are sealed with **AES-256-GCM**, with the site id bound in as associated data, and a site's comments are
  only decrypted once 5 or more *different* people have answered. People are counted with a keyed voter tag
  stored apart from the answers, so one worker sending five replies cannot unlock them alone.
- **Anonymous hazard reports** carry an HMAC-SHA256 reporter tag (key derived with HKDF), so the reporter
  can follow their own report while no screen shows who sent it. Anonymous reports never feed the
  manager-visible quit-risk score.
- **Skill Passports** are signed with **Ed25519**. A new employer verifies one at `/verify` without an
  account; changing one character breaks the signature. The credential travels in the URL fragment, which
  browsers never send to server logs.
- **Payments can't be faked or inflated.** PhonePe payments are created server-side from the payslip amount, and
  a payment only counts once PhonePe itself confirms it, through the status API or an authenticated webhook. The
  client secret never leaves the server, and the server uses PhonePe's sandbox unless production is set on purpose.
- **No keys in the code.** The three app secrets and the Gemini key come from Secret Manager on Cloud Run;
  the server refuses to start in production without them.
- Phone + 4-digit PIN sign-in, PINs hashed with scrypt, 5 wrong tries lock the number for 5 minutes,
  12-hour JWTs, role checks on every route, bounded input on every field, the voice token sent in the first
  message rather than the URL, and strict headers (CSP, HSTS, `frame-ancestors 'none'`, `nosniff`).

## Accessibility and low-end phones

- Every text colour meets WCAG AA contrast (4.5:1), checked by `tests/test_web_assets.py`; touch targets are
  48 px or larger; there is a skip link; keyboard focus is always visible; motion stops under
  `prefers-reduced-motion`.
- The whole worker interface is in English, हिन्दी, தமிழ், తెలుగు and ಕನ್ನಡ; pictures and faces carry meaning
  for workers who read little; payslips can be read aloud with the phone's own speech engine; the voice
  assistant answers in the language on screen.
- The worker app loads in about 130 KB of JavaScript and installs as a web app.

## Tests

```bash
cd backend && python -m pytest -q      # 72 tests
```

| File | Covers |
|---|---|
| `test_rules.py` | Overtime (daily vs weekly), PF and ESI, fatigue rules, quit risk, escalation, the Fair Workplace Index |
| `test_privacy.py` | AES-256-GCM tamper and wrong-key failures, the 5-people threshold, Ed25519 forgery, reporter tags |
| `test_api.py` | Sign-in and lockout, role checks, check-in geofence, anonymous reports, encrypted storage, one worker unable to unlock feedback, passports, headers |
| `test_payments.py` | Amount taken from the payslip, status checked with PhonePe, wrong amount refused, webhook authentication, no double payment, managers only |
| `test_voice.py` | Session language, greeting, payslip and hazard tools, feedback clamping, unknown tools |
| `test_web_assets.py` | Every language has every string and placeholder; every text colour passes WCAG AA |

## Run locally

```bash
cd frontend && npm ci && npx next build && cd ..
ln -sfn ../frontend/out backend/static
cd backend && pip install -r requirements-dev.txt
python -m uvicorn app.main:app --port 8080      # open http://localhost:8080
```

For voice, `export GEMINI_API_KEY=…` before starting. Development keys for the app itself are generated once
into `backend/.dev-secrets.json`, which is git-ignored.

## iPhone app

`ios/` is a native shell around the live worker app: it opens straight on the worker sign-in, scans the site QR
with the iPhone camera (Safari's web view has no barcode reader), and lets the voice assistant use the microphone.
Because the page itself comes from Cloud Run, the app always shows the latest release.

```bash
cd ios && xcodegen          # regenerates ShiftSaathi.xcodeproj from project.yml
open ShiftSaathi.xcodeproj  # pick your team under Signing & Capabilities, then Run on your iPhone
```

## Deploy to Google Cloud Run

```bash
PROJECT=your-project-id
gcloud config set project $PROJECT
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  secretmanager.googleapis.com

# three random 32-byte app secrets, and the Gemini key (typed in, never saved to a file)
for s in data-key passport-signing-key jwt-secret; do
  python3 -c "import os,base64;print(base64.b64encode(os.urandom(32)).decode(),end='')" |
    gcloud secrets create shiftsaathi-$s --data-file=-
done
read -rs GEMINI && printf %s "$GEMINI" | gcloud secrets create shiftsaathi-gemini-key --data-file=- && unset GEMINI

# let the service read them
SA=$(gcloud projects describe $PROJECT --format='value(projectNumber)')-compute@developer.gserviceaccount.com
gcloud projects add-iam-policy-binding $PROJECT --member=serviceAccount:$SA --role=roles/secretmanager.secretAccessor

gcloud run deploy shiftsaathi --source . --region asia-south1 --allow-unauthenticated \
  --max-instances 1 --timeout 3600 --session-affinity \
  --set-secrets DATA_KEY=shiftsaathi-data-key:latest,PASSPORT_SIGNING_KEY=shiftsaathi-passport-signing-key:latest,JWT_SECRET=shiftsaathi-jwt-secret:latest,GEMINI_API_KEY=shiftsaathi-gemini-key:latest
```

`--max-instances 1` because demo data lives in memory (see `store.py`); `--timeout 3600` keeps voice calls
open. To run voice on Vertex AI with no key at all, drop the Gemini secret, set
`GOOGLE_CLOUD_PROJECT=$PROJECT`, and grant the service account `roles/aiplatform.user`.

## Known limits

- Data is in memory and resets to the demo seed on restart; production would move `store.py` to Firestore.
- A week that straddles two months is judged only on its days inside the payslip's month.
- Live updates poll every 15 s rather than being pushed.
- Payroll uses PhonePe Standard Checkout in sandbox, so wages are collected into the merchant account; sending
  them on to each worker's bank or UPI needs PhonePe's payouts product.
- The CSP allows inline scripts, which Next.js's static export needs for hydration; a nonce-based policy
  would need server rendering.
