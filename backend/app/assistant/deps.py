from dataclasses import dataclass, field
from typing import List, Dict, Any
from sqlalchemy.orm import Session


@dataclass
class BusinessAgentDeps:
    db: Session
    business_id: str
    user_id: str
    # Keeps track of all raw ledger records fetched via tool calls during the LLM turn
    queried_rows: List[Dict[str, Any]] = field(default_factory=list)

    def record_row(self, table: str, row_id: str, date_str: str, data: Dict[str, Any]):
        """
        Record a fetched database row to be used in grounding verification.
        """
        self.queried_rows.append(
            {
                "table": table,
                "row_id": str(row_id),
                "date": date_str,
                "data": data,
            }
        )
