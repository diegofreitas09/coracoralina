# API Inventory

| Component | Method | Route/action | Auth observed | Data | Side effect | Status |
|---|---|---|---|---|---|---|
| Cora Gestão Apps Script | GET | ping | none | service metadata | none | verified live |
| Cora Gestão Apps Script | GET | listar?aba=... | none | arbitrary sheet rows | none | CRITICAL, verified live |
| Cora Gestão Apps Script | GET | auditarCatalogo | none | catalog counters | none | deployed version returned not-ok |
| Cora Gestão Apps Script source | POST | salvarRegistro | none in source | arbitrary allowed fields | upsert | write behavior live NOT VERIFIED |
| Cora Gestão Apps Script source | POST | salvarLote | none in source | financial catalog | batch/publish | write behavior live NOT VERIFIED |
| Cora Gestão Apps Script source | POST | salvarPdfOrcamento | none in source | budget/PII | Drive PDF | live NOT VERIFIED |
| Cloudflare Worker | GET | base | public | service response | none | verified live |
| Cloudflare Worker | GET | validarAcesso | query fields | student access decision | may affect attempt counters | invalid synthetic request rejected |
| Cora Família Apps Script source | GET | validarChaveFuncionario | key in query | staff auth | usage update | source found; active deploy NOT VERIFIED |
| Cora Família Apps Script source | GET | validarAcesso | 2-of-3 identifiers | family auth | access/attempt update | source found; active deploy NOT VERIFIED |

Rate limits: NOT VERIFIED.
CORS policy value: partially verified on Worker; exact origin policy pending.
