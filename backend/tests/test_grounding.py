import pytest
from app.assistant.outputs import GroundedAnswer, RowCitation
from app.grounding.validator import validate_grounding


def test_validate_grounding_success():
    answer = GroundedAnswer(
        answer="The total sales revenue on 2026-07-13 is ₦50,000 across 2 transactions.",
        citations=[
            RowCitation(
                table="sales",
                row_id="row-123",
                date="2026-07-13",
                summary="Sale of items worth N50,000",
            )
        ],
    )
    queried_rows = [
        {
            "table": "sales",
            "row_id": "row-123",
            "date": "2026-07-13",
            "data": {"total": 50000.0, "quantity": 2},
        }
    ]
    # Should not raise any exceptions
    validate_grounding(answer, queried_rows)


def test_validate_grounding_failure_missing_citation():
    answer = GroundedAnswer(
        answer="The total sales revenue on 2026-07-13 is ₦50,000.",
        citations=[
            RowCitation(
                table="sales",
                row_id="unqueried-row",
                date="2026-07-13",
                summary="Unqueried sale",
            )
        ],
    )
    queried_rows = [
        {
            "table": "sales",
            "row_id": "row-123",
            "date": "2026-07-13",
            "data": {"total": 50000.0},
        }
    ]
    with pytest.raises(
        ValueError, match="was not returned by any data query this turn"
    ):
        validate_grounding(answer, queried_rows)


def test_validate_grounding_failure_hallucinated_number():
    answer = GroundedAnswer(
        answer="The total sales revenue on 2026-07-13 is ₦1,000,000.",
        citations=[
            RowCitation(
                table="sales",
                row_id="row-123",
                date="2026-07-13",
                summary="Sale of items worth N50,000",
            )
        ],
    )
    queried_rows = [
        {
            "table": "sales",
            "row_id": "row-123",
            "date": "2026-07-13",
            "data": {"total": 50000.0},
        }
    ]
    with pytest.raises(ValueError, match="Answer mentions figure '1000000.0'"):
        validate_grounding(answer, queried_rows)
