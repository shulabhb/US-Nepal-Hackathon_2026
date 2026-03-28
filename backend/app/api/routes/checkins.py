from fastapi import APIRouter, HTTPException

from app.schemas.checkin import (
    CheckinCreateRequest,
    CheckinDetailResponse,
    CheckinResponse,
)
from app.services.checkins import (
    CheckinPersistenceError,
    fetch_latest_checkin,
    fetch_recent_checkins,
    insert_checkin,
)

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
