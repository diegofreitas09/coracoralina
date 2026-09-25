# API Inventory

| Component | Method | Route/action | Auth observed | Data | Side effect | Status |
|---|---|---|---|---|---|---|
| Cora Gestão Apps Script | GET | ping | none | service metadata | none | verified live |
| Cora Gestão Apps Script | GET | listar?aba=... | none | arbitrary sheet rows on deployed version | none | CRITICAL, verified live |
| Cora Gestão audit branch | GET | listar?aba=... | none | allowlisted public-purpose sheets only | none | staged, NOT DEPLOYED |
| Cora Gestão audit branch | GET | confirmarRegistro?id=... | none | existence + record count only | none | staged for safe post-write confirmation |
| Cora Gestão Apps Script | GET | auditarCatalogo | none | catalog counters | none | deployed version returned not-ok during probe |
| Cora Gestão source | POST | salvarRegistro | none in source | allowlisted fields in staged branch | upsert | auth unresolved; live destructive test NOT RUN |
| Cora Gestão source | POST | salvarLote | none in source | financial catalog | batch/publish | auth unresolved; live destructive test NOT RUN |
| Cora Gestão source | POST | salvarPdfOrcamento | none in source | budget/PII | Drive PDF | auth unresolved |
| Cora Gestão audit branch | POST | salvarPdfBase64 | none in source | validated PDF bytes | Drive PDF | handler consolidated/staged; auth unresolved |
| Cora Gestão source | POST | publicar | none in source | publication metadata | append | auth unresolved |
| Cloudflare Worker | GET | base | public | service response | none | verified live |
| Cloudflare Worker | GET | validarAcesso | query fields | student access decision | may affect attempt counters | invalid synthetic request rejected |
| Cora Família Apps Script source | GET | validarChaveFuncionario | key in query | staff auth | usage update | source found; active deploy NOT VERIFIED |
| Cora Família Apps Script source | GET | validarAcesso | 2-of-3 identifiers | family auth | access/attempt update | source found; active deploy NOT VERIFIED |
| Cora Família Apps Script source | POST | feedback | none observed | evaluation text | append | formula-injection mitigation staged; active deployment NOT VERIFIED |

Rate limits: NOT VERIFIED.  
Cloudflare Worker CORS header presence: verified. Exact allowed-origin value: NOT VERIFIED.  
Critical authenticated write broker/RBAC: NOT IMPLEMENTED in the available canonical backend source.
