from datetime import date as date_type, timedelta
from typing import Optional
import structlog
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.config import settings
from app.analytics.aggregator import run_daily_aggregation, check_and_close_cycles
from app.reporting.narrative import generate_cycle_narrative
from app.reporting.pdf import generate_cycle_report_pdf
from app.reporting.telegram import send_telegram_report
from app.database.models.business import Business
from app.database.models.daily_summary import DailySummary

router = APIRouter(prefix="/reports", tags=["Reports & Aggregations"])
logger = structlog.get_logger()


def verify_scheduler_token(x_scheduler_token: Optional[str] = Header(None)):
    """
    Security check to ensure only authorized triggers (like Cloud Scheduler) can invoke EOD jobs.
    """
    if not settings.SCHEDULER_API_TOKEN:
        # If not configured, block by default
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Scheduler token security is not configured on backend",
        )
    if x_scheduler_token != settings.SCHEDULER_API_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid scheduler authentication token",
        )


@router.post("/trigger-daily", dependencies=[Depends(verify_scheduler_token)])
async def trigger_daily_job(
    target_date: Optional[str] = None, db: Session = Depends(get_db)
):
    """
    Triggers the daily transaction aggregation, performs anomaly/fraud check rules,
    closes expired accounting cycles, generates PDF performance summaries, and delivers
    them to configured Telegram chat IDs.
    """
    # 1. Parse target date (default to yesterday)
    if target_date:
        try:
            parsed_date = date_type.fromisoformat(target_date)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Date must be formatted as YYYY-MM-DD",
            )
    else:
        parsed_date = date_type.today() - timedelta(days=1)

    logger.info("nightly_job_started", target_date=parsed_date.isoformat())

    try:
        # 2. Run Daily transaction aggregation
        summaries = run_daily_aggregation(db, parsed_date)
        logger.info(
            "daily_aggregation_completed",
            target_date=parsed_date.isoformat(),
            daily_summaries_count=len(summaries),
        )

        # 3. Check and close accounting cycles whose end_date has passed
        closed_cycles = check_and_close_cycles(db, parsed_date)
        logger.info(
            "cycle_closing_completed",
            target_date=parsed_date.isoformat(),
            closed_cycles_count=len(closed_cycles),
        )

        reports_sent = []
        for cycle in closed_cycles:
            # Get business details
            biz = db.query(Business).filter(Business.id == cycle.business_id).first()
            if not biz:
                logger.warning(
                    "cycle_closing_missing_business",
                    cycle_id=str(cycle.id),
                    business_id=str(cycle.business_id),
                )
                continue

            # Get summaries for this cycle period
            cycle_summaries = (
                db.query(DailySummary)
                .filter(
                    DailySummary.business_id == biz.id,
                    DailySummary.summary_date >= cycle.start_date,
                    DailySummary.summary_date <= cycle.end_date,
                )
                .order_by(DailySummary.summary_date.asc())
                .all()
            )

            # Generate narrative summary using Gemini
            narrative = await generate_cycle_narrative(biz.name, cycle, cycle_summaries)

            # Generate report PDF via WeasyPrint
            pdf_bytes = generate_cycle_report_pdf(biz, cycle, cycle_summaries, narrative)

            # Determine target chat ID
            chat_id = settings.TELEGRAM_CHAT_ID

            # Deliver to Telegram
            success = send_telegram_report(
                chat_id=chat_id,
                message_text=f"📊 <b>Accounting Cycle Report Closed!</b>\n\nBusiness: <b>{biz.name}</b>\nPeriod: {cycle.period_type.value.capitalize()} ({cycle.start_date.isoformat()} to {cycle.end_date.isoformat()})\n\n{narrative}",
                pdf_bytes=pdf_bytes,
                filename=f"{biz.name.replace(' ', '_')}_{cycle.period_type.value}_cycle_report.pdf",
            )
            
            logger.info(
                "cycle_report_delivered",
                business_id=str(biz.id),
                business_name=biz.name,
                cycle_id=str(cycle.id),
                period=cycle.period_type.value,
                delivered=success,
            )
            
            reports_sent.append(
                {
                    "business_id": str(biz.id),
                    "business_name": biz.name,
                    "period": cycle.period_type.value,
                    "delivered": success,
                }
            )

        logger.info(
            "nightly_job_completed",
            target_date=parsed_date.isoformat(),
            daily_summaries_count=len(summaries),
            closed_cycles_count=len(closed_cycles),
            reports_sent_count=len(reports_sent),
        )

        return {
            "status": "success",
            "date": parsed_date.isoformat(),
            "daily_summaries_count": len(summaries),
            "closed_cycles_count": len(closed_cycles),
            "reports_sent": reports_sent,
        }
    except Exception as e:
        logger.error(
            "nightly_job_failed",
            target_date=parsed_date.isoformat(),
            error=str(e),
        )
        raise e
