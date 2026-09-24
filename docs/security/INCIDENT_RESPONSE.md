# Incident Response

## Severity
- P0: active data exposure, unauthorized financial mutation, account takeover, destructive loss.
- P1: critical exploitable weakness without observed abuse.
- P2: high risk requiring scheduled remediation.
- P3/P4: medium/low hardening.

## Core flow
Detect → Contain → Preserve evidence → Eradicate → Recover → Retest → Post-incident review.

## Evidence to preserve
request/correlation ID, timestamps, Git commit/deploy ID, affected rows/files, user/role, before/after values, relevant logs. Never copy full secrets into incident notes.

## P0 playbook
1. Activate read-only behavior where possible.
2. Disable vulnerable public write surface.
3. Snapshot Sheets/Drive/Git.
4. Identify affected records and time window.
5. Restore or reconcile from validated point.
6. Rotate compromised credentials.
7. Retest before reopening writes.
8. Assess LGPD notification obligations with responsible legal/privacy owner.

No incident is considered closed until technical evidence and residual risk are recorded.
