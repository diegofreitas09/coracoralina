# Threat Model — STRIDE

| Threat | Asset | Vector | Impact | Current control | Required control |
|---|---|---|---|---|---|
| Spoofing | family/staff access | weak/static identifiers or keys | unauthorized access | Worker rejects invalid synthetic credential | MFA/strong auth for staff, throttling, server session |
| Tampering | pricing/catalog | unauthenticated write API design | financial manipulation | client-side status filter | authenticated server write, RBAC, server-side validation |
| Repudiation | financial changes | insufficient immutable audit identity | cannot prove actor | history exists | append-only audit with user/request IDs |
| Information disclosure | Sheets | arbitrary sheet GET | PII/financial leakage | none on deployed Apps Script read path | allowlist + auth |
| DoS | Apps Script/Worker | repeated expensive requests | service degradation | timeouts in catalog client | rate limit, quotas, circuit breaker |
| Elevation of privilege | admin/financial actions | frontend-only trust or shared keys | admin/financial control | partial UI gating | backend RBAC and re-authentication |

## Highest-risk chain
Public endpoint → unauthenticated data/API access → financial or personal data exposure/manipulation → silent propagation to clients.

Residual risk remains CRITICAL until the deployed API is authenticated and retested.
