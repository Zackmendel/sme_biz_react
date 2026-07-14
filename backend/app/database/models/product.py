import uuid
from typing import Optional, List, TYPE_CHECKING
from decimal import Decimal
from sqlalchemy import String, Numeric, ForeignKey, Boolean, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.models.base import Base

if TYPE_CHECKING:
    from app.database.models.business import Business
    from app.database.models.sale import Sale
    from app.database.models.purchase import Purchase


class Product(Base):
    __tablename__ = "products"

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
    name: Mapped[str] = mapped_column(String, nullable=False)
    default_price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )
    unit: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_archived: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )

    business: Mapped["Business"] = relationship("Business", back_populates="products")
    sales: Mapped[List["Sale"]] = relationship("Sale", back_populates="product")
    purchases: Mapped[List["Purchase"]] = relationship(
        "Purchase", back_populates="product"
    )
