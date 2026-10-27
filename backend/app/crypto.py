"""Encryption for anonymous feedback, and signatures for skill passports.

Feedback text is sealed with AES-256-GCM before it is stored. The site id is bound
in as associated data, so a ciphertext copied onto another site's records fails to
decrypt instead of being read as genuine.

An anonymous hazard report carries a reporter tag: an HMAC of the worker's id. The
server can match it to whoever is signed in, so workers can follow their own
reports, but no screen ever shows it and it cannot be reversed without the key.
Feedback uses a second tag, under its own key, to count how many different people
answered at a site; that tag is kept apart from the answers, so it links to none.

Passport credentials are signed with Ed25519. Anyone with the public key, such as
a future employer, can check one offline; nobody can forge or edit one without
the private key.
"""

import base64
import hashlib
import hmac
import json
import os

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.hashes import SHA256
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

from .config import settings

NONCE_BYTES = 12  # the size GCM is designed around


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _unb64(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


class Sealer:
    def __init__(self, key: bytes):
        self._aes = AESGCM(key)

    def seal(self, plaintext: str, context: str) -> str:
        nonce = os.urandom(NONCE_BYTES)
        return _b64(nonce + self._aes.encrypt(nonce, plaintext.encode(), context.encode()))

    def open(self, token: str, context: str) -> str:
        """Raises cryptography.exceptions.InvalidTag if the token or context was altered."""
        raw = _unb64(token)
        return self._aes.decrypt(raw[:NONCE_BYTES], raw[NONCE_BYTES:], context.encode()).decode()


def _canonical(claims: dict) -> bytes:
    return json.dumps(claims, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()


class PassportSigner:
    def __init__(self, seed: bytes):
        self._key = Ed25519PrivateKey.from_private_bytes(seed)
        self.public_key = self._key.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)

    def sign(self, claims: dict) -> str:
        """Returns `<claims>.<signature>`, small enough to fit in a QR code."""
        body = _canonical(claims)
        return f"{_b64(body)}.{_b64(self._key.sign(body))}"

    def verify(self, token: str) -> dict | None:
        """The claims if the signature holds, otherwise None."""
        try:
            body_part, sig_part = token.split(".")
            body = _unb64(body_part)
            Ed25519PublicKey.from_public_bytes(self.public_key).verify(_unb64(sig_part), body)
            return json.loads(body)
        except (ValueError, InvalidSignature):
            return None


def tagger(key: bytes, purpose: str):
    """A one-way, keyed fingerprint of a worker id. Its key is derived from the data key
    under a label per purpose, so the AES key is never reused for HMAC and tags made for
    one purpose cannot be matched against tags made for another."""
    tag_key = HKDF(SHA256(), 32, salt=None, info=f"shiftsaathi {purpose}".encode()).derive(key)
    return lambda worker_id: hmac.new(tag_key, worker_id.encode(), hashlib.sha256).hexdigest()


sealer = Sealer(settings.data_key)
reporter_tag = tagger(settings.data_key, "hazard reporter")
voter_tag = tagger(settings.data_key, "feedback voter")
signer = PassportSigner(settings.passport_seed)
