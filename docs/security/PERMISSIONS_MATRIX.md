# Permissions Matrix — Target State

Server-side enforcement required. UI visibility is not authorization.

| Role | Read catalog | Edit catalog | Approve price | Publish | Read budgets | Edit budgets | Export | Admin users |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| SUPER ADMIN | yes | yes | yes | yes | yes | yes | yes | yes |
| GESTÃO | yes | yes | yes | yes | yes | yes | yes | no |
| FINANCEIRO | yes | limited | policy | no | yes | yes | yes | no |
| SECRETARIA | yes | no | no | no | yes | limited | limited | no |
| ATENDIMENTO | yes | no | no | no | assigned | create | own/assigned | no |
| PROFESSOR | limited | no | no | no | no | no | no | no |
| FAMÍLIA | published only | no | no | no | own only | no | own PDF | no |

Current backend RBAC: STATUS NÃO VERIFICADO / insufficient in audited Apps Script source.
