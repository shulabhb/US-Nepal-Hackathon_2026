from fastapi import APIRouter

from app.schemas.chat import GenerateChatReplyRequest, GenerateChatReplyResponse
from app.services.chat_generator import generate_chat_reply

router = APIRouter(prefix="/chat")


@router.post("/reply", response_model=GenerateChatReplyResponse)
def chat_reply(body: GenerateChatReplyRequest) -> GenerateChatReplyResponse:
    """Support chat turn via local model; uses safe fallback when the model is unavailable."""
    return generate_chat_reply(body)
