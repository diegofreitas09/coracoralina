# Data Flow — Cora Apps

## Classification
- PUBLIC: static marketing/UI assets.
- INTERNAL: operational configuration, non-sensitive publication metadata.
- CONFIDENTIAL: student/responsible names, contacts, access records, evaluations.
- CRITICAL: financial values, discounts, budgets, staff access keys, authorization state, audit/history.

## Main flows
1. Family access data → browser → Cloudflare Worker → validation backend/data source → authorization response.
2. Official catalog → Apps Script GET → browser → strict APROVADO+SIM filter → local confirmed cache/fallback.
3. Budget form → browser calculation → Apps Script write → Sheets → PDF → Drive.
4. Management catalog edits → browser → Apps Script write/batch → Sheets → Cora Família catalog sync.
5. Source changes → GitHub → GitHub Pages. Netlify currently follows a separate manual-upload path.

## Confirmed risks
- Apps Script GET accepts a caller-supplied sheet name in the deployed service.
- Sensitive financial calculations are produced client-side before persistence.
- Some state/session data is kept in browser storage.
- Production and repository versions can diverge.

## Retention / deletion / legal basis
STATUS: NÃO VERIFICADO. A formal LGPD retention matrix still needs business-policy confirmation.
