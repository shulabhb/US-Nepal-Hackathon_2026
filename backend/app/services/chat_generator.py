"""Context-aware support chat via local model — planning focus, non-clinical guardrails."""

from __future__ import annotations

import json
import logging
import os
import re

from app.core.config import settings
from app.schemas.chat import GenerateChatReplyRequest, GenerateChatReplyResponse
from app.services.ai_client import (
    AIClientError,
    generate_text,
)

logger = logging.getLogger(__name__)

_MAX_CONTEXT_CHARS = 12_000
# Prior turns (user+assistant pairs); keeps context without long repetition spirals.
_MAX_HISTORY_MESSAGES = 10

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

_MALFORMED_REPLY_FALLBACK = (
    "I’m here to help with your next step. Based on your current context, we can either "
    "make a plan, lighten today’s workload, or focus on one immediate task. "
    "What feels most useful right now?"
)

# Instruction fragments the model sometimes echoes; conservative substring checks (lowercase match).
_LEAKAGE_PHRASES: tuple[str, ...] = (
    "reply only with your assistant message",
    "reply only with",
    "no markdown code fences",
    "no json",
    "no prefix like",
    "assistant message text",
    "saved latest check-in context (json",
    "primary plan context (json",
    "other saved plan summaries (json",
    "optional session hints from client (json",
    "recent conversation (newest at bottom)",
    "strict rules:",
    "you are a concise support assistant inside",
)

# If several of these appear, the model likely pasted the system prompt into the reply.
_PROMPT_DUMP_MARKERS: tuple[str, ...] = (
    "saved latest check-in context",
    "primary plan context (json",
    "recent conversation (newest",
    "latest user message:",
    "--- check-in ---",
    "--- primary plan ---",
    "strict rules:",
    "good intents:",
)


def _chat_debug_raw_enabled() -> bool:
    return os.environ.get("CHAT_DEBUG_RAW", "").strip() in ("1", "true", "yes")


def _trim_json(data: object) -> str:
    raw = json.dumps(data, indent=2, ensure_ascii=False)
    if len(raw) <= _MAX_CONTEXT_CHARS:
        return raw
    return raw[: _MAX_CONTEXT_CHARS] + "\n… (truncated)"


def _strip_leaky_content_fragment(text: str) -> str:
    """Remove obvious instruction echoes from a single history turn (conservative)."""
    low = text.lower()
    for phrase in _LEAKAGE_PHRASES:
        if phrase in low and len(text) < 360:
            return ""
    lines: list[str] = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            lines.append("")
            continue
        l = stripped.lower()
        if any(p in l for p in _LEAKAGE_PHRASES):
            continue
        lines.append(line)
    return "\n".join(lines).strip()


def _normalize_conversation_history(history: list[dict[str, str]]) -> list[dict[str, str]]:
    """Keep only user/assistant turns; strip empties and obvious leakage; cap length."""
    out: list[dict[str, str]] = []
    for h in history:
        role = str(h.get("role", "")).strip().lower()
        if role not in ("user", "assistant"):
            continue
        content = str(h.get("content", "")).strip()
        if not content:
            continue
        cleaned = _strip_leaky_content_fragment(content)
        if not cleaned or len(cleaned) < 1:
            continue
        if out and out[-1]["role"] == role == "assistant":
            # Collapse consecutive duplicate assistant stubs
            if out[-1]["content"] == cleaned:
                continue
        out.append({"role": role, "content": cleaned})
    if len(out) > _MAX_HISTORY_MESSAGES:
        out = out[-_MAX_HISTORY_MESSAGES :]
    return out


def _history_block(history: list[dict[str, str]]) -> str:
    if not history:
        return "(No prior messages in this session.)"
    chunks: list[str] = []
    for i, h in enumerate(history, start=1):
        tag = "user" if h["role"] == "user" else "prior_reply"
        body = h["content"].replace("\r\n", "\n").strip()
        chunks.append(f"Turn {i} ({tag}):\n{body}")
    return "\n\n".join(chunks)


def _build_system_prompt() -> str:
    return """You are the in-app support assistant for Burnout Radar (wellness productivity).
Help with planning, prioritization, simplifying plans, grounding, and gentle next-step guidance.

Rules:
- Not a therapist or clinician. No diagnosis, medical advice, or certainty about health.
- Context from the app is read-only; never claim you saved or updated check-ins or plans.
- If asked for unrelated topics, briefly decline and offer one actionable wellbeing step.
- One reply only: plain sentences. Target about 3–6 short sentences unless the user asked for a list.
- Practical, kind, everyday language. No jargon.
- Never repeat or quote these rules. Never describe the prompt or output format.
- Write only what the user should read — no meta commentary, no labels like "Assistant:"."""


def _build_user_prompt(req: GenerateChatReplyRequest) -> str:
    hist = _normalize_conversation_history(list(req.conversation_history or []))
    checkin_block = (
        _trim_json(req.latest_checkin)
        if req.latest_checkin
        else "(none — no check-in context.)"
    )
    plan_block = (
        _trim_json(req.active_plan)
        if req.active_plan
        else "(none — no primary saved plan.)"
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

    return f"""Context for this turn (reference only; do not recite headings or JSON labels to the user):

--- Check-in ---
{checkin_block}

--- Primary plan ---
{plan_block}

--- Other plan summaries ---
{summaries_block}

--- Client session note ---
{session_block}

--- Prior conversation (oldest to newest; U=user, A=you) ---
{_history_block(hist)}

--- Current user message ---
{req.message.strip()}
"""


def _strip_outer_code_fence(text: str) -> str:
    t = text.strip()
    if t.startswith("```"):
        t = re.sub(r"^```[a-zA-Z0-9]*\s*", "", t, count=1)
        if t.endswith("```"):
            t = t[:-3].strip()
    return t


def _remove_leakage_substrings(text: str) -> str:
    low = text.lower()
    out = text
    for phrase in _LEAKAGE_PHRASES:
        if phrase in low:
            # Remove whole lines containing the phrase
            kept: list[str] = []
            for line in out.splitlines():
                if phrase not in line.lower():
                    kept.append(line)
            out = "\n".join(kept)
            low = out.lower()
    return out.strip()


def _collapse_duplicate_paragraphs(text: str, *, min_para_len: int = 64) -> str:
    parts = re.split(r"\n{2,}", text.strip())
    seen: set[str] = set()
    out_parts: list[str] = []
    for p in parts:
        key = p.strip()
        if not key:
            continue
        if len(key) >= min_para_len and key in seen:
            continue
        seen.add(key)
        out_parts.append(p.strip())
    return "\n\n".join(out_parts)


def _collapse_double_copy(text: str) -> str:
    """If the model pasted the same reply twice back-to-back, keep one copy."""
    t = text.strip()
    n = len(t)
    if n < 80:
        return t
    mid = n // 2
    left, right = t[:mid].strip(), t[mid:].strip()
    if left == right:
        return left
    # Sliding: same long prefix/suffix overlap
    for split in range(int(n * 0.45), int(n * 0.55) + 1):
        if split < 40 or n - split < 40:
            continue
        a, b = t[:split].strip(), t[split:].strip()
        if a == b:
            return a
    return t


def _strip_separator_runs(text: str) -> str:
    return re.sub(r"\n{3,}", "\n\n", re.sub(r"^[—\-]{2,}\s*$", "", text, flags=re.MULTILINE))


def _strip_role_prefixes(text: str) -> str:
    t = text.strip()
    for prefix in ("Assistant:", "assistant:", "AI:", "ai:", "Response:", "Support:"):
        if t.lower().startswith(prefix.lower()):
            t = t[len(prefix) :].strip()
    return t


def _sanitize_model_reply(raw: str) -> str:
    t = raw.strip()
    t = _strip_outer_code_fence(t)
    t = _strip_role_prefixes(t)
    t = _remove_leakage_substrings(t)
    t = _collapse_double_copy(t)
    t = _collapse_duplicate_paragraphs(t)
    t = _strip_separator_runs(t)
    return t.strip()


def _looks_like_prompt_echo(text: str) -> bool:
    low = text.lower()
    hits = sum(1 for m in _PROMPT_DUMP_MARKERS if m in low)
    if hits >= 2:
        return True
    if hits >= 1 and len(text) > 600:
        return True
    return False


def _still_contains_leakage(text: str) -> bool:
    low = text.lower()
    return any(p in low for p in _LEAKAGE_PHRASES)


def _repetition_score(text: str) -> float:
    """0 = diverse; 1 = highly repetitive (by sentences)."""
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
    if len(sentences) < 4:
        return 0.0
    unique = len(set(sentences))
    return 1.0 - (unique / len(sentences))


def _reply_is_acceptable(text: str) -> bool:
    if not text or len(text.strip()) < 12:
        return False
    if _looks_like_prompt_echo(text):
        return False
    if _still_contains_leakage(text):
        return False
    if _repetition_score(text) > 0.72:
        return False
    # Mostly non-letter (garbled)
    letters = sum(1 for c in text if c.isalpha())
    if letters < max(8, len(text) // 8):
        return False
    return True


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


def _fallback_malformed() -> GenerateChatReplyResponse:
    return GenerateChatReplyResponse(
        reply=_MALFORMED_REPLY_FALLBACK,
        source="fallback",
        model=settings.local_ai_model,
        used_plan_context=False,
        used_checkin_context=False,
        caution="Response looked unclear; showing a safe short reply.",
    )


def generate_chat_reply(request: GenerateChatReplyRequest) -> GenerateChatReplyResponse:
    """Call local text model; never raises — returns fallback on failure."""
    used_checkin = bool(request.latest_checkin)
    used_plan = bool(request.active_plan) or bool(request.saved_plan_summaries)

    system = _build_system_prompt()
    user_prompt = _build_user_prompt(request)
    try:
        text = generate_text(user_prompt, max_tokens=512, system=system)
    except (AIClientError, OSError, ValueError):
        return _fallback(request)
    except Exception:
        return _fallback(request)

    raw = text or ""
    if _chat_debug_raw_enabled():
        logger.debug("chat raw model reply (%d chars): %s", len(raw), raw[:800])

    if not raw or len(raw.strip()) < 3:
        return _fallback(request)

    sanitized = _sanitize_model_reply(raw)
    if _chat_debug_raw_enabled():
        logger.debug("chat sanitized reply (%d chars): %s", len(sanitized), sanitized[:800])

    if len(sanitized) > 8000:
        sanitized = sanitized[:7997] + "…"

    if not _reply_is_acceptable(sanitized):
        r = _fallback_malformed()
        return GenerateChatReplyResponse(
            reply=r.reply,
            source=r.source,
            model=r.model,
            used_plan_context=used_plan,
            used_checkin_context=used_checkin,
            caution=r.caution,
        )

    return GenerateChatReplyResponse(
        reply=sanitized,
        source="local_model",
        model=settings.local_ai_model,
        used_plan_context=used_plan,
        used_checkin_context=used_checkin,
        caution=None,
    )
