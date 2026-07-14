import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Enum, Numeric, ForeignKey, DateTime, Boolean, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.models.base import Base
from app.database.models.enums import PaymentType

if TYPE_CHECKING:
    from app.database.models.business import Business
    from app.database.models.user import User
    from app.database.models.accounting_cycle import AccountingCycle
    from app.database.models.product import Product


class Sale(Base):
    __tablename__ = "sales"

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
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )
    cycle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("accounting_cycles.id"),
        nullable=False,
    )
    product_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id"),
        nullable=True,
    )
    item_name: Mapped[str] = mapped_column(String, nullable=False)
    customer_details: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    price_per_unit: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    discount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=Decimal("0.00"),
        server_default=text("0"),
    )
    total: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    payment_type: Mapped[PaymentType] = mapped_column(
        Enum(
            PaymentType,
            name="payment_type",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=PaymentType.CASH,
        server_default=text("'cash'"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )
    is_flagged: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )

    business: Mapped["Business"] = relationship("Business", back_populates="sales")
    user: Mapped["User"] = relationship("User", back_populates="sales")
    accounting_cycle: Mapped["AccountingCycle"] = relationship(
        "AccountingCycle", back_populates="sales"
    )
    product: Mapped[Optional["Product"]] = relationship(
        "Product", back_populates="sales"
    )
