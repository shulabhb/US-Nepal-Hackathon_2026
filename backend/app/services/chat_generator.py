"""Context-aware support chat via local model — planning focus, non-clinical guardrails."""

from __future__ import annotations

import json
from typing import Any

from app.core.config import settings
from app.schemas.chat import GenerateChatReplyRequest, GenerateChatReplyResponse
from app.services.ai_client import (
    AIClientError,
    generate_text,
)

_MAX_CONTEXT_CHARS = 12_000

_FALLBACK_SHORT = (
    "I’m having trouble reaching the local assistant right now. "
    "Try the Plan tab for a concrete checklist, or send your message again in a moment. "
    "If you’re in crisis, please contact local emergency services or a crisis line."
)

_FALLBACK_MINIMAL = (
    "I’m having trouble reaching the local assistant. "
    "Complete a check-in and open the Plan tab when you can—that helps tailor next steps. "
    "If you’re in crisis, please contact local emergency services or a crisis line."
)


def _trim_json(data: object) -> str:
    raw = json.dumps(data, indent=2, ensure_ascii=False)
    if len(raw) <= _MAX_CONTEXT_CHARS:
        return raw
    return raw[: _MAX_CONTEXT_CHARS] + "\n… (truncated)"


def _history_block(history: list[dict[str, str]], limit: int = 8) -> str:
    if not history:
        return "(no prior turns in this session — this is the start.)"
    lines: list[str] = []
    for h in history[-limit:]:
        role = str(h.get("role", "")).strip().lower()
        content = str(h.get("content", "")).strip()
        if not content:
            continue
        if role == "user":
            lines.append(f"User: {content}")
        elif role == "assistant":
            lines.append(f"Assistant: {content}")
    return "\n".join(lines) if lines else "(none)"


def _build_prompt(req: GenerateChatReplyRequest) -> str:
    checkin_block = (
        _trim_json(req.latest_checkin)
        if req.latest_checkin
        else "(none — user has not loaded check-in context.)"
    )
    plan_block = (
        _trim_json(req.active_plan)
        if req.active_plan
        else "(none — no primary saved plan in context.)"
    )
    summaries_block = (
        _trim_json(req.saved_plan_summaries)
        if req.saved_plan_summaries
        else "(none)"
    )
    session_block = (
        _trim_json(req.session_context)
        if req.session_context
        else "(none)"
    )

    return f"""You are a concise support assistant inside a wellness productivity app (Burnout Radar).
You help with planning, prioritization, adjusting or simplifying plans, grounding, and gentle next-step guidance.

STRICT RULES:
- Do NOT act as a therapist, psychiatrist, or clinician.
- Do NOT diagnose, label conditions, or give medical advice.
- Do NOT claim certainty about health, sleep, or mental state.
- Do NOT say you updated, saved, or permanently changed the user’s profile, check-in, or saved plans. Data here is read-only context; the user must change things in the app.
- If the user shares new facts that conflict with the saved context below, you may follow the conversation for this reply only — do not claim their stored records were overwritten.
- If asked for things outside planning/wellbeing productivity (legal, investment, unrelated trivia), briefly decline and steer back to one actionable step.
- Keep replies short: about 3–6 sentences unless the user asks for a list.
- Practical, kind, everyday language. No jargon.

Good intents: what to do next, make plan easier, only 30 minutes today, prioritize, stuck on a task, calm down with a small skill, gentler version of the plan.

Latest user message:
{req.message.strip()}

Saved latest check-in context (JSON — may be empty):
{checkin_block}

Primary plan context (JSON — may be empty):
{plan_block}

Other saved plan summaries (JSON — may be empty):
{summaries_block}

Optional session hints from client (JSON):
{session_block}

Recent conversation (newest at bottom):
{_history_block(req.conversation_history)}

Reply ONLY with your assistant message text (no JSON, no markdown code fences, no prefix like "Assistant:").
"""


def _fallback(req: GenerateChatReplyRequest) -> GenerateChatReplyResponse:
    has_checkin = bool(req.latest_checkin)
    used_plan = bool(req.active_plan) or bool(req.saved_plan_summaries)
    reply = _FALLBACK_SHORT if has_checkin else _FALLBACK_MINIMAL
    return GenerateChatReplyResponse(
        reply=reply,
        source="fallback",
        model=settings.local_ai_model,
        used_plan_context=used_plan,
        used_checkin_context=has_checkin,
        caution="Could not get a live model reply; showing safe fallback.",
    )


def generate_chat_reply(request: GenerateChatReplyRequest) -> GenerateChatReplyResponse:
    """Call local text model; never raises — returns fallback on failure."""
    used_checkin = bool(request.latest_checkin)
    used_plan = bool(request.active_plan) or bool(request.saved_plan_summaries)

    prompt = _build_prompt(request)
    try:
        text = generate_text(prompt, max_tokens=512)
    except (AIClientError, OSError, ValueError):
        return _fallback(request)
    except Exception:
        return _fallback(request)

    if not text or len(text) < 3:
        r = _fallback(request)
        return r

    # Strip accidental role prefixes
    t = text.strip()
    for prefix in ("Assistant:", "assistant:", "AI:", "Response:"):
        if t.lower().startswith(prefix.lower()):
            t = t[len(prefix) :].strip()

    if len(t) > 8000:
        t = t[:7997] + "…"

    return GenerateChatReplyResponse(
        reply=t,
        source="local_model",
        model=settings.local_ai_model,
        used_plan_context=used_plan,
        used_checkin_context=used_checkin,
        caution=None,
    )
