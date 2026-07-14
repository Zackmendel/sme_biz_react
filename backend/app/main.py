from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.chat import router as chat_router

app = FastAPI(
    title="SME Biz Analyst API",
    description="Backend API for SME Biz Analyst accounting and AI assistant service",
    version="1.0.0",
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)


@app.get("/health", tags=["Health"])
async def health_check():
    """Simple health check endpoint to verify backend status."""
    return {"status": "ok"}
