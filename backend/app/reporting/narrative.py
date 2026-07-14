from pydantic_ai import Agent
from app.assistant.agent import model
from app.database.models.accounting_cycle import AccountingCycle

narrative_agent = Agent(
    model,
    system_prompt=(
        "You are an expert financial analyst. Summarize the closed accounting cycle performance. "
        "Format your response as a concise, professional performance overview. Mention key highlights, "
        "trends, and overall net positioning. Keep it brief (under 150 words). Format paragraphs using simple double line breaks (\\n\\n). "
        "Do NOT use HTML paragraph (<p>) or div tags. Use bold (<b>) or italics (<i>) for emphasis if needed. "
        "Strictly ground all statements in the aggregated summaries provided. Do not invent any numbers."
    ),
)


async def generate_cycle_narrative(
    business_name: str, cycle: AccountingCycle, summaries: list
) -> str:
    """
    Queries Gemini to generate a narrative performance summary of the cycle.
    """
    total_sales = sum(s.total_sales for s in summaries)
    total_purchases = sum(s.total_purchases for s in summaries)
    net_position = total_sales - total_purchases
    total_tx = sum(s.transaction_count for s in summaries)

    # Format data for the prompt
    summaries_text = ""
    for s in summaries:
        summaries_text += (
            f"Date: {s.summary_date.isoformat()}, Sales: ₦{s.total_sales:,.2f}, "
            f"Purchases: ₦{s.total_purchases:,.2f}, Net: ₦{s.net:,.2f}, "
            f"TX Count: {s.transaction_count}, Top Item: {s.top_item or 'None'}\n"
        )

    prompt = f"""
    Business Name: {business_name}
    Cycle: {cycle.period_type.value}
    Date Range: {cycle.start_date.isoformat()} to {cycle.end_date.isoformat()}
    
    Overall Cycle Metrics:
    - Total Income (Sales): ₦{total_sales:,.2f}
    - Total Expenses (Purchases): ₦{total_purchases:,.2f}
    - Net Performance: ₦{net_position:,.2f}
    - Total Transactions: {total_tx}
    
    Daily Summary Details:
    {summaries_text}
    """

    try:
        # Run agent
        result = await narrative_agent.run(prompt)
        return result.output
    except Exception as e:
        return f"<p>System was unable to generate a narrative summary: {str(e)}</p>"
