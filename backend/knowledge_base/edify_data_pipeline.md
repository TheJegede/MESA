# Edify — Data Access & Pipeline Errors

## Overview
Edify is Mines' institutional data and analytics platform. It provides access to reporting, dashboards, and data pipelines for institutional research and administrative analytics.

## Common Issues & Solutions

### Cannot access Edify / "Permission Denied"
1. Edify access requires explicit role provisioning — it is not granted by default to all staff.
2. Request access through the IT portal: submit an Access Request ticket with your department and required data domains.
3. Your supervisor or data steward must approve the request before IT provisions access.

### Dashboard not loading or returning no data
1. Refresh the page and clear browser cache.
2. Check your date filters — default views sometimes default to a range with no data.
3. Verify you have the correct data domain access for the report you are viewing.
4. Check if the underlying data pipeline has completed — pipelines run on a scheduled basis (typically nightly).

### Data pipeline errors / stale data
- Most Edify pipelines run nightly between 1:00–4:00 AM MST.
- Data visible before 6:00 AM may be from the previous day's run.
- If data appears more than 24 hours stale, the pipeline may have failed.
- Pipeline failure escalation: submit a ticket with the specific report name and the expected vs actual data date.

### Export failing or timing out
- Large exports (>50,000 rows) may time out in the browser interface.
- Use the scheduled export feature to queue large exports — results are emailed when ready.
- If scheduled export also fails, reduce the date range and export in segments.

### Incorrect data in reports
- First verify the filter settings on the report — many apparent data errors are filter misconfigurations.
- If data is genuinely wrong, document the specific record or metric and expected value.
- Submit a ticket with: report name, incorrect value, expected value, and a screenshot.

## When to Escalate
- Access request not fulfilled after 3 business days.
- Pipeline shows failure status in the Edify admin panel.
- Data integrity issues confirmed after filter verification.
- System-wide Edify unavailability.
