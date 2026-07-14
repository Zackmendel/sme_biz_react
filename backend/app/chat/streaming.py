import json
from typing import List, Dict, Any


def format_text_part(text: str) -> str:
    """Formats a text delta for the AI SDK data stream protocol (prefix 0:)."""
    return f"0:{json.dumps(text)}\n"


def format_data_part(data: List[Dict[str, Any]]) -> str:
    """Formats a custom data part for the AI SDK data stream protocol (prefix 2:)."""
    return f"2:{json.dumps(data)}\n"


def format_error_part(error_message: str) -> str:
    """Formats an error message part for the AI SDK data stream protocol (prefix 3:)."""
    return f"3:{json.dumps(error_message)}\n"
