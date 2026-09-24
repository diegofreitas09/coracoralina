# Backup Policy

## Current evidence
- Native backup copies created on 2026-09-24 for both critical spreadsheets.
- Separate restore-test copies created from those backups.
- Tab structure matched originals/backups.
- Formula-rendered critical ranges matched backup ↔ restore-test copies.

## Target policy
- Daily: native Google Sheets snapshot.
- Weekly: independent export (XLSX/JSON where compatible).
- Monthly: retained recovery point plus restore drill.
- Keep production and backup permissions separated where feasible.
- Record snapshot ID, timestamp, owner, scope and integrity evidence.
- Do not store secrets in backup metadata.

## RPO / RTO proposal
- RPO: 24 hours initially; target 1 hour for financial writes after transactional backend exists.
- RTO: 4 hours initially; target 1 hour for catalog/read service.

## Open item
Cryptographic SHA-256 manifests for exported backups are not yet implemented.
