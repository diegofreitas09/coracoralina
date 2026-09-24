# Security Runbook

## Rotate secret
Inventory consumers → create replacement → update server-side consumers → test → revoke old → scan history/logs → record.

## Revoke Google access
Identify credential/token → revoke only after replacement path exists → retest Sheets/Drive operations.

## Restore Sheets
Use validated snapshot → restore to isolated copy → compare schema/formulas/critical rows → switch only after validation.

## Roll back frontend
Select known-good commit/deploy → confirm data compatibility → publish → smoke test → monitor.

## Read-only mode
Disable mutation controls/server actions while preserving reads and exports needed for continuity. Never rely solely on hiding UI buttons.

## Investigate financial change
Capture entity ID/request ID → compare history/before/after → identify actor/source → quarantine suspicious rows → reconcile against authoritative table → retest downstream PDFs/reports.

## Leak response
Contain endpoint → rotate credentials → search access logs → determine scope/subjects → restore safe configuration → document.
