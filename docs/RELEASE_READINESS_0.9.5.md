# Release readiness — 0.9.5

## Current status

**Developer preview; not a stable public release.** Product code is now organized in the existing public repositories, with their Git histories preserved. Automated local checks and emulated visual evidence do not replace live Home Assistant, Mealie, provider, or physical-device acceptance.

## Repository and package boundaries

- [`mealie-atelier-cards`](https://github.com/mealie-atelier/mealie-atelier-cards): Home Assistant Cards, standalone Web/PWA under `web/`, and generated bilingual demo under `demo/`.
- [`mealie-atelier-bridge`](https://github.com/mealie-atelier/mealie-atelier-bridge): optional Home Assistant integration.
- [`.github`](https://github.com/mealie-atelier/.github): organization profile, community metadata, and canonical brand assets.
- Cards, Web, demo, and Bridge have separate validation/release boundaries. None requires deploying Home Assistant for standalone Web/demo use.

## Confirmed local verification

The current workspace verification on 2026-10-28 reports:

- **Cards:** 60 tests; build and bundle syntax check pass; built Card bundle equals `web/public/mealie-atelier-cards.js` byte-for-byte.
- **Web:** 35 tests pass; server and bundled card syntax checks pass.
- **Bridge:** 26 tests pass; `compileall`, Ruff lint, and Ruff format checks pass.
- **Demo:** generator emits 2 localized demo routes and 20 static recipe pages from 10 bilingual fictional fixtures.
- **Visual QA evidence:** DE and EN view/dialog matrices plus the current neutral Light matrix cover 10 views and 14 dialogs at 9 emulated geometries (including both iPhone Duo screens in both orientations and a narrow embedded-card host). The current neutral Light evidence records 216 screenshots, reviewed contact sheets, and no browser-detected overflow/offscreen-dialog violations. These are browser simulations, not physical-device acceptance.

Exact commands are in the root `CONTRIBUTING.md` and the Bridge repository's `CONTRIBUTING.md`. The optional live Mealie smoke test is intentionally excluded from default test discovery and requires explicit disposable-instance credentials.

## Release gates still open

1. Run the committed HACS and Hassfest workflows on GitHub; verify package metadata and validators on the actual remote revisions.
2. Run a first-time setup with a real, disposable Home Assistant instance, including native Mealie read-only, Bridge URL/token setup, invalid-credential recovery, UI-managed card resource, and add-card flow.
3. Test live Mealie reads and writes on a disposable, backed-up instance: pagination/catalog completeness, recipe detail/step images, shopping, meal planning, recipe import/edit, permissions, and supported batch shopping endpoint behavior.
4. Test Bring and another HA To-do provider before supporting or advertising the planned Smart Shopping Sync. The Bridge does **not** yet implement this capability. See [`docs/SMART_SHOPPING_SYNC.md`](https://github.com/mealie-atelier/mealie-atelier-bridge/blob/main/docs/SMART_SHOPPING_SYNC.md) for the safety contract.
5. Complete physical iPhone Duo/Safari checks on outer and inner displays in portrait and landscape, live HA narrow/wide embedded-card checks, kiosk display, printer/PDF, keyboard, screen reader, reduced motion, safe areas, and WCAG 2.2 AA contrast/focus review.
6. Confirm the public demo and documentation routes on alles-automatisch.de, publish only fictional demo content, verify SEO canonical/sitemap metadata, and decide whether external Unsplash photos are accepted or self-hosted with credits.
7. Finish the security/privacy review for API token scope, signed media, optional USDA/OpenAI requests, shared standalone account, reverse proxy, and read-only enforcement.
8. Confirm supported HA/Mealie versions, changelog, release policy, compatibility notes, and Marketplace/HACS listing process. Create separate tagged releases only after the relevant package gates pass.

## Demo publishing

Generate the static demo with:

```sh
npm run build:demo
```

For canonical URLs and a sitemap, supply the approved final host and subpath:

```sh
ATELIER_DEMO_BASE_URL=https://example.com/mealie-atelier/ npm run build:demo
```

Do not publish with the example URL. Demo edits remain browser-local and never call the household Mealie instance.

## Official references

[HACS publishing](https://www.hacs.dev/docs/publish/start/) · [HACS include requirements](https://www.hacs.dev/docs/publish/include/) · [Home Assistant Hassfest](https://github.com/home-assistant/actions) · [Home Assistant Mealie integration](https://www.home-assistant.io/integrations/mealie) · [Mealie API](https://mealie.io/documentation/getting-started/api-usage/) · [WCAG 2.2](https://www.w3.org/TR/WCAG22/) · [Apple iPhone Duo adaptive layout](https://developer.apple.com/videos/play/tech-talks/111461/)

## Corrections log

- 2026-10-28 — Imported the checksummed v0.9.5 source archive into the existing Cards and Bridge repositories without replacing their Git histories; moved the standalone app under `web/` and established independent CI/release validation boundaries.
- 2026-10-28 — Corrected build and test scripts that still assumed the original nested archive layout; excluded opt-in live smoke tests from default local suite discovery.
- 2026-10-28 — Re-ran local checks: Cards 60, Web 35, Bridge 26; build outputs are byte-identical. HACS/Hassfest CI and all live/device gates remain outstanding until their remote/device runs complete.
