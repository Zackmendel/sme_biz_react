from datetime import date, timedelta
from decimal import Decimal
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database.models.base import Base
from app.database.models.business import Business
from app.database.models.sale import Sale
from app.database.models.purchase import Purchase
from app.database.models.daily_summary import DailySummary
from app.database.models.accounting_cycle import AccountingCycle
from app.database.models.enums import (
    PeriodEnum,
    NigeriaCityList,
    BusinessIndustry,
    BusinessScale,
)
from app.analytics.aggregator import run_daily_aggregation, check_and_close_cycles
from app.reporting.pdf import generate_cycle_report_pdf

from sqlalchemy import event, text
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import JSONB

from sqlalchemy.schema import CreateColumn


@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"


@compiles(CreateColumn, "sqlite")
def compile_create_column_sqlite(element, compiler, **kw):
    # Intercept and clean up Postgres-specific server defaults for SQLite compatibility
    if element.element.server_default:
        val = str(element.element.server_default.arg)
        if "::jsonb" in val:
            element.element.server_default.arg = text("'[]'")
    return compiler.visit_create_column(element, **kw)


@pytest.fixture
def db_session():
    # Setup in-memory SQLite database for testing
    engine = create_engine("sqlite:///:memory:")

    # Attach a mock 'auth' schema for SQLite so it doesn't fail on auth.users DDL
    @event.listens_for(engine, "connect")
    def connect(dbapi_connection, connection_record):
        import uuid
        from datetime import datetime

        cursor = dbapi_connection.cursor()
        cursor.execute("ATTACH DATABASE ':memory:' AS auth")
        cursor.close()
        # Register postgres function compatibility adapters
        dbapi_connection.create_function("now", 0, lambda: datetime.now().isoformat())
        dbapi_connection.create_function(
            "gen_random_uuid", 0, lambda: str(uuid.uuid4())
        )

    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)


def test_daily_aggregation_and_cycle_close(db_session):
    # 1. Create a test business
    import uuid

    biz_id = uuid.uuid4()
    biz = Business(
        id=biz_id,
        name="Test SME",
        industry=BusinessIndustry.RETAIL,
        scale=BusinessScale.MICRO,
        city=NigeriaCityList.LAGOS,
    )
    db_session.add(biz)
    db_session.commit()

    # 2. Setup an accounting cycle
    cycle_start = date.today() - timedelta(days=1)
    cycle_end = date.today() - timedelta(days=1)
    cycle = AccountingCycle(
        id=uuid.uuid4(),
        business_id=biz.id,
        period_type=PeriodEnum.WEEKLY,
        start_date=cycle_start,
        end_date=cycle_end,
        balance_brought_forward=Decimal("100.00"),
        debts_accrued=Decimal("0.00"),
        is_closed=False,
    )
    db_session.add(cycle)
    db_session.commit()

    # 3. Add a sale and purchase on the target date
    target_date = cycle_start
    sale = Sale(
        id=uuid.uuid4(),
        business_id=biz.id,
        user_id=biz.id,  # dummy uuid for foreign key in test
        cycle_id=cycle.id,
        item_name="Bread",
        quantity=Decimal("5"),
        price_per_unit=Decimal("20.00"),
        discount=Decimal("0.00"),
        total=Decimal("100.00"),
        created_at=target_date,
    )
    purchase = Purchase(
        id=uuid.uuid4(),
        business_id=biz.id,
        user_id=biz.id,  # dummy uuid
        cycle_id=cycle.id,
        item_name="Flour",
        quantity=Decimal("2"),
        price_per_unit=Decimal("30.00"),
        total=Decimal("60.00"),
        created_at=target_date,
    )
    db_session.add(sale)
    db_session.add(purchase)
    db_session.commit()

    # 4. Run aggregation
    run_daily_aggregation(db_session, target_date)

    # Verify daily summary row
    summary = (
        db_session.query(DailySummary)
        .filter(
            DailySummary.business_id == biz.id, DailySummary.summary_date == target_date
        )
        .first()
    )

    assert summary is not None
    assert summary.total_sales == Decimal("100.00")
    assert summary.total_purchases == Decimal("60.00")
    assert summary.net == Decimal("40.00")
    assert summary.transaction_count == 2
    assert summary.top_item == "Bread"

    # 5. Check and close accounting cycle
    closed_cycles = check_and_close_cycles(db_session, target_date)

    assert len(closed_cycles) == 1
    assert closed_cycles[0].is_closed is True

    new_cycle = (
        db_session.query(AccountingCycle)
        .filter(
            AccountingCycle.business_id == biz.id,
            AccountingCycle.is_closed.is_(False),
        )
        .first()
    )

    assert new_cycle is not None
    assert new_cycle.start_date == target_date + timedelta(days=1)
    # 100 opening + 40 cycle net = 140.00
    assert new_cycle.balance_brought_forward == Decimal("140.00")
    assert new_cycle.debts_accrued == Decimal("0.00")


def test_weasyprint_pdf_generation(db_session):
    import uuid

    biz_id = uuid.uuid4()
    biz = Business(
        id=biz_id,
        name="Test Biz",
        industry=BusinessIndustry.RETAIL,
        scale=BusinessScale.MICRO,
        city=NigeriaCityList.LAGOS,
    )
    db_session.add(biz)
    db_session.commit()

    cycle = AccountingCycle(
        id=uuid.uuid4(),
        business_id=biz.id,
        period_type=PeriodEnum.WEEKLY,
        start_date=date.today(),
        end_date=date.today(),
        balance_brought_forward=Decimal("0.00"),
        debts_accrued=Decimal("0.00"),
        is_closed=False,
    )
    db_session.add(cycle)
    db_session.commit()

    summary = DailySummary(
        id=uuid.uuid4(),
        business_id=biz.id,
        summary_date=date.today(),
        total_sales=Decimal("500.00"),
        total_purchases=Decimal("200.00"),
        net=Decimal("300.00"),
        transaction_count=5,
        top_item="Widget",
    )

    pdf_bytes = generate_cycle_report_pdf(
        biz, cycle, [summary], "<p>Excellent performance.</p>"
    )
    assert len(pdf_bytes) > 0
    assert pdf_bytes.startswith(b"%PDF")
