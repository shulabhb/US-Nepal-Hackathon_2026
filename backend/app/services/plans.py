"""Persist and load saved plans via Supabase."""

from __future__ import annotations

from app.db.client import get_supabase
from app.schemas.plan import coerce_checklist_item_from_stored
from app.schemas.plan_store import SavePlanRequest, StoredPlan, UpdatePlanChecklistRequest


def _is_missing_plan_meta_column_error(exc: BaseException) -> bool:
    """PostgREST PGRST204 when `plan_meta` has not been migrated yet."""
    text = str(exc).lower()
    if "plan_meta" not in text:
        return False
    return (
        "could not find" in text
        or "pgrst204" in text
        or "schema cache" in text
    )


"""Set False after first Supabase error: column `plan_meta` missing on `plans`."""
_plan_meta_column_usable: bool = True


class PlanPersistenceError(Exception):
    """Raised when Supabase is misconfigured or the query fails."""


class PlanNotFoundError(Exception):
    """No plan row for the given id and anonymous_id."""


def _require_client():
    client = get_supabase()
    if client is None:
        raise PlanPersistenceError(
            "Database is not configured: set SUPABASE_URL and SUPABASE_KEY in `.env`.",
        )
    return client


def save_plan(body: SavePlanRequest) -> str:
    """Insert one plan row; returns new id as string."""
    global _plan_meta_column_usable
    client = _require_client()
    p = body.plan
    row = {
        "anonymous_id": body.anonymous_id.strip(),
        "source_checkin_id": body.source_checkin_id.strip()
        if body.source_checkin_id and body.source_checkin_id.strip()
        else None,
        "plan_type": p.plan_type,
        "title": p.title,
        "summary": p.summary,
        "time_horizon": p.time_horizon,
        "checklist_items": [i.model_dump() for i in p.checklist_items],
        "notes": p.notes,
        "model": body.model,
        "source": body.source,
    }
    if body.plan_meta is not None:
        row["plan_meta"] = body.plan_meta

    try:
        res = client.table("plans").insert(row).execute()
    except Exception as exc:  # pragma: no cover
        if (
            body.plan_meta is not None
            and "plan_meta" in row
            and _is_missing_plan_meta_column_error(exc)
        ):
            _plan_meta_column_usable = False
            row_fallback = {k: v for k, v in row.items() if k != "plan_meta"}
            try:
                res = client.table("plans").insert(row_fallback).execute()
            except Exception as exc2:
                raise PlanPersistenceError(
                    f"Supabase insert failed: {exc2}",
                ) from exc2
        else:
            raise PlanPersistenceError(f"Supabase insert failed: {exc}") from exc
    else:
        if body.plan_meta is not None:
            _plan_meta_column_usable = True

    if not res.data:
        raise PlanPersistenceError("Supabase insert returned no row.")
    raw_id = res.data[0].get("id")
    if raw_id is None:
        raise PlanPersistenceError("Inserted plan missing id.")
    return str(raw_id)


_PLANS_SELECT_WITH_META = (
    "id,anonymous_id,source_checkin_id,plan_type,title,summary,time_horizon,"
    "checklist_items,notes,model,source,created_at,plan_meta"
)
_PLANS_SELECT_WITHOUT_META = (
    "id,anonymous_id,source_checkin_id,plan_type,title,summary,time_horizon,"
    "checklist_items,notes,model,source,created_at"
)


def _plans_select_columns() -> str:
    return (
        _PLANS_SELECT_WITH_META
        if _plan_meta_column_usable
        else _PLANS_SELECT_WITHOUT_META
    )


def _execute_plan_select(client, builder):
    """Run a plans SELECT; fall back without plan_meta if the column is missing."""
    global _plan_meta_column_usable
    cols = _plans_select_columns()
    try:
        return builder(cols).execute()
    except Exception as exc:  # pragma: no cover
        if _plan_meta_column_usable and _is_missing_plan_meta_column_error(exc):
            _plan_meta_column_usable = False
            return builder(_PLANS_SELECT_WITHOUT_META).execute()
        raise


def _row_to_stored(row: dict) -> StoredPlan:
    raw_items = row.get("checklist_items")
    if not isinstance(raw_items, list):
        raw_items = []
    items = [coerce_checklist_item_from_stored(x) for x in raw_items]

    raw_notes = row.get("notes")
    if isinstance(raw_notes, list):
        notes = [str(n) for n in raw_notes]
    else:
        notes = []

    sid = row.get("source_checkin_id")
    pm = row.get("plan_meta")
    plan_meta = pm if isinstance(pm, dict) else None
    return StoredPlan(
        id=str(row["id"]),
        anonymous_id=str(row["anonymous_id"]),
        source_checkin_id=str(sid) if sid is not None else None,
        plan_type=str(row["plan_type"]),
        title=str(row["title"]),
        summary=str(row["summary"]),
        time_horizon=str(row["time_horizon"]),
        checklist_items=items,
        notes=notes,
        model=str(row["model"]) if row.get("model") is not None else None,
        source=str(row.get("source") or "local_model"),
        created_at=row["created_at"],
        plan_meta=plan_meta,
    )


def fetch_recent_plans(anonymous_id: str, limit: int = 10) -> list[StoredPlan]:
    """Newest first for this opaque client id."""
    client = _require_client()
    aid = anonymous_id.strip()
    if not aid:
        return []

    try:
        res = _execute_plan_select(
            client,
            lambda cols: client.table("plans")
            .select(cols)
            .eq("anonymous_id", aid)
            .order("created_at", desc=True)
            .limit(limit),
        )
    except Exception as exc:  # pragma: no cover
        raise PlanPersistenceError(f"Supabase query failed: {exc}") from exc

    out: list[StoredPlan] = []
    for r in res.data or []:
        out.append(_row_to_stored(dict(r)))
    return out


def update_plan_checklist(
    plan_id: str,
    body: UpdatePlanChecklistRequest,
) -> StoredPlan:
    """Replace checklist_items jsonb; optionally merge plan_meta."""
    global _plan_meta_column_usable
    client = _require_client()
    pid = plan_id.strip()
    aid = body.anonymous_id.strip()
    if not pid or not aid:
        raise PlanNotFoundError()

    check = _execute_plan_select(
        client,
        lambda cols: client.table("plans")
        .select(cols)
        .eq("id", pid)
        .eq("anonymous_id", aid)
        .limit(1),
    )
    if not check.data:
        raise PlanNotFoundError()

    row0 = dict(check.data[0])
    payload = [i.model_dump() for i in body.checklist_items]
    update_row: dict[str, object] = {"checklist_items": payload}
    if body.plan_meta is not None and _plan_meta_column_usable:
        existing = row0.get("plan_meta")
        if not isinstance(existing, dict):
            existing = {}
        update_row["plan_meta"] = {**existing, **body.plan_meta}

    try:
        client.table("plans").update(update_row).eq("id", pid).eq(
            "anonymous_id", aid
        ).execute()
    except Exception as exc:  # pragma: no cover
        if (
            body.plan_meta is not None
            and "plan_meta" in update_row
            and _is_missing_plan_meta_column_error(exc)
        ):
            _plan_meta_column_usable = False
            try:
                client.table("plans").update({"checklist_items": payload}).eq(
                    "id", pid
                ).eq("anonymous_id", aid).execute()
            except Exception as exc2:
                raise PlanPersistenceError(
                    f"Supabase update failed: {exc2}",
                ) from exc2
        else:
            raise PlanPersistenceError(f"Supabase update failed: {exc}") from exc

    ref = _execute_plan_select(
        client,
        lambda cols: client.table("plans")
        .select(cols)
        .eq("id", pid)
        .eq("anonymous_id", aid)
        .limit(1),
    )
    if not ref.data:
        raise PlanPersistenceError("Could not reload plan after update.")
    return _row_to_stored(dict(ref.data[0]))


def delete_plan(plan_id: str, anonymous_id: str) -> None:
    """Delete one plan row; raises PlanNotFoundError if none matched."""
    client = _require_client()
    pid = plan_id.strip()
    aid = anonymous_id.strip()
    if not pid or not aid:
        raise PlanNotFoundError()

    check = (
        client.table("plans")
        .select("id")
        .eq("id", pid)
        .eq("anonymous_id", aid)
        .limit(1)
        .execute()
    )
    if not check.data:
        raise PlanNotFoundError()

    try:
        client.table("plans").delete().eq("id", pid).eq("anonymous_id", aid).execute()
    except Exception as exc:  # pragma: no cover
        raise PlanPersistenceError(f"Supabase delete failed: {exc}") from exc


def delete_all_plans_for_anonymous(anonymous_id: str) -> None:
    """Remove every saved plan for this opaque client id."""
    client = _require_client()
    aid = anonymous_id.strip()
    if not aid:
        return
    try:
        client.table("plans").delete().eq("anonymous_id", aid).execute()
    except Exception as exc:  # pragma: no cover
        raise PlanPersistenceError(f"Supabase delete failed: {exc}") from exc
