# Architecture — Cora Apps

Status: audit in progress (2026-09-24).

## Current observed topology

User → Static frontend (GitHub Pages and/or Netlify) → Cloudflare Worker (family auth) and Google Apps Script → Google Sheets / Google Drive.

Source → GitHub main → GitHub Pages. Separate Netlify sites currently use manual-upload deploys and are not demonstrably tied to current Git commits.

## Repositories
- diegofreitas09/coracoralina — Cora Gestão.
- diegofreitas09/cora-familia — Cora Família / Atendimento.

## Critical storage
- Cora 2027 spreadsheet: pricing, products, students, budgets, history, publications.
- Cora Família spreadsheet: access registry, staff keys, evaluations, service/budget records.
- Google Drive folder for generated budget PDFs.

## Trust boundaries
1. Browser ↔ Cloudflare Worker.
2. Browser ↔ Apps Script web app.
3. Apps Script ↔ Sheets/Drive.
4. GitHub ↔ publishing surfaces.
5. Netlify manual deploy ↔ source repository.

## Current architectural blockers
- Deployed Apps Script permits unauthenticated sheet reads.
- Source backend write paths lack caller authentication.
- Netlify production deploys are not source-linked.
- Cloudflare Worker source/deployment provenance is not present in the audited repositories.
