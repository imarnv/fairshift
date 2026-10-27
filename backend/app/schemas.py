"""Request bodies. Every field is bounded, so malformed or oversized input is
rejected with a 422 before any route code runs."""

from typing import Literal

from pydantic import BaseModel, Field

Lang = Literal["en", "hi", "ta", "te", "kn"]
Category = Literal["fall", "electrical", "fire", "chemical", "biohazard", "equipment", "ergonomic", "other"]
Severity = Literal["low", "medium", "high", "critical"]
Topic = Literal["manager", "conditions", "pay", "safety"]


class LoginIn(BaseModel):
    phone: str = Field(pattern=r"^\d{10}$")
    pin: str = Field(pattern=r"^\d{4}$")


class CheckInIn(BaseModel):
    code: str = Field(min_length=3, max_length=20)
    lat: float | None = Field(None, ge=-90, le=90)
    lng: float | None = Field(None, ge=-180, le=180)


class HazardIn(BaseModel):
    category: Category
    severity: Severity
    description: str = Field(min_length=3, max_length=500)
    location: str = Field("", max_length=120)
    anonymous: bool = False


class FeedbackIn(BaseModel):
    topic: Topic
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(None, max_length=500)


class LangIn(BaseModel):
    lang: Lang


class HazardUpdate(BaseModel):
    status: Literal["open", "in_progress", "resolved"]


class CredentialIn(BaseModel):
    skill: str = Field(min_length=3, max_length=80)


class PayOrderIn(BaseModel):
    month: str = Field(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")


class VerifyIn(BaseModel):
    token: str = Field(max_length=2000)
