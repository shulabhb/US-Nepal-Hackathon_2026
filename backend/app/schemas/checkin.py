from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator


class Step1Data(BaseModel):
    """Onboarding step 1 — multi-select + optional “other” text per group."""

    roles: list[str] = Field(default_factory=list)
    role_other_text: str | None = None
    pressures: list[str] = Field(default_factory=list)
    pressure_other_text: str | None = None
    help_needs: list[str] = Field(default_factory=list)
    help_other_text: str | None = None


class Step2Data(BaseModel):
    symptoms: list[str]
    stress_level: int = Field(ge=1, le=10)
    energy_level: int = Field(ge=1, le=10)


class Step3Data(BaseModel):
    sleep_duration: str
    sleep_quality: str
    sleep_consistency: str
    imported_from_wearable: bool = False


class MigrationEntry(BaseModel):
    country: str = Field(min_length=1, max_length=200)
    adjustment_impact: int = Field(ge=1, le=10)


class Step4Data(BaseModel):
    """Optional background / migration context (step 4)."""

    country_of_birth: str | None = Field(default=None, max_length=200)
    has_migration_history: bool | None = None
    migration_entries: list[MigrationEntry] = Field(default_factory=list)
    migration_context: str | None = Field(default=None, max_length=8000)


class Step5Data(BaseModel):
    """Optional health / personal context (final step)."""

    medications: str | None = Field(default=None, max_length=8000)
    medical_conditions: str | None = Field(default=None, max_length=8000)
    additional_context: str | None = Field(default=None, max_length=8000)
    consent_to_sensitive_context: bool | None = None


class CheckinCreateRequest(BaseModel):
    anonymous_id: str = Field(min_length=1, description="Client-generated opaque id")
    step1: Step1Data
    step2: Step2Data
    step3: Step3Data
    step4: Step4Data | None = None
    step5: Step5Data | None = None
    raw_payload: dict[str, Any] | None = None
    recommendation_snapshot: dict[str, Any] | None = None
    client_context: dict[str, Any] | None = None


class CheckinResponse(BaseModel):
    anonymous_id: str
    status: str
    message: str
    checkin_id: str | None = None


class CheckinDetailResponse(BaseModel):
    """Latest stored row — GET /checkins/{anonymous_id}."""

    id: str
    anonymous_id: str
    role: str
    pressure: str
    goal: str
    symptoms: list[str]
    stress_level: int
    energy_level: int
    sleep_duration: str
    sleep_quality: str
    sleep_consistency: str
    imported_from_wearable: bool
    additional_context: str | None = None
    raw_payload: dict[str, Any] | None = None
    recommendation_snapshot: dict[str, Any] | None = None
    created_at: str

    @field_validator("created_at", mode="before")
    @classmethod
    def created_at_to_str(cls, v: object) -> str:
        if isinstance(v, datetime):
            return v.isoformat()
        return str(v)

    @field_validator("id", mode="before")
    @classmethod
    def id_to_str(cls, v: object) -> str:
        return str(v)
