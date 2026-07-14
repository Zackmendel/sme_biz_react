import re
from typing import List, Dict, Any
from app.assistant.outputs import GroundedAnswer


def validate_grounding(
    answer: GroundedAnswer, queried_rows: List[Dict[str, Any]]
) -> None:
    """
    Validates that:
    1. Every cited row in answer.citations was actually returned by a tool call this turn.
    2. Any numerical/currency values mentioned in the response (e.g. ₦1,250 or 50000)
       are present in the queried rows (as prices, totals, quantities, or sums/averages).
    Raises ValueError if validation fails, prompting a fail-closed execution turn.
    """
    # 1. Map of queried rows by (table, row_id)
    queried_map = {(r["table"], r["row_id"]): r for r in queried_rows}

    # Verify that all cited rows are valid
    for citation in answer.citations:
        key = (citation.table, citation.row_id)
        if key not in queried_map:
            raise ValueError(
                f"Grounding Error: Cited record '{citation.table}' with ID '{citation.row_id}' "
                "was not returned by any data query this turn."
            )

    # 2. Verify cited numbers against the actual values returned by tools.
    # Strip ISO dates (YYYY-MM-DD) to avoid day/month/year digits triggering violations
    clean_text = re.sub(r"\b\d{4}-\d{2}-\d{2}\b", "", answer.answer)

    # Extract numbers greater than 1 from the cleaned text
    numbers_in_text = re.findall(
        r"(?:₦|N)?\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b", clean_text
    )

    # Clean the matched strings to float values
    parsed_text_numbers = []
    for num_str in numbers_in_text:
        # Strip currency symbols and commas
        clean_str = re.sub(r"[₦N,]", "", num_str)
        try:
            val = float(clean_str)
            if val > 1.0:  # Ignore trivial numbers like 0, 1, or list indices
                parsed_text_numbers.append(val)
        except ValueError:
            continue

    if not parsed_text_numbers:
        return

    # Gather all numerical fields from queried data
    available_numbers = set()
    for row in queried_rows:
        data = row["data"]
        for key, val in data.items():
            if isinstance(val, (int, float)):
                available_numbers.add(float(val))

    # Also calculate sums of key fields (like totals, sales, purchases, net) to allow aggregations
    # e.g. total sum of sales/purchases/net
    total_sales = sum(
        float(r["data"].get("total_sales", 0))
        for r in queried_rows
        if r["table"] == "daily_summaries"
    )
    total_purchases = sum(
        float(r["data"].get("total_purchases", 0))
        for r in queried_rows
        if r["table"] == "daily_summaries"
    )
    total_net = sum(
        float(r["data"].get("net", 0))
        for r in queried_rows
        if r["table"] == "daily_summaries"
    )

    sale_totals = sum(
        float(r["data"].get("total", 0)) for r in queried_rows if r["table"] == "sales"
    )
    purchase_totals = sum(
        float(r["data"].get("total", 0))
        for r in queried_rows
        if r["table"] == "purchases"
    )
    debtor_totals = sum(
        float(r["data"].get("amount_naira", 0))
        for r in queried_rows
        if r["table"] == "debtors"
    )

    available_numbers.update(
        [
            float(total_sales),
            float(total_purchases),
            float(total_net),
            float(sale_totals),
            float(purchase_totals),
            float(debtor_totals),
        ]
    )

    # Check that every number mentioned is justified
    for num in parsed_text_numbers:
        # Allow small floating point tolerances
        matched = any(abs(num - av) < 0.1 for av in available_numbers)
        # Also allow dates (like years or day counts) or count matches
        # If the number is a transaction count or quantity count, check if it matches row counts
        is_count = num in (
            len(queried_rows),
            len([r for r in queried_rows if r["table"] == "sales"]),
            len([r for r in queried_rows if r["table"] == "purchases"]),
        )

        if (
            not matched and not is_count and num not in [2026, 2025, 30, 7, 90]
        ):  # ignore dates / standard filters
            raise ValueError(
                f"Grounding Error: Answer mentions figure '{num}', which is not found or supported "
                "by any queried ledger records."
            )
