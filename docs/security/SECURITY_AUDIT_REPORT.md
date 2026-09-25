# Security Audit Report — Working Report

Date: 2026-09-24  
Progress: 62%  
Production status: **PRODUCTION BLOCKED**

This percentage measures audit execution, not the security level of the application.

## Current classified findings

### CRITICAL
- **CORA-CRIT-001 — unauthenticated sheet disclosure, verified live.** The deployed Cora Gestão Apps Script answered a read-only probe without authentication and allowed listing the non-public-purpose `Resumo` sheet. The probe intentionally avoided PII.
- **CORA-CRIT-002 — unauthenticated write design.** Repository backend source exposes `salvarRegistro`, `salvarLote`, PDF creation and publication actions without authenticated caller identity. A destructive production write probe was intentionally NOT executed, so deployed write exploitability remains not destructively retested.

### HIGH
- **CORA-HIGH-001 — financial authority remains in the browser.** Budget values such as first installment, monthly amount, material, uniform and total are accepted from the client; the backend does not independently recalculate the financial result.
- **CORA-HIGH-002 — weak staff credential model in the Sheets source.** Two active staff credentials observed are six-digit numeric PINs stored/compared as plain values; no effective rate-limit/lockout control was found in the available Apps Script source. Active Cloudflare Worker source/provenance is still not verified.
- **CORA-HIGH-003 — GitHub production branches lack enforced protection.** Both `main` branches were reported as unprotected and no repository rulesets were observed.
- **CORA-HIGH-004 — production provenance is not reproducible from Git.** Current Netlify production deploys date from 2026-09-08 and were uploaded through API/upload with no commit ref or branch attached, while repository source changed afterward.
- **CORA-HIGH-005 — spreadsheet formula injection was possible in user-controlled text.** Values could reach Sheets without neutralizing formula-leading characters. Mitigations are staged in draft audit branches; production is not yet changed.

### MEDIUM
- **CORA-MED-001 — defense-in-depth HTTP headers are incomplete.** HTTPS and HSTS are present, while CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, COOP/CORP and frame protection were absent in the verified frontend responses.
- **CORA-MED-002 — CI least privilege is incomplete on current main.** The Cora Família Quality workflow currently grants `contents: write` globally. A least-privilege change is staged and has previously passed CI on the audit branch.
- **CORA-MED-003 — backup isolation is incomplete.** Validated native backups and restore-test copies exist, but they are stored under the same Google account/administrative boundary and are not an immutable off-account recovery layer.
- **CORA-MED-004 — backend source-of-truth drift existed for PDF handling.** `salvarPdfBase64` lived in a standalone patch file instead of the canonical backend file. Consolidation with PDF signature/size checks is staged in the audit branch.

## Verified evidence
1. Read-only production probe: `PING_OK=true` and `ARBITRARY_SHEET_LISTABLE=true`.
2. HTTPS probe: all tested frontends returned HTTP 200 over final HTTPS and HSTS.
3. Netlify: current Cora Gestão and Cora Atendimento deploys are ready but are API/upload deploys with no Git commit/branch provenance.
4. Google Drive/Sheets: source spreadsheets are private/owner-only according to returned permission metadata.
5. Cora 2027 backup v2 and restore-test v2 matched the original cell-for-cell in the critical ranges checked: Produtos 2027, Orçamentos Cora Família, Mensalidades and Histórico.
6. Cora Família backup v2 and restore-test v2 matched the original cell-for-cell in Atendimentos e Orçamentos, Acessos, Funcionários and Avaliações.
7. Cora Família supply-chain workflow reported `npm audit` with zero info/low/moderate/high/critical vulnerabilities in the current six-package dependency set and a passing current-branch secret-pattern scan.
8. The staged Cora Gestão backend hardening commit passed CodeQL and the read-only audit workflow.

## Safe changes staged, not deployed
- recovery snapshot branches;
- current Google Sheets backup v2 and restore-test v2 copies;
- fail-closed catalog authorization in the Cora Família audit branch;
- least-privilege GitHub Actions changes in draft PRs;
- Apps Script sheet allowlist;
- explicit per-sheet writable-field allowlists;
- spreadsheet formula-injection neutralization;
- locking around single-record writes;
- safe budget confirmation endpoint that does not enumerate the private budget sheet;
- consolidation and validation of the PDF Base64 handler;
- generic external error responses with detailed server-side logging;
- automated read-only production probes.

## Deployment dependency discovered
The Cora Gestão hardening removes public enumeration of `Orçamentos Cora Família`. The current Cora Família v37 frontend still confirms persistence by calling the old full-sheet listing route. A coordinated frontend change to the staged `confirmarRegistro` endpoint is required before deploying this backend hardening. The connector blocked that frontend write attempt during this audit, so the dependency remains OPEN.

## Not verified / still open
- authenticated replacement/broker for Cora Gestão write routes;
- deployed write-path exploitability (no destructive probe performed);
- server-side financial recalculation from authoritative product IDs/rules;
- Cloudflare Worker source, deployment provenance and exact CORS allow-origin policy;
- complete Git-history secret scan;
- DAST beyond read-only authorized probes;
- full RBAC and reauthentication;
- OAuth client/scopes inventory;
- protected ranges in every critical Sheet;
- immutable/off-account backup layer;
- final production smoke/retest after approved deployment.

## Production decision
**PRODUCTION BLOCKED** for security sign-off while the live unauthenticated read path exists and authenticated server-side control for critical write/financial operations is unresolved.
