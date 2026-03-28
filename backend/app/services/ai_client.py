"""HTTP client for a local model server (Ollama-compatible /api/generate)."""

from __future__ import annotations

import json
from typing import Any

import httpx

from app.core.config import settings


class AIClientError(Exception):
    """Base class for local AI transport/parsing failures."""


class AIConnectionError(AIClientError):
    """Could not reach the local model server."""


class AITimeoutError(AIClientError):
    """Request to the local model server exceeded the configured timeout."""


class AIInvalidJSONError(AIClientError):
    """Model response was not valid JSON."""


class AIMalformedResponseError(AIClientError):
    """HTTP response was missing expected fields or status was not OK."""


def _generate_url() -> str:
    base = settings.local_ai_base_url.rstrip("/")
    return f"{base}/api/generate"


def generate_json(prompt: str, output_shape_example: dict[str, Any]) -> dict[str, Any]:
    """
    Ask the local model for a single JSON object (Ollama ``format: json``).

    Pass a **filled example** dict (same keys/types as the target model), not a
    JSON Schema — small models often echo schema definitions back verbatim.
    """
    example = json.dumps(output_shape_example, indent=2, ensure_ascii=False)
    full_prompt = (
        f"{prompt.rstrip()}\n\n"
        "Respond with ONE JSON object only. Use the same KEYS as below.\n"
        "Fill every field with YOUR real plan content for this user (do not copy placeholders).\n"
        "Do NOT output JSON Schema, do NOT use $defs, properties, or required arrays.\n\n"
        "Shape to follow (example values are illustrative only):\n"
        f"{example}"
    )

    payload = {
        "model": settings.local_ai_model,
        "prompt": full_prompt,
        "stream": False,
        "format": "json",
    }

    timeout = httpx.Timeout(settings.local_ai_timeout_seconds)

    try:
        with httpx.Client(timeout=timeout) as client:
            resp = client.post(_generate_url(), json=payload)
    except httpx.ConnectError as exc:
        raise AIConnectionError(
            f"Could not connect to local model server at {settings.local_ai_base_url}. "
            "Ensure it is running (e.g. Ollama)."
        ) from exc
    except httpx.ReadTimeout as exc:
        raise AITimeoutError(
            f"Local model request timed out after {settings.local_ai_timeout_seconds}s."
        ) from exc
    except httpx.RequestError as exc:
        raise AIConnectionError(f"Local model request failed: {exc}") from exc

    if resp.status_code >= 400:
        raise AIMalformedResponseError(
            f"Local model server returned HTTP {resp.status_code}: {resp.text[:500]}"
        )

    try:
        body = resp.json()
    except json.JSONDecodeError as exc:
        raise AIMalformedResponseError("Local model server returned non-JSON body.") from exc

    raw_text = body.get("response")
    if not isinstance(raw_text, str) or not raw_text.strip():
        raise AIMalformedResponseError(
            "Local model response missing string 'response' field (Ollama /api/generate shape)."
        )

    try:
        return json.loads(raw_text)
    except json.JSONDecodeError as exc:
        raise AIInvalidJSONError(
            f"Model did not return parseable JSON: {raw_text[:300]!r}…"
        ) from exc


def generate_text(prompt: str, *, max_tokens: int = 512) -> str:
    """
    Plain-text completion from the local model (Ollama ``/api/generate``, no JSON mode).
    """
    payload: dict[str, Any] = {
        "model": settings.local_ai_model,
        "prompt": prompt.rstrip(),
        "stream": False,
        "options": {"num_predict": max_tokens},
    }

    timeout = httpx.Timeout(settings.local_ai_timeout_seconds)

    try:
        with httpx.Client(timeout=timeout) as client:
            resp = client.post(_generate_url(), json=payload)
    except httpx.ConnectError as exc:
        raise AIConnectionError(
            f"Could not connect to local model server at {settings.local_ai_base_url}. "
            "Ensure it is running (e.g. Ollama)."
        ) from exc
    except httpx.ReadTimeout as exc:
        raise AITimeoutError(
            f"Local model request timed out after {settings.local_ai_timeout_seconds}s."
        ) from exc
    except httpx.RequestError as exc:
        raise AIConnectionError(f"Local model request failed: {exc}") from exc

    if resp.status_code >= 400:
        raise AIMalformedResponseError(
            f"Local model server returned HTTP {resp.status_code}: {resp.text[:500]}"
        )

    try:
        body = resp.json()
    except json.JSONDecodeError as exc:
        raise AIMalformedResponseError("Local model server returned non-JSON body.") from exc

    raw_text = body.get("response")
    if not isinstance(raw_text, str):
        raise AIMalformedResponseError(
            "Local model response missing string 'response' field (Ollama /api/generate shape)."
        )
    return raw_text.strip()
