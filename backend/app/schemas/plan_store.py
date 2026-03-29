"""Persistence contracts for saved plans (API ↔ database)."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator, model_validator

from app.schemas.plan import GeneratedPlan, PlanChecklistItem


class UpdatePlanChecklistRequest(BaseModel):
    """PATCH body: replace checklist_items; optional merge into plan_meta (e.g. completion flag)."""

    anonymous_id: str = Field(..., min_length=1)
    checklist_items: list[PlanChecklistItem]
    plan_meta: dict[str, Any] | None = Field(
        default=None,
        description="If set, shallow-merged into existing plan_meta on the row.",
    )

    @model_validator(mode="after")
    def checklist_nonempty(self) -> UpdatePlanChecklistRequest:
        if not self.checklist_items:
            raise ValueError("checklist_items must contain at least one item")
        return self


class DeletePlanResponse(BaseModel):
    status: str = "deleted"
    id: str


class SavePlanRequest(BaseModel):
    anonymous_id: str = Field(..., min_length=1)
    source_checkin_id: str | None = None
    plan: GeneratedPlan
    model: str | None = None
    source: str = Field(default="local_model", min_length=1)
    plan_meta: dict[str, Any] | None = Field(
        default=None,
        description="User inputs at generation (tasks, times, schedule) for analytics.",
    )


class SavePlanResponse(BaseModel):
    plan_id: str
    anonymous_id: str
    status: str = "saved"
    message: str = "Plan saved successfully."


class StoredPlan(BaseModel):
    id: str
    anonymous_id: str
    source_checkin_id: str | None
    plan_type: str
    title: str
    summary: str
    time_horizon: str
    checklist_items: list[PlanChecklistItem]
    notes: list[str]
    model: str | None
    source: str
    created_at: str
    plan_meta: dict[str, Any] | None = None

    @field_validator("created_at", mode="before")
    @classmethod
    def created_at_to_str(cls, v: object) -> str:
        if isinstance(v, datetime):
            return v.isoformat()
        return str(v)
