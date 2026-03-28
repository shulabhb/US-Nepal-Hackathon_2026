"""Support chat request/response contracts (local AI, non-clinical)."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class GenerateChatReplyRequest(BaseModel):
    anonymous_id: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1, max_length=4000)
    latest_checkin: dict[str, Any] | None = None
    active_plan: dict[str, Any] | None = None
    saved_plan_summaries: list[dict[str, Any]] = Field(default_factory=list)
    burnout_context: dict[str, Any] | None = Field(
        default=None,
        description="Rule-based burnout snapshot from the client (non-clinical).",
    )
    conversation_history: list[dict[str, str]] = Field(default_factory=list)
    session_context: dict[str, Any] | None = None


class GenerateChatReplyResponse(BaseModel):
    reply: str
    source: str
    model: str
    used_plan_context: bool = False
    used_checkin_context: bool = False
    caution: str | None = None
