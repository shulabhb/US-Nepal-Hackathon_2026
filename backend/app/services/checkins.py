"""Persist anonymous check-ins via Supabase."""

from __future__ import annotations

from app.db.client import get_supabase
from app.schemas.checkin import CheckinCreateRequest, CheckinDetailResponse


class CheckinPersistenceError(Exception):
    """Raised when Supabase is misconfigured or the insert fails."""


def _require_client():
    client = get_supabase()
    if client is None:
        raise CheckinPersistenceError(
            "Database is not configured: set SUPABASE_URL and SUPABASE_KEY in `.env`.",
        )
    return client


def _first_choice(values: list[str]) -> str:
    return values[0] if values else ""


def _legacy_step4_freetext_only(step4: dict) -> bool:
    return (
        "additional_context" in step4
        and "country_of_birth" not in step4
        and "has_migration_history" not in step4
        and "migration_entries" not in step4
        and "migration_context" not in step4
    )


def _extract_additional_context(raw_payload: object) -> str | None:
    """
    Personal / free-text context: new saves use raw_payload.step5.additional_context;
    older rows may only have raw_payload.step4.additional_context.
    """
    if not isinstance(raw_payload, dict):
        return None

    step5 = raw_payload.get("step5")
    if isinstance(step5, dict):
        val = step5.get("additional_context")
        if isinstance(val, str):
            s = val.strip()
            if s:
                return s

    step4 = raw_payload.get("step4")
    if isinstance(step4, dict) and _legacy_step4_freetext_only(step4):
        val = step4.get("additional_context")
        if val is None or val == "":
            return None
        if isinstance(val, str):
            s = val.strip()
            return s if s else None
    return None


def _merge_raw_payload(body: CheckinCreateRequest) -> dict | None:
    """Normalized snapshot + optional client_context; step4/5 match request bodies."""
    raw: dict = {**(dict(body.raw_payload) if body.raw_payload else {})}
    if body.client_context is not None:
        raw["client_context"] = body.client_context
    if body.step4 is not None:
        raw["step4"] = body.step4.model_dump()
    if body.step5 is not None:
        raw["step5"] = body.step5.model_dump()
    return raw if raw else None


def insert_checkin(body: CheckinCreateRequest) -> str:
    """
    Insert one flattened row into `checkins`. Returns the new row UUID as string.
    """
    client = _require_client()
    raw_payload = _merge_raw_payload(body)

    row = {
        "anonymous_id": body.anonymous_id,
        "role": _first_choice(body.step1.roles),
        "pressure": _first_choice(body.step1.pressures),
        "goal": _first_choice(body.step1.help_needs),
        "symptoms": body.step2.symptoms,
        "stress_level": body.step2.stress_level,
        "energy_level": body.step2.energy_level,
        "sleep_duration": body.step3.sleep_duration,
        "sleep_quality": body.step3.sleep_quality,
        "sleep_consistency": body.step3.sleep_consistency,
        "imported_from_wearable": body.step3.imported_from_wearable,
        # additional_context: omit top-level column so inserts work even when
        # PostgREST’s schema cache has no such column; text is in raw_payload.step5
        # (or legacy raw_payload.step4 for older rows).
        "raw_payload": raw_payload,
        "recommendation_snapshot": body.recommendation_snapshot,
    }
    try:
        res = client.table("checkins").insert(row).execute()
    except Exception as exc:  # pragma: no cover - network/SDK errors
        raise CheckinPersistenceError(f"Supabase insert failed: {exc}") from exc

    if not res.data:
        raise CheckinPersistenceError("Supabase insert returned no row.")
    inserted = res.data[0]
    raw_id = inserted.get("id")
    if raw_id is None:
        raise CheckinPersistenceError("Inserted row missing id.")
    return str(raw_id)


_CHECKIN_SELECT = (
    "id,anonymous_id,role,pressure,goal,symptoms,stress_level,energy_level,"
    "sleep_duration,sleep_quality,sleep_consistency,imported_from_wearable,"
    "raw_payload,recommendation_snapshot,created_at"
)


HISTORY_LIMIT = 5


def fetch_recent_checkins(
    anonymous_id: str,
    limit: int = HISTORY_LIMIT,
) -> list[CheckinDetailResponse]:
    """Most recent rows for this opaque client id, newest first (max `limit`)."""
    client = _require_client()
    try:
        res = (
            client.table("checkins")
            .select(_CHECKIN_SELECT)
            .eq("anonymous_id", anonymous_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
    except Exception as exc:  # pragma: no cover
        raise CheckinPersistenceError(f"Supabase query failed: {exc}") from exc

    out: list[CheckinDetailResponse] = []
    for row in res.data or []:
        r = dict(row)
        r["additional_context"] = _extract_additional_context(r.get("raw_payload"))
        out.append(CheckinDetailResponse.model_validate(r))
    return out


def fetch_latest_checkin(anonymous_id: str) -> CheckinDetailResponse | None:
    """Most recent row for this opaque client id, or None."""
    client = _require_client()
    try:
        res = (
            client.table("checkins")
            .select(_CHECKIN_SELECT)
            .eq("anonymous_id", anonymous_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
    except Exception as exc:  # pragma: no cover
        raise CheckinPersistenceError(f"Supabase query failed: {exc}") from exc

    if not res.data:
        return None
    row = dict(res.data[0])
    row["additional_context"] = _extract_additional_context(row.get("raw_payload"))
    return CheckinDetailResponse.model_validate(row)
