# Dependency Inventory

## Cora Família
package.json:
- @biomejs/biome 2.5.9 — development lint.
- @playwright/test 1.62.1 — E2E testing.

Observed:
- no external CDN assets in root index.html;
- no committed lockfile observed in repository root;
- workflow uses npm install rather than deterministic npm ci;
- actions/checkout@v4 and actions/setup-node@v4 use major tags rather than pinned full commit SHAs.

## Cora Gestão
Static repository; no package manifest observed in root inventory and no external CDN assets in root index.html.

## Security scanning status
- SCA: NOT RUN as a formal vulnerability scan in this audit yet.
- CodeQL/SAST: NOT RUN.
- SBOM: NOT GENERATED.
- Secret scanning history: NOT VERIFIED through available connector permissions.

Recommendation: commit a lockfile, use npm ci, enable automated dependency/SAST scanning and generate CycloneDX/SPDX SBOM after dependency state is deterministic.
