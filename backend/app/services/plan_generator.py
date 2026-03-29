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
            "description": "2–4 sentences: what to do; then explicitly which user-reported struggle, goal, symptom, sleep/stress pattern, or plan answer this step addresses (only from their data). Non-clinical.",
            "time_estimate": "~15 minutes",
            "additional_info": "Optional: one line naming a specific detail they gave (e.g. exam date). Omit if not needed.",
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
- notes: 0–4 short strings only. Practical reminders tied to their answers; at least one note should name a theme from their plan_context or check-in (e.g. exam timing, hardest part, time available). For non–personal-task plans, keep burnout commentary light—do not over-analyze; skip generic tips that don’t fit their context.
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


# Phrases suggesting little time left or high stress about readiness (user text, lowercased blob).
_TIME_PRESSURE_MARKERS: tuple[str, ...] = (
    "tomorrow",
    "today",
    "tonight",
    "this evening",
    "few hours",
    "not prepared",
    "unprepared",
    "haven't studied",
    "havent studied",
    "didn't study",
    "didnt study",
    "running out of time",
    "last minute",
    "cram",
    "panic",
    "exam soon",
    "next day",
    "the day after",
)

_UNPREPARED_MARKERS: tuple[str, ...] = (
    "not prepared",
    "unprepared",
    "haven't studied",
    "havent studied",
    "didn't study",
    "didnt study",
    "panic",
    "cram",
    "last minute",
    "running out of time",
)


def _plan_qa_blob(req: GeneratePlanRequest) -> str:
    """Lowercased text from user_request + plan_context for urgency heuristics."""
    parts: list[str] = []
    if req.user_request and str(req.user_request).strip():
        parts.append(str(req.user_request).strip().lower())
    if req.plan_context:
        for v in req.plan_context.values():
            if v and str(v).strip():
                parts.append(str(v).strip().lower())
    return " ".join(parts)


def _time_pressure_block(req: GeneratePlanRequest) -> str:
    blob = _plan_qa_blob(req)
    if not blob or not any(m in blob for m in _TIME_PRESSURE_MARKERS):
        return ""
    lines = [
        "TIME PRESSURE / URGENCY (inferred from their answers—do not shame them):",
        "- They are under tight timing; prioritize minimum-viable prep, clear sequencing, and mandatory breaks and sleep—not endless new material.",
        "- Acknowledge stress honestly; keep steps small and completable. If the burnout snapshot shows low energy, poor sleep, or high stress, explicitly reduce scope and add recovery.",
        "- With very little time before an assessment: one focused review pass plus one targeted practice block, then a wind-down that protects sleep, usually beats unfocused cramming.",
    ]
    if any(m in blob for m in _UNPREPARED_MARKERS):
        lines.append(
            "- They signaled feeling rushed or under-prepared: validate that; suggest triage (what to lock in vs defer), not guilt."
        )
    pt = (req.plan_type or "").strip()
    if pt == "study_plan":
        lines.append(
            "- For study plans: tie steps to what they said is hardest (e.g. organizing vs memorizing); "
            "under urgency, favor one-page summaries, targeted drills, and scheduled breaks over broad coverage."
        )
    return "\n".join(lines) + "\n\n"


def _burnout_snapshot_block(req: GeneratePlanRequest) -> str:
    bc = req.burnout_context
    if not isinstance(bc, dict) or not bc:
        return ""
    try:
        blob = json.dumps(bc, indent=2, ensure_ascii=False)
    except (TypeError, ValueError):
        return ""
    return (
        "\nRule-based burnout snapshot (non-diagnostic—use to calibrate pacing and recovery):\n"
        f"{blob}\n\n"
        "When generating checklist_items: if the snapshot suggests elevated strain, low energy, or sleep stress, "
        "weave explicit recovery, boundaries, and realistic load into steps—especially when TIME PRESSURE rules apply. "
        "Stay practical; do not diagnose.\n\n"
    )


def _theme_anchor_block(checkin_context: object) -> str:
    """
    Short, quotable themes from the saved check-in so each plan step can cite real user data.
    """
    if not isinstance(checkin_context, dict):
        return ""
    ctx = checkin_context
    lines: list[str] = []
    role = ctx.get("role")
    if role:
        lines.append(f"- Role / context: {role}")
    pressure = ctx.get("pressure")
    if pressure:
        lines.append(f"- Pressure theme: {pressure}")
    goal = ctx.get("goal")
    if goal:
        lines.append(f"- Help / goal focus: {goal}")
    syms = ctx.get("symptoms")
    if isinstance(syms, list) and syms:
        joined = ", ".join(str(s) for s in syms[:20])
        lines.append(f"- Symptoms / signals they selected: {joined}")
    for key, lab in (
        ("stress_level", "Stress level (1–10)"),
        ("energy_level", "Energy level (1–10)"),
        ("sleep_quality", "Sleep quality"),
        ("sleep_duration", "Sleep duration"),
        ("sleep_consistency", "Sleep consistency"),
    ):
        v = ctx.get(key)
        if v is not None and str(v).strip():
            lines.append(f"- {lab}: {v}")
    rs = ctx.get("recommendation_snapshot")
    if isinstance(rs, dict):
        summ = rs.get("summary")
        if isinstance(summ, str) and summ.strip():
            lines.append(f"- Check-in summary (their words): {summ.strip()[:450]}")
        ia = rs.get("immediate_actions")
        if isinstance(ia, list) and ia:
            first = ia[0]
            if isinstance(first, str) and first.strip():
                lines.append(f"- A priority action they saw: {first.strip()[:300]}")
    ac = ctx.get("additional_context")
    if isinstance(ac, str) and ac.strip():
        lines.append(f"- Additional context they wrote: {ac.strip()[:500]}")
    if not lines:
        return ""
    return (
        "\nUSER-REPORTED THEMES (cite these in checklist descriptions when relevant; "
        "paraphrase in plain language—do not invent struggles):\n"
        + "\n".join(lines)
        + "\n"
    )


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
In checklist descriptions, name which user task(s) or stated struggle each step carries forward (e.g. "This implements your high-priority …" or "Addresses the time you estimated for …").
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
    theme_anchors = _theme_anchor_block(req.checkin_context)
    burnout_block = _burnout_snapshot_block(req)
    pressure_block = _time_pressure_block(req)
    urgent = bool(pressure_block.strip())
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

    summary_bullet = (
        "- summary: 2–4 sentences, concrete and kind; mention pacing/rest if full schedule was requested; "
        "for personal daily/weekly plans, briefly reflect time/load realism; when burnout_context or urgency applies, "
        "connect to strain/energy/sleep themes from the snapshot and their Q&A."
    )
    if urgent:
        summary_bullet = (
            "- summary: Open by acknowledging their situation (exam timing, feeling under-prepared, hectic day, or low energy from the snapshot) in a steady, kind tone—no alarmism or guilt. "
            "Then 2–4 sentences total: concrete next steps; mention pacing/rest where relevant; connect to burnout snapshot and their answers when applicable."
        )

    return f"""You are helping with a wellness planning assistant (not clinical care).
Produce a practical, supportive, non-medical plan. Do not diagnose, prescribe, or claim to treat conditions.
Avoid medical certainty; use everyday language and small, realistic steps the person could try.
Plan type requested: {req.plan_type}
{custom_plan_note}{extras}{plan_ctx_block}{personal_block}{theme_anchors}{burnout_block}{pressure_block}Check-in context (JSON):
{ctx_json}

Requirements:
- title: short, encouraging; fix obvious spelling of subject or exam names from their answers (e.g. “Linear Algebra” not typos). If a user plan name was given, prefer incorporating it. Never include UUIDs, hex ids, "anonymous", or opaque ids.
- plan_type: repeat or refine "{req.plan_type}" as a short label
{summary_bullet}
- time_horizon: must match {"this single day" if (req.schedule_kind == "daily") else "this week" if (req.schedule_kind == "weekly") else "the checklist"} — e.g. "today", "this week"
- checklist_items: at least 1 task, at most {max_items}; each task MUST have:
  - label: short scannable headline (not empty)
  - description: 2–4 sentences, non-clinical. First sentence(s): concrete action. MUST include at least one sentence that explicitly names WHICH user-reported theme this step addresses—draw only from: (a) USER-REPORTED THEMES above, (b) plan_context Q&A, (c) user_tasks list, (d) JSON fields (symptoms, pressures, goals, sleep/stress/energy). Example: "This responds to what you shared about struggling to build a study plan before your exam." If a step is recovery or pacing, say how it balances a load or symptom they reported. Do not claim a link to data that is not in their context.
  - time_estimate: required on EVERY item—never omit; realistic duration (e.g. "~10 min", "~30 min")
  - additional_info: optional one line that ties to a specific plan_context answer or check-in detail (e.g. dates, hours per day they gave)—omit if redundant
  Keep labels concise; descriptions may be longer for clarity. No diagnosis or treatment claims.
  {"- URGENCY: If TIME PRESSURE rules appeared above, include at least one checklist item that is clearly a real break, meal, or sleep-protecting wind-down (labeled as such)—not disguised as more study work." if urgent else ""}
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
