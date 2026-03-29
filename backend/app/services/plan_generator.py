"""Build prompts and validate structured plan output from the local model."""

from __future__ import annotations

import json
import re
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
    "notes": [
        "First focused note",
        "Second focused note if needed",
    ],
}


def _notes_instructions(req: GeneratePlanRequest) -> str:
    is_personal_dw = (
        (req.plan_type or "").strip() == "personal_tasks"
        and req.schedule_kind in ("daily", "weekly")
    )
    if is_personal_dw:
        return """
- notes: Use a JSON array of 5–12 strings (required for this plan type). Each string: one focused sentence, or two short sentences max. Non-clinical. Be specific to THIS user’s tasks and stated times—avoid vague filler.
  MUST cover, in plain language:
  (1) TIME REALISM: For tasks where the user gave estimated_time, comment if it seems too little or too much for what they described; if they omitted time on a heavy task, mention that gap.
  (2) TOTAL LOAD vs HORIZON: Compare their total self-allocated time to what fits a single day (if daily) or a balanced week (if weekly), using stress/energy/sleep hints from the check-in JSON—flag overload or surprisingly light load.
  (3) STRAIN UP / STRAIN DOWN: Name 1–2 aspects of this mix likely to increase sustained strain if unchanged, and 1–2 that plausibly reduce strain.
  (4) BURNOUT PREVENTION: One or two concrete adjustments (pacing, boundaries, sequencing) tailored to this plan.
  (5) RECREATION / RECOVERY: At least one specific idea (e.g. 15-min walk, short social check-in, hobby block) tied to their workload so recovery is part of the plan—not generic advice unless clearly tied to context.
"""
    return """
- notes: 0–4 short strings only. Practical reminders tied to their answers. For non–personal-task plans, keep burnout commentary light—do not over-analyze; skip generic tips that don’t fit their context.
"""


def _time_aware_checklist_rules(req: GeneratePlanRequest) -> str:
    if not req.user_tasks:
        return ""
    return """
- TIME AWARENESS: The user gave estimated durations per task where provided. When you expand tasks into checklist_items, align each item’s time_estimate with those inputs (split across sub-steps if needed). Do not silently halve or double their stated times without reason; if you adjust, explain briefly in description or additional_info. Order steps so time totals are realistic for their daily vs weekly scope.
"""


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


def _personal_tasks_block(req: GeneratePlanRequest) -> str:
    if not req.user_tasks:
        return ""
    pn = (req.plan_name or "").strip()
    sk = req.schedule_kind or ""
    full = req.generate_full_schedule is True
    prio_order = {"high": 0, "medium": 1, "low": 2}
    sorted_tasks = sorted(
        req.user_tasks,
        key=lambda t: (prio_order.get(t.priority, 1), t.name.lower()),
    )
    lines = [
        f"- [{t.priority}] {t.name} — user estimated time: "
        f"{t.estimated_time.strip() if t.estimated_time else 'not specified'}"
        for t in sorted_tasks
    ]
    horizon = (
        "single day (today or the next waking day)"
        if sk == "daily"
        else "full week (spread sensibly across days; you may label items with a day hint in label or description)"
        if sk == "weekly"
        else "match checklist scope"
    )
    schedule_note = ""
    if full:
        schedule_note = (
            "\nFULL SCHEDULE MODE: The user asked for a richer daily or weekly schedule. "
            "In addition to their listed tasks (properly ordered by priority and realism), "
            "include explicit checklist_items for: adequate rest/breaks, sleep-friendly wind-down or sleep timing, "
            "light social connection (e.g. message someone, short chat), and gentle recovery that fits burnout strain "
            "from the check-in—without medical claims. "
            "You may use up to 12 checklist_items total. "
            "Keep every item practical and non-clinical.\n"
        )
    else:
        schedule_note = (
            "\nOrder and refine the user's tasks into a sensible sequence; you may slightly rephrase labels "
            "for clarity. Add at most 1–2 small optional steps only if essential for pacing (not required). "
            "Use at most 8 checklist_items.\n"
        )

    name_line = f'User plan name (use for title or weave into title): "{pn}"\n' if pn else ""

    return f"""
USER-DEFINED TASKS MODE:
{name_line}Schedule scope: {sk or "unspecified—infer briefly"} — plan for {horizon}.
{schedule_note}
Tasks they want included (respect all; order by priority then your judgment for flow):
{chr(10).join(lines)}
"""


# Opaque client / row IDs must never appear in user-facing titles.
# Match standard UUIDs and 8-4-4-12 (e.g. some anonymous ids).
_UUID_RE = re.compile(
    r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
    r"|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}",
    re.IGNORECASE,
)


def _sanitize_generated_title(title: str, plan_name: str | None) -> str:
    """Strip UUIDs and stray 'for <id>' tails the model may emit; never empty."""
    s = (title or "").strip()
    s = _UUID_RE.sub("", s)
    s = re.sub(
        r"\s+for\s*[!\s,–—-]*$",
        "",
        s,
        flags=re.IGNORECASE,
    )
    s = re.sub(r"[\s,–—-]+[!?]*$", "", s).strip()
    s = re.sub(r"\s{2,}", " ", s)
    if len(s) < 3:
        pn = (plan_name or "").strip()
        if len(pn) >= 3:
            return pn[:200]
        return "Your plan"
    return s[:200]


def _build_prompt(req: GeneratePlanRequest) -> str:
    ctx_json = json.dumps(req.checkin_context, indent=2, ensure_ascii=False)
    extras = ""
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

    personal_block = _personal_tasks_block(req)
    max_items = 12 if (req.user_tasks and req.generate_full_schedule) else 8
    notes_block = _notes_instructions(req)
    time_rules = _time_aware_checklist_rules(req)

    return f"""You are helping with a wellness planning assistant (not clinical care).
Produce a practical, supportive, non-medical plan. Do not diagnose, prescribe, or claim to treat conditions.
Avoid medical certainty; use everyday language and small, realistic steps the person could try.
Plan type requested: {req.plan_type}
{custom_plan_note}{extras}{plan_ctx_block}{personal_block}
Check-in context (JSON):
{ctx_json}

Requirements:
- title: short, encouraging (if a user plan name was given, prefer incorporating it). Never include UUIDs, hex ids, "anonymous", or any opaque client identifier—titles are shown to humans only.
- plan_type: repeat or refine "{req.plan_type}" as a short label
- summary: 2–4 sentences, concrete and kind; mention pacing/rest if full schedule was requested; for personal daily/weekly plans, briefly reflect time/load realism.
- time_horizon: must match {"this single day" if (req.schedule_kind == "daily") else "this week" if (req.schedule_kind == "weekly") else "the checklist"} — e.g. "today", "this week"
- checklist_items: at least 1 task, at most {max_items}; each task MUST have:
  - label: short headline (not empty)
  - description: 1–2 sentences, actionable, supportive, not medical advice
  - time_estimate: required on EVERY item—never omit; realistic duration (e.g. "~10 min", "~30 min")
  - additional_info: optional one-line extra tip (or omit / null)
  Keep labels and descriptions concise; no diagnosis or treatment claims.
{time_rules}{notes_block}
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

    safe_title = _sanitize_generated_title(plan.title, request.plan_name)
    if safe_title != plan.title:
        plan = plan.model_copy(update={"title": safe_title})

    return GeneratePlanResponse(
        plan=plan,
        source="local_model",
        model=settings.local_ai_model,
    )
