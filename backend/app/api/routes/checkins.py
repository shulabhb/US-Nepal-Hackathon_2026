from fastapi import APIRouter, HTTPException

from app.schemas.checkin import (
    CheckinCreateRequest,
    CheckinDetailResponse,
    CheckinResponse,
)
from app.services.checkins import (
    CheckinPersistenceError,
    delete_all_checkins_for_anonymous,
    fetch_latest_checkin,
    fetch_recent_checkins,
    insert_checkin,
)
from app.services.plans import PlanPersistenceError, delete_all_plans_for_anonymous

router = APIRouter()


@router.post("", response_model=CheckinResponse)
def create_checkin(body: CheckinCreateRequest) -> CheckinResponse:
    """Persist a full anonymous check-in."""
    try:
        checkin_id = insert_checkin(body)
    except CheckinPersistenceError as exc:
        raise HTTPException(
            status_code=503,
            detail=str(exc),
        ) from exc

    return CheckinResponse(
        anonymous_id=body.anonymous_id,
        checkin_id=checkin_id,
        status="saved",
        message="Check-in saved successfully.",
    )


@router.delete("/{anonymous_id}/device-data")
def delete_device_data(anonymous_id: str) -> dict[str, bool | int]:
    """
    Delete all saved check-ins and plans for this device id (opaque anonymous_id).
    Plans are removed first in case of optional linkage to check-in rows.
    """
    aid = anonymous_id.strip()
    if not aid:
        raise HTTPException(status_code=400, detail="anonymous_id is required.")

    try:
        delete_all_plans_for_anonymous(aid)
        removed = delete_all_checkins_for_anonymous(aid)
    except PlanPersistenceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except CheckinPersistenceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {"ok": True, "checkins_deleted": removed}


@router.get("/{anonymous_id}/history", response_model=list[CheckinDetailResponse])
def list_checkin_history(anonymous_id: str) -> list[CheckinDetailResponse]:
    """Up to the last five full check-in rows for this id, newest first."""
    aid = anonymous_id.strip()
    if not aid:
        raise HTTPException(status_code=400, detail="anonymous_id is required.")

    try:
        return fetch_recent_checkins(aid)
    except CheckinPersistenceError as exc:
        raise HTTPException(
            status_code=503,
            detail=str(exc),
        ) from exc


@router.get("/{anonymous_id}", response_model=CheckinDetailResponse)
def get_checkin(anonymous_id: str) -> CheckinDetailResponse:
    """Latest full check-in row for this opaque client id."""
    aid = anonymous_id.strip()
    if not aid:
        raise HTTPException(status_code=400, detail="anonymous_id is required.")

    try:
        row = fetch_latest_checkin(aid)
    except CheckinPersistenceError as exc:
        raise HTTPException(
            status_code=503,
            detail=str(exc),
        ) from exc

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="No check-in found for this id.",
        )

    return row
