from datetime import date
import uuid
from sqlalchemy.orm import Session
from app.database.models.sale import Sale
from app.database.models.purchase import Purchase


def run_anomaly_checks(db: Session, business_id: uuid.UUID, target_date: date) -> None:
    """
    Runs nightly rules-based anomaly checks on transactions for a business and target date.
    Flags entries if they violate defined heuristics (e.g. quantity spikes or large transactions).
    """
    # Heuristic 1: Flag sales with quantity > 100
    sales = (
        db.query(Sale)
        .filter(Sale.business_id == business_id, Sale.is_flagged.is_(False))
        .all()
    )
    for s in sales:
        if s.created_at.date() == target_date and s.quantity > 100:
            s.is_flagged = True

    # Heuristic 2: Flag purchases with quantity > 100
    purchases = (
        db.query(Purchase)
        .filter(Purchase.business_id == business_id, Purchase.is_flagged.is_(False))
        .all()
    )
    for p in purchases:
        if p.created_at.date() == target_date and p.quantity > 100:
            p.is_flagged = True

    db.commit()
