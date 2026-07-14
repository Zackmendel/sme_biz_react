from datetime import date
from typing import List, Optional, Dict, Any
from pydantic_ai import RunContext
from app.assistant.agent import agent
from app.assistant.deps import BusinessAgentDeps
from app.analytics.queries import (
    query_daily_summaries,
    query_sales,
    query_purchases,
    query_debtors,
)


@agent.tool
def get_daily_summaries(
    ctx: RunContext[BusinessAgentDeps],
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> List[Dict[str, Any]]:
    """
    Fetch the pre-aggregated daily summaries of sales, purchases, net position,
    transaction counts, and unique customer counts for a date range.
    Use this for aggregations spanning more than a couple of days.
    """
    records = query_daily_summaries(
        ctx.deps.db,
        ctx.deps.business_id,
        start_date,
        end_date,
    )
    result = []
    for r in records:
        data = {
            "id": str(r.id),
            "summary_date": r.summary_date.isoformat(),
            "total_sales": float(r.total_sales),
            "total_purchases": float(r.total_purchases),
            "net": float(r.net),
            "transaction_count": r.transaction_count,
            "unique_customers": r.unique_customers,
            "top_item": r.top_item,
        }
        ctx.deps.record_row(
            "daily_summaries", str(r.id), r.summary_date.isoformat(), data
        )
        result.append(data)
    return result


@agent.tool
def get_sales(
    ctx: RunContext[BusinessAgentDeps],
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    product_id: Optional[str] = None,
    customer_details: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Fetch detailed sales ledger transactions, optionally filtered by date range,
    product ID, or customer details.
    """
    records = query_sales(
        ctx.deps.db,
        ctx.deps.business_id,
        start_date,
        end_date,
        product_id,
        customer_details,
    )
    result = []
    for r in records:
        data = {
            "id": str(r.id),
            "product_id": str(r.product_id) if r.product_id else None,
            "item_name": r.item_name,
            "customer_details": r.customer_details,
            "quantity": float(r.quantity),
            "price_per_unit": float(r.price_per_unit),
            "discount": float(r.discount),
            "payment_type": r.payment_type.value if r.payment_type else None,
            "total": float(r.total),
            "created_at": r.created_at.isoformat(),
        }
        ctx.deps.record_row("sales", str(r.id), r.created_at.date().isoformat(), data)
        result.append(data)
    return result


@agent.tool
def get_purchases(
    ctx: RunContext[BusinessAgentDeps],
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    product_id: Optional[str] = None,
    vendor_details: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Fetch detailed purchases ledger transactions, optionally filtered by date range,
    product ID, or vendor details.
    """
    records = query_purchases(
        ctx.deps.db,
        ctx.deps.business_id,
        start_date,
        end_date,
        product_id,
        vendor_details,
    )
    result = []
    for r in records:
        data = {
            "id": str(r.id),
            "product_id": str(r.product_id) if r.product_id else None,
            "item_name": r.item_name,
            "vendor_details": r.vendor_details,
            "quantity": float(r.quantity),
            "price_per_unit": float(r.price_per_unit),
            "total": float(r.total),
            "created_at": r.created_at.isoformat(),
        }
        ctx.deps.record_row(
            "purchases", str(r.id), r.created_at.date().isoformat(), data
        )
        result.append(data)
    return result


@agent.tool
def get_debtors(
    ctx: RunContext[BusinessAgentDeps],
    is_paid: Optional[bool] = None,
) -> List[Dict[str, Any]]:
    """
    Fetch customer debt tracking ledger details, optionally filtering by active/paid status.
    """
    records = query_debtors(
        ctx.deps.db,
        ctx.deps.business_id,
        is_paid,
    )
    result = []
    for r in records:
        data = {
            "id": r.id,
            "customer_name": r.customer_name,
            "amount_naira": float(r.amount) / 100.0,  # converted from kobo
            "is_paid": r.is_paid,
            "paid_at": r.paid_at.isoformat() if r.paid_at else None,
            "created_at": r.created_at.isoformat(),
        }
        ctx.deps.record_row("debtors", str(r.id), r.created_at.date().isoformat(), data)
        result.append(data)
    return result
