# Open work — Mealie Atelier

**Status checked: 2026-10-28.** This is the canonical index of work that is still open across the Mealie Atelier repositories. GitHub currently has no open Issues in either product repository; that does not mean the project has no outstanding work. The detailed acceptance criteria remain in the linked implementation and release documents.

## Before a stable public release

These are release gates. Do not describe the affected package or capability as stable until its evidence is recorded.

| Priority | Open item | Completion evidence | Details |
| --- | --- | --- | --- |
| P0 | Validate HACS and Hassfest manually against the exact Bridge release candidate. | Validator results and revision recorded; no GitHub Actions involved. | [Release readiness](RELEASE_READINESS_0.9.5.md) · [Bridge install and checks](https://github.com/mealie-atelier/mealie-atelier-bridge/blob/main/README.md) |
| P0 | Complete first-install and recovery acceptance on a disposable Home Assistant instance. | Record native Mealie read-only setup, Bridge URL/token setup, invalid-credential recovery, UI-managed resource registration, and add-card flow. | [Installation guide](INSTALLATION_0.9.5.md) · [Release readiness](RELEASE_READINESS_0.9.5.md) |
| P0 | Verify live Mealie reads and writes on a disposable, backed-up instance. | Record supported-version coverage, pagination, recipe/step images, shopping, meal plans, import/edit, permissions, and batch endpoint behavior. | [Release readiness](RELEASE_READINESS_0.9.5.md) |
| P0 | Test real HA To-do providers before advertising shopping sync. | Bring and another provider pass failure, retry, duplicate-reconciliation, and source-acknowledgement checks. This feature is not implemented yet. | [Smart shopping sync specification](https://github.com/mealie-atelier/mealie-atelier-bridge/blob/main/docs/SMART_SHOPPING_SYNC.md) |
| P0 | Complete real-device, embedded-dashboard, print, and accessibility acceptance. | Evidence for iPhone Duo outer/inner screens in portrait and landscape, narrow/wide HA embeds, kiosk, print/PDF, keyboard, screen reader, reduced motion, safe areas, contrast, and focus. | [Release readiness](RELEASE_READINESS_0.9.5.md) · [visual QA evidence](qa/) |
| P0 | Finish security and privacy review. | Review token scope/storage, signed media, optional USDA/OpenAI requests, standalone account behavior, reverse proxy, data leaving the browser, and read-only enforcement. | [Release readiness](RELEASE_READINESS_0.9.5.md) · [security policy](../.github/SECURITY.md) |
| P0 | Confirm release compatibility and publishing rules. | Supported HA/Mealie versions, changelog, manual validation record, package boundaries, release notes, and Marketplace/HACS process are documented for each independently released package. | [Release readiness](RELEASE_READINESS_0.9.5.md) · [repository map](REPOSITORY_MAP.md) |
| P0 | Choose and verify the public demo/docs host. | Confirm routes on alles-automatisch.de, final canonical URL, DE/EN routes, sitemap/SEO, privacy decision for Unsplash, deployment root, accessibility, and 404 behavior. | [Delivery checklist](DELIVERY_CHECKLIST_2026-10-28.md) · [website plan](WEBSITE_DOCUMENTATION_PLAN.md) |

## Product and presentation improvements

These are valuable follow-up tasks, but do not silently treat them as release gates unless the release scope changes.

| Priority | Open item | Completion evidence | Details |
| --- | --- | --- | --- |
| P1 | Replace screenshot-sequence tours with short recordings of real current UI interactions. | Record distinct flows such as command search, recipe discovery/cooking, and meal planning/shopping; optimize for GitHub and retain the static screenshot gallery as an alternative. Current GIF tours are composed from emulated UI screenshots and are not recordings of live interaction. | [Showcase brief](SHOWCASE.md) · [README](../README.md) |
| P1 | Publish beginner-to-expert DE/EN product documentation. | Verified standalone, Home Assistant, Bridge, card, troubleshooting, release, privacy, and FAQ paths are live and linked from the repositories. | [Website documentation plan](WEBSITE_DOCUMENTATION_PLAN.md) |
| P1 | Revisit the step-by-step recipe presentation and its imagery/text hierarchy using live recipes. | Confirm step photos, crop, text length, progress, and cooking controls remain readable across phone, foldable, tablet, and desktop layouts. | [Design system](DESIGN_SYSTEM.md) · [Release readiness](RELEASE_READINESS_0.9.5.md) |
| P2 | Implement the planned, safe Mealie-to-HA To-do sync. | Durable retry/reconciliation, safe copy/move behavior, clear failure states, German/English UI, and provider acceptance tests pass. | [Smart shopping sync specification](https://github.com/mealie-atelier/mealie-atelier-bridge/blob/main/docs/SMART_SHOPPING_SYNC.md) |

## Completed evidence already on record

- The current neutral Light-mode review covers ten views and fourteen dialogs at nine emulated geometries (216 screenshots), with reviewed contact sheets and no browser-detected document overflow. This is simulation evidence, not physical-device acceptance.
- Cards, Web, and Bridge local suites/build checks are recorded in [release readiness](RELEASE_READINESS_0.9.5.md). They do not prove live-service compatibility.
- GitHub Discussions are enabled on both product repositories with Announcements, General, Ideas, Polls, Q&A, and Show and tell categories; repository READMEs and support guidance link to them.
- GitHub Actions and automatic dependency-update pull requests are intentionally disabled. Run checks and releases manually; never add workflows as a shortcut.

## How to keep this list useful

- Add an item here when work is genuinely open; assign its priority and link the technical source of truth.
- Move completed items into **Completed evidence already on record** with the date, tested revision, and evidence link. Do not just delete them.
- Keep detailed procedures in their dedicated specifications and checklists. This page is the index, not a second copy of every test plan.
- Open a GitHub Issue when work is ready to be scheduled or needs discussion. Use Discussions for questions and ideas; keep security reports private.

## Corrections log

- 2026-10-28 — Consolidated the scattered release and product follow-ups into one canonical open-work index; clarified that empty GitHub issue trackers do not mean there is no outstanding work.
- 2026-10-28 — Verified GitHub Discussions and categories on both product repositories; replaced the stale README animation with current screenshot-based workflow tours that open on request, alongside static screenshots. Real interaction recordings remain open.
