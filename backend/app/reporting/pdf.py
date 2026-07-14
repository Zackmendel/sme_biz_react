import io
from weasyprint import HTML
from app.database.models.business import Business
from app.database.models.accounting_cycle import AccountingCycle


def generate_cycle_report_pdf(
    business: Business, cycle: AccountingCycle, summaries: list, narrative_summary: str
) -> bytes:
    """
    Generates a cycle accounting report PDF using WeasyPrint.
    """
    # Sum totals across summaries in this cycle
    total_sales = sum(s.total_sales for s in summaries)
    total_purchases = sum(s.total_purchases for s in summaries)
    net_position = total_sales - total_purchases
    total_tx = sum(s.transaction_count for s in summaries)

    html_content = f"""
    <html>
    <head>
        <style>
            @page {{
                size: A4;
                margin: 20mm;
            }}
            body {{
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                color: #2D3748;
                line-height: 1.6;
            }}
            .header {{
                border-bottom: 2px solid #E2E8F0;
                padding-bottom: 15px;
                margin-bottom: 30px;
            }}
            .logo-placeholder {{
                font-size: 24px;
                font-weight: bold;
                color: #4A5568;
            }}
            .biz-name {{
                font-size: 20px;
                color: #3182CE;
                margin: 5px 0;
            }}
            .report-title {{
                font-size: 28px;
                font-weight: 700;
                margin: 10px 0;
                color: #1A202C;
            }}
            .meta-grid {{
                display: flex;
                justify-content: space-between;
                margin-bottom: 30px;
                font-size: 14px;
                color: #718096;
            }}
            .summary-card {{
                background-color: #F7FAFC;
                border: 1px solid #E2E8F0;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 30px;
            }}
            .summary-title {{
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 15px;
                color: #2B6CB0;
            }}
            .grid {{
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 15px;
            }}
            .metric {{
                border-bottom: 1px dashed #E2E8F0;
                padding-bottom: 5px;
            }}
            .metric-label {{
                font-size: 12px;
                color: #718096;
                text-transform: uppercase;
            }}
            .metric-value {{
                font-size: 18px;
                font-weight: bold;
            }}
            .narrative {{
                background-color: #EBF8FF;
                border-left: 4px solid #3182CE;
                padding: 15px;
                border-radius: 4px;
                margin-bottom: 30px;
                font-size: 14px;
                font-style: italic;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
            }}
            th, td {{
                border: 1px solid #E2E8F0;
                padding: 10px;
                text-align: left;
                font-size: 12px;
            }}
            th {{
                background-color: #EDF2F7;
                color: #4A5568;
                font-weight: 600;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <div class="logo-placeholder">SME Biz Analyst</div>
            <div class="biz-name">{business.name}</div>
            <div class="report-title">Cycle Performance Report</div>
            <div class="meta-grid">
                <div>Period: {cycle.period_type.value.capitalize()} Cycle</div>
                <div>Dates: {cycle.start_date.isoformat()} to {cycle.end_date.isoformat()}</div>
            </div>
        </div>

        <div class="summary-card">
            <div class="summary-title">Financial Summary</div>
            <div class="grid">
                <div class="metric">
                    <div class="metric-label">Total Income</div>
                    <div class="metric-value">₦{total_sales:,.2f}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">Total Expense</div>
                    <div class="metric-value">₦{total_purchases:,.2f}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">Net Performance</div>
                    <div class="metric-value">₦{net_position:,.2f}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">Total Transactions</div>
                    <div class="metric-value">{total_tx}</div>
                </div>
            </div>
        </div>

        <div class="summary-title">AI Performance Insights</div>
        <div class="narrative">
            {narrative_summary}
        </div>

        <div class="summary-title">Daily Activity Details</div>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Sales</th>
                    <th>Purchases</th>
                    <th>Net</th>
                    <th>Transactions</th>
                    <th>Top Item</th>
                </tr>
            </thead>
            <tbody>
    """

    for s in summaries:
        html_content += f"""
                <tr>
                    <td>{s.summary_date.isoformat()}</td>
                    <td>₦{s.total_sales:,.2f}</td>
                    <td>₦{s.total_purchases:,.2f}</td>
                    <td>₦{s.net:,.2f}</td>
                    <td>{s.transaction_count}</td>
                    <td>{s.top_item or "-"}</td>
                </tr>
        """

    html_content += """
            </tbody>
        </table>
    </body>
    </html>
    """

    pdf_io = io.BytesIO()
    HTML(string=html_content).write_pdf(pdf_io)
    return pdf_io.getvalue()
