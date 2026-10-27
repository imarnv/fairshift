"""AES-256-GCM sealing, the anonymity threshold, and signed skill passports."""

import os

import pytest
from cryptography.exceptions import InvalidTag

from app.crypto import PassportSigner, Sealer, tagger
from app.feedback import K_ANONYMITY, summarize
from app.store import Feedback


@pytest.fixture
def sealer() -> Sealer:
    return Sealer(os.urandom(32))


def test_sealed_text_round_trips_and_hides_plaintext(sealer):
    token = sealer.seal("Supervisor shouts at us", "s1")
    assert "Supervisor" not in token
    assert sealer.open(token, "s1") == "Supervisor shouts at us"


def test_same_text_seals_differently_each_time(sealer):
    assert sealer.seal("same", "s1") != sealer.seal("same", "s1")


def test_ciphertext_moved_to_another_site_fails(sealer):
    with pytest.raises(InvalidTag):
        sealer.open(sealer.seal("hello", "s1"), "s2")


def test_tampered_ciphertext_fails(sealer):
    token = sealer.seal("hello", "s1")
    flipped = token[:-2] + ("A" if token[-2] != "A" else "B") + token[-1]
    with pytest.raises(InvalidTag):
        sealer.open(flipped, "s1")


def test_wrong_key_fails(sealer):
    with pytest.raises(InvalidTag):
        Sealer(os.urandom(32)).open(sealer.seal("hello", "s1"), "s1")


def entries(n: int, sealer: Sealer) -> list[Feedback]:
    return [Feedback(f"f{i}", "s1", "pay", 2 + i % 3, sealer.seal(f"comment {i}", "s1"), "2026-W40") for i in range(n)]


def test_feedback_below_threshold_is_withheld(sealer):
    result = summarize(entries(K_ANONYMITY - 1, sealer), "s1", sealer, people=K_ANONYMITY - 1)
    assert result["hidden"] and "comments" not in result and "average" not in result


def test_many_answers_from_few_people_stay_withheld(sealer):
    """One worker sending five replies must not unlock the comments alone."""
    assert summarize(entries(K_ANONYMITY + 3, sealer), "s1", sealer, people=1)["hidden"]


def test_feedback_at_threshold_is_decrypted_without_dates(sealer):
    result = summarize(entries(K_ANONYMITY, sealer), "s1", sealer, people=K_ANONYMITY)
    assert not result["hidden"]
    assert sorted(result["comments"]) == [f"comment {i}" for i in range(K_ANONYMITY)]
    assert "week" not in str(result)


def test_passport_verifies_and_rejects_forgery():
    signer = PassportSigner(os.urandom(32))
    token = signer.sign({"name": "Murugan S", "skill": "Masonry, level 2"})
    assert signer.verify(token)["skill"] == "Masonry, level 2"

    body, sig = token.split(".")
    forged = PassportSigner(os.urandom(32)).sign({"name": "Murugan S", "skill": "Site engineer"}).split(".")[0]
    assert signer.verify(f"{forged}.{sig}") is None
    assert signer.verify("not-a-token") is None


def test_reporter_tag_is_stable_per_worker_and_key():
    key = os.urandom(32)
    tag = tagger(key, "hazard reporter")
    assert tag("w1") == tag("w1") != tag("w2")
    assert "w1" not in tag("w1")
    assert tagger(os.urandom(32), "hazard reporter")("w1") != tag("w1")   # useless without the server's key
    assert tagger(key, "feedback voter")("w1") != tag("w1")              # purposes cannot be cross-matched
