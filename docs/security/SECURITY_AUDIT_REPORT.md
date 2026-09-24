# Security Audit Report — Working Report

Date: 2026-09-24  
Progress: 58%  
Production status: **PRODUCTION BLOCKED**

## Current severity summary
- CRITICAL: 2
- HIGH: 5
- MEDIUM: multiple items under classification
- LOW/INFORMATIONAL: ongoing inventory

## Key evidence
1. Deployed Cora Gestão Apps Script answered ping and allowed unauthenticated listing of a non-public-purpose sheet.
2. Repository backend source has write/batch operations without authenticated caller identity.
3. Both GitHub main branches are unprotected; no rulesets observed.
4. Current Cora Família main commit had lint/E2E pass but the overall Quality workflow failed because the Família 360 deploy generator failed; GitHub Pages still published.
5. Netlify production sites are ready but based on manual uploads from 2026-09-08, with no Git commit/branch attached.
6. Financial cloud sheet currently has 41 financial rows, all RASCUNHO/NÃO; the 17 APROVADO/SIM rows are Planejamento de Alunos, not financial catalog rows.
7. HTTPS/HSTS is present; several defense-in-depth response headers are absent.
8. Native backup/restore drill succeeded for critical ranges.

## Safe changes already staged
- recovery snapshot branches;
- Drive backup snapshots and isolated restore-test copies;
- fail-closed hardening of legacy sync files;
- GitHub Actions least-privilege adjustment;
- Apps Script sheet allowlist in source;
- automated read-only production probes;
- draft PRs only; no production merge/deploy.

## Not verified
- deployed write-path behavior (no destructive production probe performed);
- Cloudflare Worker source/provenance;
- complete secret history scan;
- CodeQL/SCA/DAST;
- server-side financial recalculation;
- full RBAC;
- OAuth configuration (no OAuth client inventory located yet).
