import uuid
from datetime import datetime
from typing import Optional, Any, TYPE_CHECKING
from sqlalchemy import String, ForeignKey, DateTime, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.models.base import Base

if TYPE_CHECKING:
    from app.database.models.business import Business
    from app.database.models.user import User

class AuditTrail(Base):
    __tablename__ = "audit_trail"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    business_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
    )
    table_name: Mapped[str] = mapped_column(String, nullable=False)
    record_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    action: Mapped[str] = mapped_column(String, nullable=False)
    before_value: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)
    after_value: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )

    business: Mapped["Business"] = relationship("Business", back_populates="audit_trails")
    user: Mapped[Optional["User"]] = relationship("User", back_populates="audit_trails")
