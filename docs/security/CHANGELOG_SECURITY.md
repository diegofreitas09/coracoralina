# Security Changelog

| Date | Change | Location | Risk reduced | Test | Result | Rollback |
|---|---|---|---|---|---|---|
| 2026-09-24 | Snapshot branches | both repositories | change safety | branch/commit equality | PASS | keep until audit closes |
| 2026-09-24 | Backup v2 snapshots | Google Drive | data loss/schema drift | current-source copy + metadata check | PASS | originals untouched |
| 2026-09-24 | Restore-test v2 | Google Drive | recoverability | exact critical-range comparison | PASS | copies may remain archived |
| 2026-09-24 | Fail-closed legacy catalog sync | cora-familia audit branch | authorization bypass | active catalog E2E + lint | PASS for staged branch | revert branch commits |
| 2026-09-24 | Least-privilege Quality token | cora-familia audit branch | CI token exposure | workflow execution | PASS on audited revision | revert commit |
| 2026-09-24 | Sheet read/write allowlists | coracoralina audit branch | arbitrary sheet access / mass assignment | CodeQL + source review | PASS staged; NOT DEPLOYED | revert commit |
| 2026-09-24 | Formula-injection neutralization | coracoralina audit branch | spreadsheet formula execution | CodeQL | PASS staged; NOT DEPLOYED | revert commit |
| 2026-09-24 | Safe budget confirmation action | coracoralina audit branch | private-sheet enumeration | source review + CodeQL | PASS staged; frontend consumer pending | revert commit |
| 2026-09-24 | Single-record write lock | coracoralina audit branch | race/lost update | CodeQL/source review | PASS staged; concurrency runtime retest pending | revert commit |
| 2026-09-24 | Consolidated PDF Base64 handler with size/signature checks | coracoralina audit branch | source drift / upload abuse | CodeQL/source review | PASS staged; runtime retest pending | revert commit |
| 2026-09-24 | Feedback formula-injection neutralization | cora-familia audit branch | spreadsheet formula execution | source staged | CI pending | revert commit |
| 2026-09-24 | Read-only production probes | audit branches | evidence gap | GitHub Actions | PASS | remove workflow after audit if desired |

## Notes
- No production merge/deploy was performed by these changes.
- The backup copies are verified recovery points but remain within the same Google administrative boundary; independent immutable backup is still open.
- The current frontend still needs a coordinated change from full-sheet budget confirmation to `confirmarRegistro` before the hardened backend can be deployed safely.
