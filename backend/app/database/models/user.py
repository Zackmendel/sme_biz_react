import uuid
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Enum, DateTime, ForeignKey, Boolean, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.models.base import Base
from app.database.models.enums import RoleEnum, StatusEnum

if TYPE_CHECKING:
    from app.database.models.business import Business
    from app.database.models.sale import Sale
    from app.database.models.purchase import Purchase
    from app.database.models.audit_trail import AuditTrail

from sqlalchemy import Table, Column

# Dummy table for auth.users to resolve SQLAlchemy's foreign key reference
auth_users = Table(
    "users",
    Base.metadata,
    Column("id", UUID(as_uuid=True), primary_key=True),
    schema="auth"
)

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    business_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=True,
    )
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    first_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    role: Mapped[RoleEnum] = mapped_column(
        Enum(RoleEnum, name="role_enum"),
        nullable=False,
        default=RoleEnum.VIEWER,
        server_default=text("'viewer'"),
    )
    status: Mapped[Optional[StatusEnum]] = mapped_column(
        Enum(StatusEnum, name="status_enum"),
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )

    business: Mapped[Optional["Business"]] = relationship("Business", back_populates="users")
    sales: Mapped[List["Sale"]] = relationship("Sale", back_populates="user")
    purchases: Mapped[List["Purchase"]] = relationship("Purchase", back_populates="user")
    audit_trails: Mapped[List["AuditTrail"]] = relationship("AuditTrail", back_populates="user")
