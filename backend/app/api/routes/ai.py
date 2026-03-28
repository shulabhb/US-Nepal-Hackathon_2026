from fastapi import APIRouter, HTTPException

from app.schemas.plan import GeneratePlanRequest, GeneratePlanResponse
from app.services.ai_client import (
    AIClientError,
    AIConnectionError,
    AIInvalidJSONError,
    AIMalformedResponseError,
    AITimeoutError,
)
from app.services.plan_generator import PlanStructureValidationError, generate_plan

router = APIRouter()


@router.post("/plan/generate", response_model=GeneratePlanResponse)
def generate_plan_endpoint(body: GeneratePlanRequest) -> GeneratePlanResponse:
    """Generate a structured checklist plan via the configured local model server."""
    try:
        return generate_plan(body)
    except AIConnectionError as exc:
        raise HTTPException(
            status_code=503,
            detail=str(exc),
        ) from exc
    except AITimeoutError as exc:
        raise HTTPException(
            status_code=504,
            detail=str(exc),
        ) from exc
    except (AIInvalidJSONError, AIMalformedResponseError) as exc:
        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc
    except PlanStructureValidationError as exc:
        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc
    except AIClientError as exc:
        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc
