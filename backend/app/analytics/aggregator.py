from datetime import date, timedelta
from decimal import Decimal
from typing import List
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database.models.business import Business
from app.database.models.sale import Sale
from app.database.models.purchase import Purchase
from app.database.models.daily_summary import DailySummary
from app.database.models.accounting_cycle import AccountingCycle
from app.database.models.enums import PeriodEnum
from app.analytics.anomaly import run_anomaly_checks


def run_daily_aggregation(db: Session, target_date: date) -> List[DailySummary]:
    """
    Aggregates transactions (sales, purchases) for a target date per business
    and upserts the results into daily_summaries.
    """
    businesses = db.query(Business).all()
    summaries = []

    for biz in businesses:
        # Sum sales total
        sales_data = (
            db.query(
                func.sum(Sale.total).label("total_sales"),
                func.count(Sale.id).label("sales_count"),
                func.count(func.distinct(Sale.customer_details)).label(
                    "unique_customers"
                ),
            )
            .filter(
                Sale.business_id == biz.id, func.date(Sale.created_at) == target_date
            )
            .first()
        )

        total_sales = Decimal(sales_data.total_sales or "0.00")
        sales_count = sales_data.sales_count or 0
        unique_customers = sales_data.unique_customers or 0

        # Sum purchases total
        purchases_data = (
            db.query(
                func.sum(Purchase.total).label("total_purchases"),
                func.count(Purchase.id).label("purchases_count"),
            )
            .filter(
                Purchase.business_id == biz.id,
                func.date(Purchase.created_at) == target_date,
            )
            .first()
        )

        total_purchases = Decimal(purchases_data.total_purchases or "0.00")
        purchases_count = purchases_data.purchases_count or 0

        # Determine top item
        top_item_row = (
            db.query(Sale.item_name, func.sum(Sale.quantity).label("total_qty"))
            .filter(
                Sale.business_id == biz.id, func.date(Sale.created_at) == target_date
            )
            .group_by(Sale.item_name)
            .order_by(func.sum(Sale.quantity).desc())
            .first()
        )

        top_item = top_item_row.item_name if top_item_row else None

        net = total_sales - total_purchases
        tx_count = sales_count + purchases_count

        # Upsert daily summary
        summary = (
            db.query(DailySummary)
            .filter(
                DailySummary.business_id == biz.id,
                DailySummary.summary_date == target_date,
            )
            .first()
        )

        if not summary:
            import uuid

            summary = DailySummary(
                id=uuid.uuid4(), business_id=biz.id, summary_date=target_date
            )
            db.add(summary)

        summary.total_sales = total_sales
        summary.total_purchases = total_purchases
        summary.net = net
        summary.transaction_count = tx_count
        summary.unique_customers = unique_customers
        summary.top_item = top_item

        db.commit()
        db.refresh(summary)
        summaries.append(summary)

        # Run nightly rules-based anomaly checks on transactions for this date
        run_anomaly_checks(db, biz.id, target_date)

    return summaries


def get_next_cycle_dates(
    period_type: PeriodEnum, start_date: date
) -> tuple[date, date]:
    """
    Calculates the start and end date of the next cycle based on period type.
    """
    if period_type == PeriodEnum.DAILY:
        return start_date, start_date
    elif period_type == PeriodEnum.WEEKLY:
        return start_date, start_date + timedelta(days=6)
    elif period_type == PeriodEnum.MONTHLY:
        # End of current month
        if start_date.month == 12:
            end_date = date(start_date.year, 12, 31)
        else:
            end_date = date(start_date.year, start_date.month + 1, 1) - timedelta(
                days=1
            )
        return start_date, end_date
    elif period_type == PeriodEnum.QUARTERLY:
        # End of quarter (3 months)
        month = start_date.month
        year = start_date.year
        # Find next quarter start month
        next_q_month = ((month - 1) // 3 + 1) * 3 + 1
        if next_q_month > 12:
            end_date = date(year, 12, 31)
        else:
            end_date = date(year, next_q_month, 1) - timedelta(days=1)
        return start_date, end_date
    elif period_type == PeriodEnum.YEARLY:
        return start_date, date(start_date.year, 12, 31)

    return start_date, start_date


def check_and_close_cycles(db: Session, target_date: date) -> List[AccountingCycle]:
    """
    Closes cycles whose end_date has passed, rolls balances/deficits forward,
    and opens a new cycle of the same period type.
    """
    closed_cycles = []

    cycles_to_close = (
        db.query(AccountingCycle)
        .filter(
            AccountingCycle.is_closed.is_(False),
            AccountingCycle.end_date <= target_date,
        )
        .all()
    )

    for cycle in cycles_to_close:
        cycle.is_closed = True

        # Calculate closing net balance across daily summaries in the cycle range
        cycle_net = db.query(func.sum(DailySummary.net)).filter(
            DailySummary.business_id == cycle.business_id,
            DailySummary.summary_date >= cycle.start_date,
            DailySummary.summary_date <= cycle.end_date,
        ).scalar() or Decimal("0.00")

        # Roll forward calculations
        carried_balance = cycle.balance_brought_forward + cycle_net
        next_debt = Decimal("0.00")

        # Roll deficit into debts_accrued if overall balance goes negative
        if carried_balance < 0:
            next_debt = abs(carried_balance)
            carried_balance = Decimal("0.00")

        # Define start of new cycle
        next_start = cycle.end_date + timedelta(days=1)
        next_start, next_end = get_next_cycle_dates(cycle.period_type, next_start)

        # Create new cycle
        new_cycle = AccountingCycle(
            business_id=cycle.business_id,
            period_type=cycle.period_type,
            start_date=next_start,
            end_date=next_end,
            balance_brought_forward=carried_balance,
            debts_accrued=next_debt,
            is_closed=False,
        )
        db.add(new_cycle)
        db.commit()

        closed_cycles.append(cycle)

    return closed_cycles
