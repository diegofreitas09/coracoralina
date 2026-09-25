# Backup Policy

## Current evidence
- Native backup copies were created on 2026-09-24 for both critical spreadsheets.
- Earlier Cora 2027 backup validation detected schema drift: the then-current source had the new `Contato do responsável` column while the older backup did not.
- A new Cora 2027 backup v2 and a restore-test copy were created from the current source.
- Exact cell-value/formula comparisons matched original → backup v2 → restore-test v2 for:
  - Produtos 2027;
  - Orçamentos Cora Família;
  - Mensalidades;
  - Histórico.
- A new Cora Família backup v2 and restore-test copy were created from the current source.
- Exact comparisons matched for:
  - Atendimentos e Orçamentos;
  - Acessos;
  - Funcionários;
  - Avaliações.
- Returned Drive permission metadata showed source, backup and restore-test copies as private/owner-only.

## Important limitation
These native copies remain in the same Google account/administrative boundary as production. They provide verified recovery from accidental edits/deletions covered by the snapshots, but **do not constitute an immutable or independently isolated backup** against compromise of the owning account.

## Target policy
- Daily: native Google Sheets snapshot.
- Weekly: independent export (XLSX/JSON where compatible).
- Monthly: retained recovery point plus restore drill.
- Maintain at least one independent recovery layer whose delete/overwrite permissions are not shared with normal production credentials.
- Record timestamp, owner, scope, schema and integrity evidence.
- Do not store secrets or personal data in backup metadata/logs.

## RPO / RTO proposal
- RPO: 24 hours initially; target 1 hour for financial writes after a transactional/authenticated backend exists.
- RTO: 4 hours initially; target 1 hour for catalog/read service.

## Open items
- immutable/off-account recovery layer;
- automated retention policy;
- cryptographic SHA-256 manifests for independent exported backups;
- scheduled restore drill with recorded result.
