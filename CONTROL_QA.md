# UI and interaction QA

This is the current evidence index for the Cards UI and standalone shell. The shared design rules are defined in [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md); reproducible viewport evidence is indexed in [`docs/qa/visual-review-2026-10-28/README.md`](docs/qa/visual-review-2026-10-28/README.md), [`docs/qa/english-visual-review-2026-10-28/README.md`](docs/qa/english-visual-review-2026-10-28/README.md), and [`docs/qa/neutral-light-review-2026-10-28/README.md`](docs/qa/neutral-light-review-2026-10-28/README.md).

## Current local checks (2026-10-28)

- Cards: 60 tests pass; source build and syntax check pass. `dist/mealie-atelier-cards.js` and `web/public/mealie-atelier-cards.js` compare byte-for-byte.
- Web: 35 tests pass; server and bundled card syntax checks pass. The live read-only smoke test is opt-in and was not run because it requires disposable-instance credentials.
- Bridge: 26 tests pass; Python compilation, Ruff lint, and Ruff formatting checks pass.
- Demo: generator emits German and English demo pages plus twenty static recipe pages from ten fictional bilingual recipes.

## Emulated visual coverage

The German and English dark view/dialog evidence and the current neutral Light matrix cover ten views and fourteen dialogs at nine emulated geometries: 375 px mobile, 720 px tablet, 1010 px compact desktop, 1470 px wide desktop, a 380 px embedded card, and both iPhone Duo screens in portrait and landscape. The neutral Light review includes 216 screenshots and nine reviewed contact sheets; the recorded browser checks found no document-level horizontal overflow or offscreen dialogs.

These results are browser simulations. They do not establish physical iPhone Duo/Safari safe-area behavior, a live Home Assistant card host, screen-reader/keyboard conformance, printer output, or production-device performance. See [`docs/RELEASE_READINESS_0.9.5.md`](docs/RELEASE_READINESS_0.9.5.md) for remaining release gates.

## Corrections log

- 2026-10-28 — Reconciled older QA notes with the completed English and neutral-Light matrices and the current post-import test commands. Removed stale references to the previous nested archive checkout layout.
