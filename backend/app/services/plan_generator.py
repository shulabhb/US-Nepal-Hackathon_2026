"""Build prompts and validate structured plan output from the local model."""

from __future__ import annotations

import json
from typing import Any

from pydantic import ValidationError

from app.core.config import settings
from app.schemas.plan import (
    GeneratedPlan,
    GeneratePlanRequest,
    GeneratePlanResponse,
    coerce_checklist_item_from_stored,
)
from app.services.ai_client import generate_json


class PlanStructureValidationError(Exception):
    """Model JSON parsed but did not satisfy GeneratedPlan."""


# Concrete shape hint for the prompt — NOT model_json_schema() (models often echo that back).
_PLAN_OUTPUT_SHAPE_EXAMPLE: dict[str, Any] = {
    "title": "Short encouraging title for this user",
    "plan_type": "stress_reset",
    "summary": "Two to four sentences: concrete, kind, non-clinical.",
    "time_horizon": "next 72 hours",
    "checklist_items": [
        {
            "label": "Short action title (few words)",
            "description": "One or two sentences: what to do and how it helps, non-clinical.",
            "time_estimate": "~15 minutes",
            "additional_info": "Optional extra tip, or omit this key",
        }
    ],
    "notes": ["Optional short reminder — or use []"],
}


def _looks_like_json_schema_echo(raw: dict[str, Any]) -> bool:
    if "$defs" in raw:
        return True
    if (
        raw.get("title") == "GeneratedPlan"
        and raw.get("type") == "object"
        and "properties" in raw
    ):
        return True
    return False


def _build_prompt(req: GeneratePlanRequest) -> str:
    ctx_json = json.dumps(req.checkin_context, indent=2, ensure_ascii=False)
    extras = ""
    if req.anonymous_id:
        extras += f"\nClient anonymous id (opaque): {req.anonymous_id}\n"
    if req.user_request and req.user_request.strip():
        extras += f"\nUser focus / request:\n{req.user_request.strip()}\n"
    plan_ctx_block = ""
    if req.plan_context:
        # Short bullet list for the model; keys are user-facing question ids.
        lines = [
            f"- {k}: {v.strip()}"
            for k, v in req.plan_context.items()
            if v and str(v).strip()
        ]
        if lines:
            plan_ctx_block = (
                "\nUser answers about this plan (use to ground tasks; do not invent details beyond them):\n"
                + "\n".join(lines)
                + "\n"
            )

    custom_plan_note = ""
    if (req.plan_type or "").strip() == "custom_plan":
        custom_plan_note = (
            "\nPlan type is custom_plan (Something else): this is a user-defined topic. "
            "Honor plan_context keys plan_topic, progress_goal, hardest_part, and "
            "time_or_energy_available; build practical, scoped steps that match what they described—"
            "do not force-fit a preset category label beyond what fits their words.\n"
        )

    return f"""You are helping with a wellness planning assistant (not clinical care).
Produce a practical, supportive, non-medical plan. Do not diagnose, prescribe, or claim to treat conditions.
Avoid medical certainty; use everyday language and small, realistic steps the person could try.
Plan type requested: {req.plan_type}
{custom_plan_note}{extras}{plan_ctx_block}
Check-in context (JSON):
{ctx_json}

Requirements:
- title: short, encouraging
- plan_type: repeat or refine "{req.plan_type}" as a short label
- summary: 2–4 sentences, concrete and kind
- time_horizon: e.g. "today", "this week", "next 72 hours" — match the scope of the checklist
- checklist_items: at least 1 task, at most 8; each task MUST have:
  - label: short headline (not empty)
  - description: 1–2 sentences, actionable, supportive, not medical advice
  - time_estimate: required on EVERY item—never omit; realistic duration (e.g. "~10 min", "~30 min")
  - additional_info: optional one-line extra tip (or omit / null)
  Keep labels and descriptions concise; no diagnosis or treatment claims.
- notes: 0–4 optional brief reminders or caveats (non-clinical)
"""


def _normalize_generated_plan_raw(raw: dict[str, Any]) -> dict[str, Any]:
    """
    Fill checklist fields the local model often drops (e.g. time_estimate) using the same
    defaults as legacy stored rows, then validate as GeneratedPlan.
    """
    items = raw.get("checklist_items")
    if not isinstance(items, list):
        return raw
    coerced = [
        coerce_checklist_item_from_stored(it).model_dump(mode="python")
        for it in items
    ]
    return {**raw, "checklist_items": coerced}


def generate_plan(request: GeneratePlanRequest) -> GeneratePlanResponse:
    """Call the local model and return a validated structured plan."""
    prompt = _build_prompt(request)
    shape = {**_PLAN_OUTPUT_SHAPE_EXAMPLE, "plan_type": request.plan_type.strip()}
    raw: dict[str, Any] = generate_json(prompt, shape)

    if _looks_like_json_schema_echo(raw):
        raise PlanStructureValidationError(
            "The model returned a JSON Schema description instead of a plan. "
            "Try again, or use a model that follows output instructions more reliably."
        )

    raw = _normalize_generated_plan_raw(raw)

    try:
        plan = GeneratedPlan.model_validate(raw)
    except ValidationError as exc:
        raise PlanStructureValidationError(
            f"Model output failed plan validation: {exc.errors()[:5]}"
        ) from exc

    return GeneratePlanResponse(
        plan=plan,
        source="local_model",
        model=settings.local_ai_model,
    )
