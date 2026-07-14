from datetime import date, datetime, timedelta
import uuid
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database.models.sale import Sale
from app.database.models.purchase import Purchase
from app.database.models.product import Product
from app.database.models.audit_trail import AuditTrail
from app.database.models.user import User


def run_anomaly_checks(db: Session, business_id: uuid.UUID, target_date: date) -> None:
    """
    Runs nightly rules-based anomaly checks on transactions for a business and target date.
    Flags entries if they violate defined heuristics:
      - Price override (sale price deviates > 20% from product's default_price)
      - Off-hours entry (created between 10 PM and 5 AM)
      - Quantity spike (quantity > 100 or quantity > 5x the average transaction quantity)
      - Rapid update-after-create (created and updated within 5 minutes based on audit trail)
      - Added/modified by a non-admin/non-owner (based on user roles)
    """
    # 1. Fetch average quantity for baseline quantity spikes
    avg_sale_qty = db.query(func.avg(Sale.quantity)).filter(Sale.business_id == business_id).scalar() or 10.0
    avg_purch_qty = db.query(func.avg(Purchase.quantity)).filter(Purchase.business_id == business_id).scalar() or 10.0

    # 2. Query non-admin/owner user IDs
    non_admin_users = db.query(User.id).filter(
        User.business_id == business_id,
        User.role.notin_(["owner", "admin"])
    ).all()
    non_admin_user_ids = {u[0] for u in non_admin_users}

    # 3. Query audit trail for rapid updates (created and updated within 5 mins)
    start_dt = datetime.combine(target_date, datetime.min.time())
    end_dt = datetime.combine(target_date, datetime.max.time())
    
    rapidly_edited_records = set()
    inserts = db.query(AuditTrail).filter(
        AuditTrail.business_id == business_id,
        AuditTrail.action == "INSERT",
        AuditTrail.changed_at >= start_dt,
        AuditTrail.changed_at <= end_dt
    ).all()

    for ins in inserts:
        # Find updates to this record
        updates = db.query(AuditTrail).filter(
            AuditTrail.business_id == business_id,
            AuditTrail.record_id == ins.record_id,
            AuditTrail.action == "UPDATE",
            AuditTrail.changed_at >= ins.changed_at,
            AuditTrail.changed_at <= ins.changed_at + timedelta(minutes=5)
        ).all()
        if updates:
            rapidly_edited_records.add(ins.record_id)

    # 4. Check Sales
    sales = (
        db.query(Sale)
        .filter(Sale.business_id == business_id)
        .all()
    )
    for s in sales:
        if s.created_at.date() != target_date:
            continue

        reasons = []
        
        # Rule A: Price override (> 20% deviation)
        if s.product_id:
            product = db.query(Product).filter(Product.id == s.product_id).first()
            if product and product.default_price > 0:
                deviation = float(abs(s.price_per_unit - product.default_price) / product.default_price)
                if deviation > 0.20:
                    reasons.append("price_override")

        # Rule B: Off-hours entry (10 PM to 5 AM)
        if s.created_at.hour >= 22 or s.created_at.hour < 5:
            reasons.append("off_hours")

        # Rule C: Quantity spike
        if s.quantity > 100 or s.quantity > (avg_sale_qty * 5):
            reasons.append("quantity_spike")

        # Rule D: Non-admin added/modified
        if s.user_id in non_admin_user_ids:
            reasons.append("non_admin_action")

        # Rule E: Rapid update
        if s.id in rapidly_edited_records:
            reasons.append("rapid_edit")

        if reasons:
            s.is_flagged = True

    # 5. Check Purchases
    purchases = (
        db.query(Purchase)
        .filter(Purchase.business_id == business_id)
        .all()
    )
    for p in purchases:
        if p.created_at.date() != target_date:
            continue

        reasons = []

        # Rule B: Off-hours entry
        if p.created_at.hour >= 22 or p.created_at.hour < 5:
            reasons.append("off_hours")

        # Rule C: Quantity spike
        if p.quantity > 100 or p.quantity > (avg_purch_qty * 5):
            reasons.append("quantity_spike")

        # Rule D: Non-admin added/modified
        if p.user_id in non_admin_user_ids:
            reasons.append("non_admin_action")

        # Rule E: Rapid update
        if p.id in rapidly_edited_records:
            reasons.append("rapid_edit")

        if reasons:
            p.is_flagged = True

    db.commit()
