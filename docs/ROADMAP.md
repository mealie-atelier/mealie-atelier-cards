# Product roadmap — Mealie Atelier

> Current version: 0.9.5 developer preview. Historical milestone checklists below preserve the earlier plan; current release blockers and final steps are tracked in [RELEASE_READINESS_0.9.5.md](RELEASE_READINESS_0.9.5.md).

## Vision

An exceptional, local-first kitchen studio: a polished recipe library, delightful cooking experience, useful daily overview, grocery planning and an easy, visual configuration flow for Home Assistant and standalone screens.

Product principles: real usability over decoration; excellent phone/tablet UX; no API tokens in the browser; no tracking; clear update paths; accessible components; Mealie stays the system of record.

## v0.1 — Original proof of concept

- [x] Home Assistant bridge, configuration form, signed image proxy and native Lovelace graphical card editor.
- [x] Five cards, unified dashboard, responsive dark/light design, recipe search and cook mode.
- [x] Planner, shopping list, recipe import and standalone Docker/Node companion.

## v0.2 — Current developer preview

- [x] Sixth **Today** card.
- [x] Create shopping lists and transfer ingredients from recipes.
- [x] Recipe editor: title/description, servings, optional replacement of instructions, plus explicitly enabled **experimental** replacement of unlinked ingredient text after backup.
- [x] Backend-enforced read-only mode in HA integration options and web companion.
- [x] Mealplan `start_date`/`end_date` fix and HTTP fixture tests.
- [x] Mobile/desktop visual smoke tests using simulated data.
- [x] Updated docs, screenshots, versioning and release checklist.
- [ ] Real Mealie 3.x + Home Assistant 2026.10+ compatibility and acceptance tests.
- [ ] Full accessibility pass; keyboard/focus handling; Safari and real Fully Kiosk tests.

## v0.3 — Next big milestone

- **Guided kitchen kiosk:** landscape/tablet presets, no accidental screen sleep (with device consent), clear back/forward, timer integration, large readable step cards.
- **Real recipe editing:** linked Mealie foods, units, quantities, categories, tags and cover art; explicit previews and undo/backups.
- **Full library planner:** server-side paginated recipe picker with filters, keyword search and favorites.
- **Household workflows:** shopping overview by list, multi-list management, ingredient scaling for portions and household profiles.
- **Advanced design studio:** visual card templates, presets per display, configurable typography and section visibility, reliable per-device export/import.
- **Realtime and robustness:** refresh policies and optimistic update rollback with accessible error toasts and skeleton loaders.

## v1.0 — Public release target (not achieved)

- [ ] Real integration and compatibility test matrix including Mealie versions.
- [ ] HACS action and hassfest passing in public repositories, tagged GitHub releases, issue/PR templates and changelog.
- [ ] Approved catalog entries and smooth installation in HACS / Home Assistant Marketplace.
- [ ] Security review, rate limits, log redaction, reauthentication/token rotation and permissions model.
- [ ] Native German/English translation checks, a11y/touch tests and a 30-second introductory walkthrough.

## Discoverability — earned, not manipulated

Useful and honest GitHub descriptions, first-run wizard, meaningful demo screenshots clearly marked as demo, regular releases, compatibility notes, good issue support and a responsive feedback loop help adoption. Marketplace visibility/rank is ultimately controlled by the catalog/UI and user adoption, not by keywords alone.

## v0.4 – Photo-led redesign & print QA (implemented 28 Oct 2026)

- [x] Premium photography-led gallery / featured hero / editorial recipe modal and cook mode.
- [x] Mobile recipe carousel and responsive two-panel cook UI.
- [x] Visual photo crop settings (portrait, square, landscape) and safe default permissions.
- [x] Offline, self-contained showcase with generated food photography.
- [x] Actual A4 recipe photo, shopping and weekly PDFs visually verified in Chromium.
- [ ] Validate *live* on a real Mealie server and a Home Assistant instance.

## v0.5 – Release readiness (next)

- [ ] Real Mealie API schema/compatibility tests for supported Mealie versions; do not mutate personal data during tests.
- [ ] Real HA/HACS installation on a dedicated test instance; verify config entry, bridge auth, image proxy and cards.
- [ ] Structured ingredient editor (unit/food refs), serving size conversion, picture upload and correct rollback.
- [ ] Fully Kiosk tablet tuning and browser/print cross-engine test matrix.
- [ ] Security/privacy and accessibility review; public CI/HACS/hassfest checks before Marketplace submission.
