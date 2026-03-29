"""Structured plan output from the local model — not persisted yet."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class PlanChecklistItem(BaseModel):
    """One actionable task in a plan (richer than legacy label+rationale-only rows)."""

    label: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)
    time_estimate: str = Field(..., min_length=1)
    additional_info: str | None = None
    completed: bool = False

    @field_validator("label", "description", "time_estimate")
    @classmethod
    def strip_nonempty(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("must not be empty")
        return s

    @field_validator("additional_info")
    @classmethod
    def optional_strip(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        return s if s else None


def coerce_checklist_item_from_stored(raw: object) -> PlanChecklistItem:
    """
    Build PlanChecklistItem from jsonb (supports legacy label+rationale-only objects).
    Used when reading rows saved before the richer schema.
    """
    if not isinstance(raw, dict):
        raw = {}
    label = str(raw.get("label", "")).strip() or "Task"

    desc = raw.get("description")
    desc_s = str(desc).strip() if desc is not None else ""
    rationale = raw.get("rationale")
    if not desc_s and rationale is not None:
        desc_s = str(rationale).strip()
    if not desc_s:
        desc_s = "No extra detail was saved for this step."

    te = raw.get("time_estimate")
    te_s = str(te).strip() if te is not None else ""
    if not te_s:
        te_s = "Flexible"

    add = raw.get("additional_info")
    add_s = str(add).strip() if add is not None and str(add).strip() else None

    c_raw = raw.get("completed")
    completed = c_raw is True

    return PlanChecklistItem(
        label=label,
        description=desc_s,
        time_estimate=te_s,
        additional_info=add_s,
        completed=completed,
    )


class GeneratedPlan(BaseModel):
    title: str = Field(..., min_length=1)
    plan_type: str = Field(..., min_length=1)
    summary: str = Field(..., min_length=1)
    time_horizon: str = Field(..., min_length=1)
    checklist_items: list[PlanChecklistItem]
    notes: list[str] = Field(default_factory=list)

    @field_validator("notes", mode="before")
    @classmethod
    def coerce_notes_list(cls, v: object) -> list[str]:
        if v is None:
            return []
        if not isinstance(v, list):
            return []
        out: list[str] = []
        for item in v:
            s = str(item).strip()
            if s:
                out.append(s[:2000])
        return out[:12]

    @field_validator("title", "plan_type")
    @classmethod
    def strip_short_text(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("must not be empty")
        return s

    @field_validator("summary", "time_horizon")
    @classmethod
    def strip_nonempty_summary(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("must not be empty or whitespace-only")
        return s

    @model_validator(mode="after")
    def checklist_not_empty(self) -> GeneratedPlan:
        if not self.checklist_items:
            raise ValueError("checklist_items must contain at least one item")
        return self


class UserPlanTaskInput(BaseModel):
    """A task the user already intends to do — model orders and expands into checklist steps."""

    name: str = Field(..., min_length=1)
    priority: Literal["high", "medium", "low"] = "medium"
    estimated_time: str | None = Field(
        default=None,
        description="User-stated duration (e.g. '45 min', '2h').",
    )

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("must not be empty")
        return s

    @field_validator("estimated_time")
    @classmethod
    def strip_estimated_time(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        return s if s else None


class GeneratePlanRequest(BaseModel):
    anonymous_id: str | None = None
    plan_type: str = Field(..., min_length=1)
    user_request: str | None = None
    checkin_context: dict[str, Any]
    burnout_context: dict[str, Any] | None = Field(
        default=None,
        description="Rule-based burnout snapshot from the client (same family as chat).",
    )
    plan_context: dict[str, str] | None = None
    """User-chosen label for the plan (e.g. personal_tasks flow)."""
    plan_name: str | None = None
    """Whether the user wants a single-day or week-scoped plan."""
    schedule_kind: Literal["daily", "weekly"] | None = None
    """Concrete tasks the user wants included; model sequences them and may add recovery/sleep/social steps."""
    user_tasks: list[UserPlanTaskInput] | None = None
    """When true, model should add rest, sleep, social, and pacing blocks appropriate to the horizon."""
    generate_full_schedule: bool = False


class GeneratePlanResponse(BaseModel):
    plan: GeneratedPlan
    source: str = Field(..., description="e.g. local_model")
    model: str
