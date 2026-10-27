"""Checks on the web app's own files: every language is complete, and every text colour is readable.

They read the frontend sources directly, so a missing translation or a pale colour fails CI
the same way a broken payslip would.
"""

import json
import re
from pathlib import Path

import pytest

WEB = Path(__file__).resolve().parents[2] / "frontend"
STRINGS = json.loads((WEB / "lib/strings.json").read_text())
LANGS = ["en", "hi", "ta", "te", "kn"]


def test_every_language_has_every_string():
    assert sorted(STRINGS) == sorted(LANGS)
    for lang in LANGS:
        assert set(STRINGS[lang]) == set(STRINGS["en"]), f"{lang} is missing or has extra keys"
        assert all(v.strip() for v in STRINGS[lang].values()), f"{lang} has an empty string"


@pytest.mark.parametrize("lang", LANGS[1:])
def test_translations_keep_their_placeholders(lang):
    """A translation that drops {name} or {value} would show the worker a blank."""
    holes = re.compile(r"\{(\w+)\}")
    for key, english in STRINGS["en"].items():
        assert set(holes.findall(STRINGS[lang][key])) == set(holes.findall(english)), f"{lang}.{key}"


def _tokens() -> dict[str, tuple[int, int, int]]:
    css = (WEB / "app/globals.css").read_text()
    root = css[css.index(":root"):css.index("}", css.index(":root"))]
    return {n: tuple(map(int, rgb.split())) for n, rgb in re.findall(r"--([\w-]+):\s*([\d ]+);", root)}


def _luminance(rgb: tuple[int, int, int]) -> float:
    def channel(v: int) -> float:
        c = v / 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = map(channel, rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    hi, lo = sorted((_luminance(a), _luminance(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


@pytest.mark.parametrize("text", ["ink", "muted", "seal", "verify", "query", "caution"])
@pytest.mark.parametrize("background", ["paper", "surface", "desk"])
def test_text_colours_meet_wcag_aa(text, background):
    tokens = _tokens()
    assert contrast(tokens[text], tokens[background]) >= 4.5


def test_white_on_the_accent_button_meets_wcag_aa():
    assert contrast((255, 255, 255), _tokens()["seal"]) >= 4.5
