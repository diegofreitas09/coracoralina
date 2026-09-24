# Security Changelog

| Date | Change | Location | Risk reduced | Test | Result | Rollback |
|---|---|---|---|---|---|---|
| 2026-09-24 | Snapshot branch | both repositories | change safety | branch existence | PASS | delete only with authorization |
| 2026-09-24 | Backup snapshot | Google Drive | data loss | copy + structure check | PASS | keep original untouched |
| 2026-09-24 | Isolated restore test | Google Drive | recoverability | critical ranges/formulas comparison | PASS | restore copies can remain archived |
| 2026-09-24 | Fail-closed legacy catalog sync | cora-familia audit branch | future authorization bypass | active catalog E2E + lint | PASS for active catalog; legacy code direct test pending | revert branch commits |
| 2026-09-24 | Least-privilege Quality token | cora-familia audit branch | CI token exposure | workflow execution | PASS for lint/E2E | revert commit |
| 2026-09-24 | Sheet allowlist | coracoralina audit branch | arbitrary sheet access | source review; production still old | NOT DEPLOYED | revert commit |
| 2026-09-24 | Read-only production probes | audit branches | evidence gap | GitHub Actions | PASS | remove workflow after audit if desired |
