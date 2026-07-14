from pydantic import BaseModel, Field
from typing import List


class RowCitation(BaseModel):
    table: str = Field(
        description="The source table: 'sales', 'purchases', 'daily_summaries', or 'debtors'"
    )
    row_id: str = Field(
        description="The exact database row ID or unique identifier key"
    )
    date: str = Field(
        description="The date of the transaction/summary formatted as YYYY-MM-DD"
    )
    summary: str = Field(
        description="A brief description of what this row represents (e.g. 'Sale of Laptop to John for N50,000')"
    )


class GroundedAnswer(BaseModel):
    answer: str = Field(
        description="The markdown formatted response to the user's question, grounded strictly in the cited data"
    )
    citations: List[RowCitation] = Field(
        default_factory=list,
        description="List of source rows used to construct the answer",
    )
