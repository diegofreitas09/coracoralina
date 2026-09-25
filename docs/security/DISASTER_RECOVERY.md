# Disaster Recovery

## Scenarios

### Spreadsheet corruption/deletion
1. Enter READ ONLY MODE.
2. Preserve current evidence and timestamp.
3. Select latest validated backup within RPO.
4. Restore to isolated copy first.
5. Compare tab/schema/critical records/formulas.
6. Reconnect application only after smoke test.
7. Record incident and reconciliation.

### Bad deploy
1. Stop further deploys.
2. Identify last known-good commit/deploy.
3. Validate data compatibility.
4. Roll back application code.
5. Smoke test read/login/catalog/PDF.
6. Monitor errors before reopening writes.

### GitHub compromise
Revoke sessions/tokens, protect branch, rotate deploy credentials, compare commits against snapshot branch and redeploy from trusted source.

### Netlify compromise
Freeze deploy hooks, rotate credentials, validate domain/DNS, deploy known-good artifact and verify headers.

### Google/Apps Script compromise
Disable or restrict public web app, rotate credentials where applicable, review Drive/Sheets audit history, restore clean data copy, redeploy authenticated API.

### Secret compromise
Replace consumers first, validate replacement, revoke old secret, search history/logs, document incident.

Current DR blocker: deployed Apps Script lacks adequate access control.
