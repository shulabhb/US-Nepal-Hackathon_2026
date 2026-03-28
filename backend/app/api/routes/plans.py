from fastapi import APIRouter, HTTPException, Query

from app.schemas.plan_store import (
    DeletePlanResponse,
    SavePlanRequest,
    SavePlanResponse,
    StoredPlan,
    UpdatePlanChecklistRequest,
)
from app.services.plans import (
    PlanNotFoundError,
    PlanPersistenceError,
    delete_plan,
    fetch_recent_plans,
    save_plan,
    update_plan_checklist,
)

router = APIRouter()


@router.post("", response_model=SavePlanResponse)
def save_plan_route(body: SavePlanRequest) -> SavePlanResponse:
    """Persist a generated plan for an anonymous client."""
    try:
        plan_id = save_plan(body)
    except PlanPersistenceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return SavePlanResponse(
        plan_id=plan_id,
        anonymous_id=body.anonymous_id.strip(),
    )


@router.patch("/{plan_id}", response_model=StoredPlan)
def patch_plan_checklist_route(
    plan_id: str,
    body: UpdatePlanChecklistRequest,
) -> StoredPlan:
    """Update checklist_items (e.g. task completion) for a saved plan."""
    try:
        return update_plan_checklist(plan_id, body)
    except PlanNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Plan not found.") from exc
    except PlanPersistenceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.delete("/{plan_id}", response_model=DeletePlanResponse)
def delete_plan_route(
    plan_id: str,
    anonymous_id: str = Query(..., min_length=1, description="Opaque client id"),
) -> DeletePlanResponse:
    """Remove a saved plan row."""
    try:
        delete_plan(plan_id, anonymous_id)
    except PlanNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Plan not found.") from exc
    except PlanPersistenceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return DeletePlanResponse(id=plan_id.strip())


@router.get("/{anonymous_id}", response_model=list[StoredPlan])
def list_plans(anonymous_id: str) -> list[StoredPlan]:
    """Recent saved plans for this id, newest first."""
    aid = anonymous_id.strip()
    if not aid:
        raise HTTPException(status_code=400, detail="anonymous_id is required.")

    try:
        return fetch_recent_plans(aid, limit=10)
    except PlanPersistenceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
