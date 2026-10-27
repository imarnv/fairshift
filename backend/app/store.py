"""In-memory records, seeded with demo data for three sectors.

Limit: state lives in one process and resets on restart. That suits the demo,
which runs as a single Cloud Run instance (--max-instances 1). Swap these dicts
for Firestore collections before running more than one instance.
"""

import hashlib
import hmac
import random
import secrets
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from itertools import count

from .crypto import reporter_tag, sealer, signer, voter_tag

Sector = str  # "construction" | "hospital" | "education" | "factory"
IST = timezone(timedelta(hours=5, minutes=30))  # all sites are in India; days and weeks are counted in IST


@dataclass
class Site:
    id: str
    name: str
    sector: Sector
    city: str
    lat: float
    lng: float
    radius_m: int
    code: str  # printed on the site's check-in QR poster


@dataclass
class User:
    id: str
    name: str
    phone: str
    pin_hash: str
    role: str  # "worker" | "manager"
    site_id: str | None
    lang: str = "en"
    trade: str = ""
    hourly_rate: float = 0.0
    joined: date = field(default_factory=date.today)


@dataclass
class Shift:
    id: str
    worker_id: str
    site_id: str
    start: datetime
    end: datetime | None = None


@dataclass
class Hazard:
    id: str
    site_id: str
    reporter_id: str | None  # None when reported anonymously; managers then see "Anonymous"
    category: str
    severity: str  # "low" | "medium" | "high" | "critical"
    description: str
    location: str
    created: datetime
    status: str = "open"  # "open" | "in_progress" | "resolved"
    resolved_at: datetime | None = None
    channel: str = "app"  # "app" | "voice"
    reporter_tag: str = ""  # keyed fingerprint, kept even when anonymous (see crypto.reporter_tag)


@dataclass
class Feedback:
    """Holds no worker id at all: anonymity by construction, not by policy."""
    id: str
    site_id: str
    topic: str  # "manager" | "conditions" | "pay" | "safety"
    rating: int
    sealed_comment: str | None
    week: str  # ISO week only; an exact time could identify the author


@dataclass
class Credential:
    id: str
    worker_id: str
    skill: str
    issuer: str
    issued: date
    token: str


@dataclass
class Payment:
    """One month's wages for one worker, paid through PhonePe."""
    order_id: str        # our merchantOrderId, sent to PhonePe
    worker_id: str
    period: str          # "YYYY-MM", the payslip it pays
    amount_paise: int
    status: str = "created"  # "created" | "paid" | "failed"
    payment_id: str | None = None   # PhonePe's transaction id once paid
    paid_at: datetime | None = None


def hash_pin(pin: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.scrypt(pin.encode(), salt=salt, n=2**14, r=8, p=1)
    return f"{salt.hex()}${digest.hex()}"


def check_pin(pin: str, stored: str) -> bool:
    salt, digest = stored.split("$")
    return hmac.compare_digest(hash_pin(pin, bytes.fromhex(salt)).split("$")[1], digest)


def iso_week(d: date) -> str:
    y, w, _ = d.isocalendar()
    return f"{y}-W{w:02d}"


class Store:
    def __init__(self):
        self.sites: dict[str, Site] = {}
        self.users: dict[str, User] = {}
        self.shifts: dict[str, Shift] = {}
        self.hazards: dict[str, Hazard] = {}
        self.feedback: dict[str, Feedback] = {}
        self.feedback_voters: dict[str, set[str]] = {}  # site -> voter tags, never linked to an answer
        self.credentials: dict[str, Credential] = {}
        self.payments: dict[str, Payment] = {}  # by merchant order id
        self._ids = count(1)

    def new_id(self, prefix: str) -> str:
        return f"{prefix}{next(self._ids)}"

    def user_by_phone(self, phone: str) -> User | None:
        return next((u for u in self.users.values() if u.phone == phone), None)

    def workers(self, site_id: str | None = None) -> list[User]:
        return [u for u in self.users.values()
                if u.role == "worker" and (site_id is None or u.site_id == site_id)]

    def shifts_of(self, worker_id: str, since: datetime | None = None) -> list[Shift]:
        return sorted((s for s in self.shifts.values()
                       if s.worker_id == worker_id and (since is None or s.start >= since)),
                      key=lambda s: s.start)

    def open_shift(self, worker_id: str) -> Shift | None:
        return next((s for s in self.shifts.values() if s.worker_id == worker_id and s.end is None), None)

    def issue_credential(self, worker: User, skill: str, issuer: str, issued: date) -> Credential:
        cid = self.new_id("c")
        token = signer.sign({"id": cid, "name": worker.name, "skill": skill, "trade": worker.trade,
                             "issuer": issuer, "issued": issued.isoformat()})
        cred = Credential(cid, worker.id, skill, issuer, issued, token)
        self.credentials[cid] = cred
        return cred


# ── Demo data ────────────────────────────────────────────────────────────────

DEMO_WORKER_PHONE, DEMO_WORKER_PIN = "9000000001", "1234"
DEMO_MANAGER_PHONE, DEMO_MANAGER_PIN = "9000000000", "4321"

_SITES = [
    Site("s1", "Skyline Towers", "construction", "Chennai", 13.0418, 80.2341, 400, "SKY-7Q2"),
    Site("s2", "City General Hospital", "hospital", "Chennai", 13.0067, 80.2206, 300, "CGH-4K9"),
    Site("s3", "Riverside College", "education", "Bengaluru", 12.9352, 77.6245, 500, "RVC-2M5"),
    Site("s4", "Sri Lakshmi Textiles", "factory", "Tiruppur", 11.1085, 77.3411, 350, "SLT-8F3"),
]

# (name, lang, trade, profile) — profile shapes the shift pattern below
_WORKERS = {
    "s1": [("Murugan S", "ta", "Mason", "overworked"), ("Ramesh Yadav", "hi", "Scaffolder", "normal"),
           ("Lakshmi P", "ta", "Helper", "fading"), ("Venkat Rao", "te", "Electrician", "normal"),
           ("Sunil Kumar", "hi", "Welder", "overworked"), ("Anwar Ali", "hi", "Carpenter", "normal"),
           ("Selvi R", "ta", "Helper", "new")],
    "s2": [("Priya Nair", "en", "Nurse", "nights"), ("Kavitha M", "ta", "Ward assistant", "normal"),
           ("Joseph D", "en", "Housekeeping", "fading"), ("Revathi K", "te", "Nurse", "nights"),
           ("Fatima B", "hi", "Sanitation", "normal"), ("Arun Prakash", "ta", "Orderly", "overworked")],
    "s3": [("Manjunath G", "kn", "Groundskeeper", "normal"), ("Shobha H", "kn", "Housekeeping", "normal"),
           ("Raju N", "kn", "Security", "nights"), ("Deepa S", "en", "Lab assistant", "new"),
           ("Basavaraj T", "kn", "Electrician", "fading")],
    "s4": [("Kannan V", "ta", "Machine operator", "nights"), ("Meena K", "ta", "Line operator", "normal"),
           ("Ravi Shankar", "hi", "Loom fitter", "fading"), ("Parvathi S", "ta", "Packer", "normal"),
           ("Dinesh M", "hi", "Line operator", "overworked")],
}
_RATES = {"construction": 95.0, "hospital": 110.0, "education": 85.0, "factory": 90.0}

_FEEDBACK = {
    "s1": [("safety", 2, "Harnesses on the 9th floor are worn out."), ("pay", 2, "Sunday overtime is not on my slip."),
           ("manager", 3, None), ("conditions", 2, "No shade or water near the east crane."),
           ("manager", 2, "Supervisor shouts when we ask about pay."), ("conditions", 3, None),
           ("safety", 3, "Better since new nets went up.")],
    "s2": [("conditions", 3, "Night shifts back to back with no rest day."), ("manager", 4, None),
           ("pay", 4, "Payslips are clear now."), ("safety", 3, "Need more gloves in the sanitation store."),
           ("manager", 4, "Ward sister listens to us."), ("conditions", 2, "Changing room is too small.")],
    # only three entries: below the anonymity threshold, so the dashboard withholds them
    "s3": [("manager", 4, None), ("conditions", 3, "Rain shelter by gate 2 leaks."), ("pay", 4, None)],
    "s4": [("conditions", 2, "Weaving hall is too hot after noon."), ("pay", 3, "Piece rate changes without notice."),
           ("safety", 2, "Ear plugs run out by Wednesday."), ("manager", 4, None), ("conditions", 3, None)],
}


def _seed_shifts(db: Store, w: User, profile: str, now: datetime, rng: random.Random) -> None:
    today = now.date()
    for back in range(34, -1, -1):
        day = today - timedelta(days=back)
        works = {
            "overworked": True,                                  # no weekly rest
            "nights": day.weekday() != 6,
            "fading": back > 13 or rng.random() < 0.35,          # attendance drops in the last fortnight
            "new": day.weekday() < 6,
        }.get(profile, day.weekday() < 6)
        if not works or (profile == "new" and (today - w.joined).days < back):
            continue
        midnight = datetime.combine(day, datetime.min.time(), IST)
        if profile == "nights":
            start, length = midnight + timedelta(hours=20), 10 + rng.choice([0, 1, 2])
        else:
            start = midnight + timedelta(hours=8, minutes=rng.choice([0, 10, 20]))
            length = (11.5 + rng.random()) if profile == "overworked" else rng.choice([7.5, 8, 8])
        if start > now:
            continue
        end = start + timedelta(hours=length)
        if end > now and profile == "overworked":  # leave the demo worker free to check in
            continue
        sid = db.new_id("sh")
        db.shifts[sid] = Shift(sid, w.id, w.site_id, start, end if end <= now else None)


def seed(now: datetime | None = None) -> Store:
    now = now or datetime.now(IST)
    rng = random.Random(8)  # fixed seed: the demo looks the same on every start
    db = Store()
    db.sites = {s.id: s for s in _SITES}

    # PINs are hashed once and shared: scrypt is deliberately slow, and every
    # demo worker uses the same PIN anyway.
    worker_pin, manager_pin = hash_pin(DEMO_WORKER_PIN), hash_pin(DEMO_MANAGER_PIN)
    db.users["m1"] = User("m1", "Anita Desai", DEMO_MANAGER_PHONE, manager_pin, "manager", None, "en", "HR & Safety lead")

    n = 1
    for site_id, people in _WORKERS.items():
        site = db.sites[site_id]
        for name, lang, trade, profile in people:
            uid = f"w{n}"
            joined = now.date() - timedelta(days=25 if profile == "new" else 200 + 37 * n)
            w = User(uid, name, f"90000000{n:02d}", worker_pin, "worker", site_id, lang, trade, _RATES[site.sector], joined)
            db.users[uid] = w
            _seed_shifts(db, w, profile, now, rng)
            n += 1

    hazards = [
        ("s1", "w1", "fall", "critical", "Guard rail missing on level 9 slab edge", "Tower B, level 9", 30, "open"),
        ("s1", None, "electrical", "high", "Loose wiring next to the water tank", "Basement pump room", 50, "in_progress"),
        ("s1", "w4", "equipment", "medium", "Concrete mixer brake slipping", "Yard", 120, "resolved"),
        ("s2", "w8", "chemical", "high", "Disinfectant stored without labels", "Ward 3 utility room", 6, "open"),
        ("s2", None, "biohazard", "critical", "Sharps bin overflowing", "Emergency bay 2", 2, "open"),
        ("s2", "w12", "ergonomic", "low", "Broken patient-lift trolley wheel", "Ward 5", 200, "resolved"),
        ("s3", "w14", "electrical", "medium", "Exposed socket in the chemistry lab corridor", "Block C, 1st floor", 40, "open"),
        ("s4", "w19", "equipment", "high", "Safety guard removed from loom 14", "Weaving hall B", 30, "open"),
        ("s4", None, "fire", "medium", "Cotton dust piled up beside the boiler", "Boiler room", 80, "resolved"),
    ]
    for site_id, reporter, cat, sev, desc, loc, hours_ago, status in hazards:
        hid = db.new_id("h")
        created = now - timedelta(hours=hours_ago)
        resolved = created + timedelta(hours=10) if status == "resolved" else None
        db.hazards[hid] = Hazard(hid, site_id, reporter, cat, sev, desc, loc, created, status, resolved,
                                 reporter_tag=reporter_tag(reporter) if reporter else "")

    for site_id, entries in _FEEDBACK.items():
        # each seeded answer comes from a different worker at the site
        db.feedback_voters[site_id] = {voter_tag(w.id) for w in db.workers(site_id)[:len(entries)]}
        for i, (topic, rating, comment) in enumerate(entries):
            fid = db.new_id("f")
            sealed = sealer.seal(comment, site_id) if comment else None
            db.feedback[fid] = Feedback(fid, site_id, topic, rating, sealed, iso_week(now.date() - timedelta(days=7 * (i % 3))))

    murugan = db.users["w1"]
    db.issue_credential(murugan, "Working at height (scaffold safety)", "Skyline Towers", now.date() - timedelta(days=150))
    db.issue_credential(murugan, "Masonry, level 2", "Skyline Towers", now.date() - timedelta(days=90))
    db.issue_credential(db.users["w8"], "Infection control", "City General Hospital", now.date() - timedelta(days=60))
    return db


db = seed()
