"""
Chat endpoints for AI-powered health consultations.

NOTE: This router is not currently mounted in main.py. Kept for future feature activation.
All endpoints are pre-wired with Supabase JWT authentication (get_current_user).
"""

from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import SupabaseUser, get_current_user
from app.core.database import get_db
from app.core.logging import get_logger
from app.models.health import ChatMessage, ChatSession
from app.services.chat_service import ChatService

# Create router
router = APIRouter()

# Get logger
logger = get_logger(__name__)


@router.post(
    "/sessions",
    response_model=ChatSession,
    summary="Create Chat Session",
    description="Create a new AI chat session for health consultation."
)
async def create_chat_session(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: SupabaseUser = Depends(get_current_user),
    title: str = "Health Consultation"
) -> Any:
    """Create a new chat session for the authenticated user."""
    user_id = current_user.user_id
    try:
        chat_service = ChatService(db)
        session = await chat_service.create_session(user_id, title)
        return session
    except Exception as e:
        logger.error(f"Failed to create chat session: {e}")
        raise HTTPException(status_code=500, detail="Failed to create chat session") from e


@router.post(
    "/message",
    response_model=ChatMessage,
    summary="Send Chat Message",
    description="Send a message to the AI health assistant and get a response."
)
async def send_message(
    *,
    db: AsyncSession = Depends(get_db),
    session_id: str,
    message: str,
    current_user: SupabaseUser = Depends(get_current_user),
) -> Any:
    """Send message to AI assistant."""
    user_id = current_user.user_id
    try:
        chat_service = ChatService(db)
        response = await chat_service.process_message(session_id, message, user_id)
        return response
    except Exception as e:
        logger.error(f"Failed to process chat message: {e}")
        raise HTTPException(status_code=500, detail="Failed to process message") from e


@router.get(
    "/sessions/{session_id}/messages",
    response_model=List[ChatMessage],
    summary="Get Chat Messages",
    description="Retrieve all messages from a chat session."
)
async def get_chat_messages(
    *,
    db: AsyncSession = Depends(get_db),
    session_id: str,
    current_user: SupabaseUser = Depends(get_current_user),
) -> Any:
    """Get messages from chat session."""
    user_id = current_user.user_id
    try:
        chat_service = ChatService(db)
        messages = await chat_service.get_session_messages(session_id, user_id)
        return messages
    except Exception as e:
        logger.error(f"Failed to get chat messages: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve messages") from e
