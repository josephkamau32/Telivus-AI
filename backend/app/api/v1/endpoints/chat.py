"""
Chat endpoints for AI-powered health consultations.

Provides real-time chat functionality with LangChain agents.
"""

from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.health import ChatMessage, ChatSession
from app.services.chat_service import ChatService
from app.core.logging import get_logger

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
    user_id: str,
    title: str = "Health Consultation"
) -> Any:
    """Create a new chat session."""
    try:
        chat_service = ChatService(db)
        session = await chat_service.create_session(user_id, title)
        return session
    except Exception as e:
        logger.error(f"Failed to create chat session: {e}")
        raise HTTPException(status_code=500, detail="Failed to create chat session")


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
    user_id: str
) -> Any:
    """Send message to AI assistant."""
    try:
        chat_service = ChatService(db)
        response = await chat_service.process_message(session_id, message, user_id)
        return response
    except Exception as e:
        logger.error(f"Failed to process chat message: {e}")
        raise HTTPException(status_code=500, detail="Failed to process message")


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
    user_id: str
) -> Any:
    """Get messages from chat session."""
    try:
        chat_service = ChatService(db)
        messages = await chat_service.get_session_messages(session_id, user_id)
        return messages
    except Exception as e:
        logger.error(f"Failed to get chat messages: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve messages")