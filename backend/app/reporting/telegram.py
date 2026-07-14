import httpx
import time
import structlog
from typing import Optional
from app.config import settings

logger = structlog.get_logger()


def send_telegram_report(
    chat_id: str,
    message_text: str,
    pdf_bytes: Optional[bytes] = None,
    filename: str = "cycle_report.pdf",
) -> bool:
    # Sanitize message_text to strip unsupported paragraph tags for Telegram HTML parse_mode
    message_text = message_text.replace("<p>", "").replace("</p>", "\n\n")

    if (
        not settings.TELEGRAM_BOT_TOKEN
        or settings.TELEGRAM_BOT_TOKEN == "your-telegram-bot-token"
    ):
        logger.warning(
            "Telegram Bot Token is not configured. Skipping message delivery."
        )
        return False

    if not chat_id or chat_id == "your-telegram-chat-id":
        logger.warning("Telegram Chat ID is not configured. Skipping message delivery.")
        return False

    base_url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}"
    max_retries = 3

    # Send narrative text message
    text_sent = False
    for attempt in range(1, max_retries + 1):
        try:
            logger.info("Sending narrative message to Telegram", attempt=attempt)
            response = httpx.post(
                f"{base_url}/sendMessage",
                json={"chat_id": chat_id, "text": message_text, "parse_mode": "HTML"},
                timeout=10.0,
            )
            if response.status_code == 200:
                text_sent = True
                logger.info("Narrative message sent successfully to Telegram")
                break
            else:
                logger.error(
                    "Telegram sendMessage failed",
                    status_code=response.status_code,
                    body=response.text,
                )
        except Exception as e:
            logger.error("Exception sending message to Telegram", error=str(e))

        if attempt < max_retries:
            time.sleep(2**attempt)

    # Send PDF document if provided
    pdf_sent = False
    if pdf_bytes and text_sent:
        for attempt in range(1, max_retries + 1):
            try:
                logger.info("Sending report PDF to Telegram", attempt=attempt)
                files = {"document": (filename, pdf_bytes, "application/pdf")}
                data = {"chat_id": chat_id}

                response = httpx.post(
                    f"{base_url}/sendDocument", data=data, files=files, timeout=20.0
                )
                if response.status_code == 200:
                    pdf_sent = True
                    logger.info("Report PDF sent successfully to Telegram")
                    break
                else:
                    logger.error(
                        "Telegram sendDocument failed",
                        status_code=response.status_code,
                        body=response.text,
                    )
            except Exception as e:
                logger.error("Exception sending PDF to Telegram", error=str(e))

            if attempt < max_retries:
                time.sleep(2**attempt)

    return text_sent and (pdf_bytes is None or pdf_sent)
