from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import ai, chat, checkins, health, plans
from app.core.config import settings

app = FastAPI(
    title="Burnout Radar API",
    version="0.1.0",
    description="Anonymous check-in backend — auth and profiles not implemented yet.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["health"])
app.include_router(checkins.router, prefix="/checkins", tags=["checkins"])
app.include_router(ai.router, prefix="/ai", tags=["ai"])
app.include_router(chat.router, prefix="/ai", tags=["ai"])
app.include_router(plans.router, prefix="/plans", tags=["plans"])
