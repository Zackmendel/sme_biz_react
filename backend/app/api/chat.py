from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uuid

from app.database.session import get_db
from app.auth.dependencies import get_current_user
from app.database.models.user import User
from app.database.models.chat_thread import ChatThread
from app.database.models.chat_message import ChatMessage
from app.chat.orchestrator import orchestrate_chat_turn

router = APIRouter(prefix="/chat", tags=["AI Chat"])


class CreateThreadRequest(BaseModel):
    title: Optional[str] = None


class ThreadResponse(BaseModel):
    id: uuid.UUID
    title: str
    created_at: str


class MessageResponse(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    citations: List[Dict[str, Any]]
    created_at: str


class ChatStreamRequest(BaseModel):
    threadId: uuid.UUID
    messages: List[Dict[str, Any]]


@router.get("/threads", response_model=List[ThreadResponse])
async def list_threads(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    List all chat threads belonging to the current user's business.
    """
    if not current_user.business_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with any business",
        )

    threads = (
        db.query(ChatThread)
        .filter(ChatThread.business_id == current_user.business_id)
        .order_by(ChatThread.created_at.desc())
        .all()
    )

    return [
        ThreadResponse(id=t.id, title=t.title, created_at=t.created_at.isoformat())
        for t in threads
    ]


@router.post("/threads", response_model=ThreadResponse)
async def create_thread(
    payload: CreateThreadRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new chat thread for the user's business.
    """
    if not current_user.business_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with any business",
        )

    title = payload.title or f"Chat on {uuid.uuid4().hex[:6]}"
    thread = ChatThread(
        business_id=current_user.business_id, user_id=current_user.id, title=title
    )
    db.add(thread)
    db.commit()
    db.refresh(thread)

    return ThreadResponse(
        id=thread.id, title=thread.title, created_at=thread.created_at.isoformat()
    )


@router.get("/threads/{thread_id}/history", response_model=List[MessageResponse])
async def get_thread_history(
    thread_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Load message history for a specific chat thread.
    """
    if not current_user.business_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with any business",
        )

    thread = (
        db.query(ChatThread)
        .filter(
            ChatThread.id == thread_id,
            ChatThread.business_id == current_user.business_id,
        )
        .first()
    )

    if not thread:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat thread not found or access denied",
        )

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.thread_id == thread_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )

    return [
        MessageResponse(
            id=m.id,
            role=m.role,
            content=m.content,
            citations=m.citations,
            created_at=m.created_at.isoformat(),
        )
        for m in messages
    ]


@router.post("/stream")
async def stream_chat_response(
    payload: ChatStreamRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Streams the assistant's turn response. Accepts Vercel AI SDK compatible message payloads,
    coordinates execution, validates grounding, and streams text deltas and citations.
    """
    if not current_user.business_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with any business",
        )

    return StreamingResponse(
        orchestrate_chat_turn(
            db=db,
            business_id=str(current_user.business_id),
            user_id=str(current_user.id),
            thread_id=payload.threadId,
            messages=payload.messages,
        ),
        media_type="text/plain",
    )
