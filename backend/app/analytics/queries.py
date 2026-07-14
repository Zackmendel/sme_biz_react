from datetime import date
from typing import List, Optional
from sqlalchemy.orm import Session
from app.database.models.sale import Sale
from app.database.models.purchase import Purchase
from app.database.models.debtor import Debtor
from app.database.models.daily_summary import DailySummary


def query_daily_summaries(
    db: Session,
    business_id: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> List[DailySummary]:
    """
    Fetch daily summaries for a business, optionally filtered by date range.
    """
    query = db.query(DailySummary).filter(DailySummary.business_id == business_id)
    if start_date:
        query = query.filter(DailySummary.summary_date >= start_date)
    if end_date:
        query = query.filter(DailySummary.summary_date <= end_date)
    return query.order_by(DailySummary.summary_date.asc()).all()


def query_sales(
    db: Session,
    business_id: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    product_id: Optional[str] = None,
    customer_details: Optional[str] = None,
) -> List[Sale]:
    """
    Fetch sales records for a business with optional search parameters.
    """
    query = db.query(Sale).filter(Sale.business_id == business_id)
    if start_date:
        query = query.filter(Sale.created_at >= start_date)
    if end_date:
        query = query.filter(Sale.created_at <= end_date)
    if product_id:
        query = query.filter(Sale.product_id == product_id)
    if customer_details:
        query = query.filter(Sale.customer_details.ilike(f"%{customer_details}%"))
    return query.order_by(Sale.created_at.desc()).all()


def query_purchases(
    db: Session,
    business_id: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    product_id: Optional[str] = None,
    vendor_details: Optional[str] = None,
) -> List[Purchase]:
    """
    Fetch purchases records for a business with optional search parameters.
    """
    query = db.query(Purchase).filter(Purchase.business_id == business_id)
    if start_date:
        query = query.filter(Purchase.created_at >= start_date)
    if end_date:
        query = query.filter(Purchase.created_at <= end_date)
    if product_id:
        query = query.filter(Purchase.product_id == product_id)
    if vendor_details:
        query = query.filter(Purchase.vendor_details.ilike(f"%{vendor_details}%"))
    return query.order_by(Purchase.created_at.desc()).all()


def query_debtors(
    db: Session,
    business_id: str,
    is_paid: Optional[bool] = None,
) -> List[Debtor]:
    """
    Fetch debtors records for a business.
    """
    query = db.query(Debtor).filter(Debtor.business_id == business_id)
    if is_paid is not None:
        query = query.filter(Debtor.is_paid == is_paid)
    return query.order_by(Debtor.created_at.desc()).all()
