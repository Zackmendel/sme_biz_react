import uuid
from datetime import datetime
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Enum, DateTime, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.models.base import Base
from app.database.models.enums import BusinessIndustry, BusinessScale, NigeriaCityList

if TYPE_CHECKING:
    from app.database.models.user import User
    from app.database.models.product import Product
    from app.database.models.accounting_cycle import AccountingCycle
    from app.database.models.sale import Sale
    from app.database.models.purchase import Purchase
    from app.database.models.debtor import Debtor
    from app.database.models.daily_summary import DailySummary
    from app.database.models.audit_trail import AuditTrail

class Business(Base):
    __tablename__ = "businesses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    owner_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    industry: Mapped[BusinessIndustry] = mapped_column(
        Enum(BusinessIndustry, name="business_industry"),
        nullable=False,
    )
    scale: Mapped[BusinessScale] = mapped_column(
        Enum(BusinessScale, name="business_scale"),
        nullable=False,
    )
    phone: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String, unique=True, nullable=True)
    city: Mapped[NigeriaCityList] = mapped_column(
        Enum(NigeriaCityList, name="nigeria_city_list"),
        nullable=False,
    )
    address: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    proof_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )

    users: Mapped[List["User"]] = relationship("User", back_populates="business", cascade="all, delete-orphan")
    products: Mapped[List["Product"]] = relationship("Product", back_populates="business", cascade="all, delete-orphan")
    accounting_cycles: Mapped[List["AccountingCycle"]] = relationship("AccountingCycle", back_populates="business", cascade="all, delete-orphan")
    sales: Mapped[List["Sale"]] = relationship("Sale", back_populates="business", cascade="all, delete-orphan")
    purchases: Mapped[List["Purchase"]] = relationship("Purchase", back_populates="business", cascade="all, delete-orphan")
    debtors: Mapped[List["Debtor"]] = relationship("Debtor", back_populates="business", cascade="all, delete-orphan")
    daily_summaries: Mapped[List["DailySummary"]] = relationship("DailySummary", back_populates="business", cascade="all, delete-orphan")
    audit_trails: Mapped[List["AuditTrail"]] = relationship("AuditTrail", back_populates="business", cascade="all, delete-orphan")
