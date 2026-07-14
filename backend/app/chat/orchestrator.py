import asyncio
import time
from typing import AsyncGenerator, List, Dict, Any
import structlog
from sqlalchemy.orm import Session
from app.database.models.chat_thread import ChatThread
from app.database.models.chat_message import ChatMessage
from app.assistant.agent import agent
from app.assistant.deps import BusinessAgentDeps
from app.grounding.validator import validate_grounding
from app.chat.streaming import format_text_part, format_data_part, format_error_part

logger = structlog.get_logger()


async def orchestrate_chat_turn(
    db: Session,
    business_id: str,
    user_id: str,
    thread_id: str,
    messages: List[Dict[str, Any]],
) -> AsyncGenerator[str, None]:
    """
    Coordinates one chat turn end-to-end:
    1. Loads / verifies the thread.
    2. Saves the new user message.
    3. Runs the LLM agent turn grounded on database tools.
    4. Validates grounding.
    5. Saves assistant reply and citations.
    6. Streams response chunks and citation metadata to the client.
    """
    start_time = time.perf_counter()
    user_message_text = ""
    try:
        # 1. Verify thread belongs to this business
        thread = (
            db.query(ChatThread)
            .filter(ChatThread.id == thread_id, ChatThread.business_id == business_id)
            .first()
        )

        if not thread:
            # Create a thread if not exists
            thread = ChatThread(
                id=thread_id,
                business_id=business_id,
                user_id=user_id,
                title="AI Operations Assistant Thread",
            )
            db.add(thread)
            db.commit()
            db.refresh(thread)

        # 2. Extract and save the user's latest message
        user_message_data = messages[-1]
        user_message_text = user_message_data.get("content", "")

        logger.info(
            "chat_turn_started",
            business_id=business_id,
            user_id=user_id,
            thread_id=str(thread.id),
            user_message_length=len(user_message_text),
        )

        user_msg = ChatMessage(
            thread_id=thread.id,
            role="user",
            content=user_message_text,
            citations=[],
        )
        db.add(user_msg)
        db.commit()

        # 3. Format history context for the prompt
        history_context = ""
        # Get last 8 messages for context
        history = (
            db.query(ChatMessage)
            .filter(ChatMessage.thread_id == thread.id)
            .order_by(ChatMessage.created_at.asc())
            .all()[:-1]
        )  # exclude the user message we just saved

        for m in history:
            history_context += f"{m.role.upper()}: {m.content}\n\n"

        full_prompt = (
            f"Conversation History:\n{history_context}User's query: {user_message_text}"
        )

        # 4. Instantiate dependencies and run the PydanticAI agent
        deps = BusinessAgentDeps(db=db, business_id=business_id, user_id=user_id)

        # Run agent
        result = await agent.run(full_prompt, deps=deps)
        grounded_result = result.output

        # 5. Validate grounding
        validate_grounding(grounded_result, deps.queried_rows)

        # 6. Save assistant message and citations
        serialized_citations = [c.model_dump() for c in grounded_result.citations]
        assistant_msg = ChatMessage(
            thread_id=thread.id,
            role="assistant",
            content=grounded_result.answer,
            citations=serialized_citations,
        )
        db.add(assistant_msg)
        db.commit()

        elapsed_seconds = time.perf_counter() - start_time
        logger.info(
            "chat_turn_completed",
            business_id=business_id,
            user_id=user_id,
            thread_id=str(thread.id),
            elapsed_seconds=elapsed_seconds,
            response_length=len(grounded_result.answer),
            citations_count=len(serialized_citations),
        )

        # 7. Stream response deltas simulating text arrival
        answer = grounded_result.answer
        # Split into small parts to simulate stream chunking
        chunk_size = 8
        for i in range(0, len(answer), chunk_size):
            chunk = answer[i : i + chunk_size]
            yield format_text_part(chunk)
            await asyncio.sleep(
                0.01
            )  # small yield sleep for fluid streaming experience

        # Yield custom citations part
        yield format_data_part(serialized_citations)

    except Exception as e:
        db.rollback()
        elapsed_seconds = time.perf_counter() - start_time
        logger.error(
            "chat_turn_failed",
            business_id=business_id,
            user_id=user_id,
            thread_id=thread_id,
            elapsed_seconds=elapsed_seconds,
            error=str(e),
            user_message_sample=user_message_text[:100],
        )
        # Stream the error event cleanly
        yield format_error_part(f"Failed to process chat: {str(e)}")
        raise e
