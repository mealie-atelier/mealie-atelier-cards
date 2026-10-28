# Public documentation plan for alles-automatisch.de

## Goal and release boundary

Give Mealie users a clear, maintained German and English destination for the Atelier cards, optional Home Assistant Bridge, and standalone web app. The repository remains the source of truth for versioned setup, compatibility and security details; the public site translates that material into task-oriented instructions. Explain setup choices, permissions, privacy, upgrades, troubleshooting, and known limits before asking people to install anything. The current project is still a developer preview; the public page must say so until the release gates in [`RELEASE_READINESS_0.9.5.md`](RELEASE_READINESS_0.9.5.md) have passed.

The existing site already has a support landing page at [alles-automatisch.de/unterstuetzen](https://alles-automatisch.de/unterstuetzen) and the canonical Ko-fi destination is [ko-fi.com/allesautomatisch](https://ko-fi.com/allesautomatisch). Keep the product guide useful without donation prompts; link to support only in the footer and an optional “Projekt unterstützen” section.

## Proposed information architecture (CMS route still unconfirmed)

1. `/mealie/` — Mealie setup and API basics; link to Mealie's own docs rather than duplicating generic server instructions.
2. `/mealie/atelier/` — product overview, three deployment choices, preview/stable status, compatibility, screenshots, privacy and support.
3. `/mealie/atelier/home-assistant/` — Bridge installation, token permissions, HACS path, Lovelace resource, editor wizard, backups, update and removal.
4. `/mealie/atelier/karten/` — all ten card types, provider limits, responsive layouts, read-only behavior, recipes/photos, shopping and planning.
5. `/mealie/atelier/standalone/` — Docker/Node setup, reverse proxy, passwords, read-only mode, volumes and backup/restore.
6. `/mealie/atelier/fehlerbehebung/` — connection, permissions, stale browser resource, images, empty catalog, API limits, HTTPS and log redaction.
7. `/mealie/atelier/changelog/` — versioned behavior changes, compatibility changes and migrations.
8. `/mealie/atelier/showcase/` — a hands-on, responsive before/after story using clearly fictional demo data. Let visitors switch between a basic Mealie recipe flow and the Atelier cooking flow, inspect desktop/mobile layouts, and try the core interaction without connecting an account.
9. `/en/mealie-atelier/` (or the site’s established English route convention) — equivalent setup choices, privacy notes, troubleshooting and compatibility status. Keep product terms and links aligned with the German pages.

If the CMS is easier to maintain with one page initially, launch the overview as an anchor-linked guide and split when support feedback shows repeated questions. Avoid a broad generic Mealie tutorial that duplicates upstream docs.

## Publication template for every release

- Version, date, preview/stable badge, tested HA and Mealie versions.
- What is included and a brief provider comparison.
- Required backup and minimum permissions.
- Step-by-step setup with screenshots from fictional demo data.
- Explicit read-only and write behavior, network paths, image handling, and what is stored locally/server-side.
- Upgrade and rollback steps.
- Troubleshooting with redacted log guidance.
- Known limitations, compatibility notes, issue/report link, and changelog.
- Optional author credit: “Mit Liebe gebaut von Daniel” linked to `https://alles-automatisch.de/`.
- One low-pressure support link in the footer or support section, linked to the existing site support page and Ko-fi. Never add interstitials, repeated popups, or feature gating.

## Quality and search

- Write in clear German for end users; preserve exact English identifiers, YAML, API service names, and error strings.
- Use a page title and description that distinguish Mealie, Home Assistant, Atelier Cards, Bridge, and standalone Web.
- Add HowTo structured data only for a genuinely step-by-step install page and validate it after CMS rendering.
- Add alt text to all screenshots and provide a text equivalent for diagrams. Mark fictional recipes and mock data clearly.
- Keep the showcase honest: same fictional recipe and user goal in both states, no fabricated performance claims, no live personal data, no autoplay, keyboard-operable controls, reduced-motion support, and a static image/text fallback when interactive previews fail.
- Verify mobile, desktop, keyboard focus, contrast, link targets, redirect/canonical behavior, and page speed after publishing.
- Link to primary docs: [Mealie API](https://mealie.io/documentation/getting-started/api-usage/), [Home Assistant Mealie](https://www.home-assistant.io/integrations/mealie), [HACS publishing](https://www.hacs.dev/docs/publish/start/), and [WCAG 2.2](https://www.w3.org/TR/WCAG22/).

## Launch checklist

1. Repository URLs and issue trackers are established. Confirm the final site CMS route, hosting/deploy path, package releases, supported versions, and release channel before writing canonical SEO links.
2. Adapt the German draft in [`site/de/mealie-atelier.md`](site/de/mealie-atelier.md) to the actual CMS theme; keep installation steps synchronized with package READMEs.
3. Add real stable-release screenshots only after checking that no personal recipe data or hostnames appear.
4. Validate links, screenshots, structured data, responsive rendering, support links, and the rollback instructions.
5. Publish the page and add its canonical URL back to all package READMEs and HA manifest.
6. Review documentation with each release and after upstream HA/Mealie changes.

## Open decisions

- Whether HACS will list Cards, Bridge, or both; do not describe catalog inclusion as completed until accepted.
- Supported version floor and how long preview releases are supported.
- Whether the site uses separate pages immediately or a single anchored guide at first.
- The final CMS route/locale convention and whether the interactive showcase belongs in the CMS or as a static repository-hosted demo.
- Public issue/support contact and how users should share redacted diagnostics.
