import uuid
from datetime import date
from decimal import Decimal
from typing import List, TYPE_CHECKING
from sqlalchemy import Date, Enum, Numeric, ForeignKey, Boolean, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.models.base import Base
from app.database.models.enums import PeriodEnum

if TYPE_CHECKING:
    from app.database.models.business import Business
    from app.database.models.sale import Sale
    from app.database.models.purchase import Purchase

class AccountingCycle(Base):
    __tablename__ = "accounting_cycles"

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
    period_type: Mapped[PeriodEnum] = mapped_column(
        Enum(PeriodEnum, name="period_enum"),
        nullable=False,
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    balance_brought_forward: Mapped[Decimal] = mapped_column(
        Numeric(14, 2),
        nullable=False,
        default=Decimal("0.00"),
        server_default=text("0"),
    )
    debts_accrued: Mapped[Decimal] = mapped_column(
        Numeric(14, 2),
        nullable=False,
        default=Decimal("0.00"),
        server_default=text("0"),
    )
    is_closed: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )

    business: Mapped["Business"] = relationship("Business", back_populates="accounting_cycles")
    sales: Mapped[List["Sale"]] = relationship("Sale", back_populates="accounting_cycle")
    purchases: Mapped[List["Purchase"]] = relationship("Purchase", back_populates="accounting_cycle")
