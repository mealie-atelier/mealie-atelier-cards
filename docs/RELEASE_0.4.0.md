# Mealie Atelier v0.4.0 – Premium Editorial Experience

**Status:** Developer beta; not published, not validated against a real Mealie and Home Assistant installation.

## Changes

- Photo-first desktop gallery and mobile swipe gallery; responsive hero image with readable gradient overlay.
- Full-image recipe details with editorial title, checkable ingredient list, step list, actions to cook, print, plan, shop and edit.
- Dedicated two-panel cooking UI; large steps and progress line. Responsive portrait/mobile fallback. Uses existing safe Mealie image proxy.
- Forms for recipe creation/editing, link import, planner, shopping lists and recipe transfer remain available in a consistent typography system.
- The print studio miniature shows actual recipe ingredients and instruction snippets. Source data is HTML-escaped.
- Print image layout fit improved. Tested against an A4 recipe with photo, notes and five steps on a single page. Weekly plan uses A4 landscape.
- Design Studio and HA card editor: user-selectable portrait, square or wide photo crop, plus existing theme, spacing, columns, accents, corner radius and print templates.
- No browser-side Mealie API token. Only protected image proxy URLs are accepted in the production bundle; generated demo images are deliberately isolated in the sample HTML.
- UI permission flags now default to no-write until the backend status confirms them. Existing backend permission checks remain authoritative.
- A standalone, self-contained HTML showroom lets reviewers interact with a simulated eight-recipe kitchen without any credentials or network requests.

## Validation performed locally

- Home Assistant bridge Python API tests (`python -m unittest discover -s https://github.com/mealie-atelier/mealie-atelier-bridge/tree/main/tests`).
- Node tests for web companion + Lovelace bundle (`node --test`).
- Chromium visual smoke tests at 390 / 820 / 1510 px, food images loaded, no JavaScript exceptions or unexpected body scrolling, including cooking and editor modals.
- Chromium Print to PDF A4 tests: one-page recipe **including demo photograph and notes**, one-page shopping list, one-page landscape weekly planner. PDF images rendered for manual visual review.
- Standalone showroom executed with embedded assets and interactive navigation in Chromium. Note: local-file navigation is blocked in this execution environment, so an end user's direct file:// open could not be separately exercised here.
- Old v0.3 mock API tests remain passing, but are **not** evidence of Mealie release/API compatibility in production.

## Known limits

- This release has not been installed on the user's Home Assistant or connected to real Mealie data. Real versions and API schema changes may expose issues.
- Structured ingredient editing, accurate unit conversion, serving-size scaling, image upload, advanced planner selection, Fully Kiosk sleep handling and end-to-end HACS / Marketplace acceptance are not finished.
- For cards to be publicly discoverable, create public GitHub repositories and comply with the Marketplace's HACS metadata, release and validation process. No guaranteed listing position or ranking.
- Demo photos are intentionally illustrative generated artwork and should not be bundled as if they were actual Mealie user photos.

## Upgrade from v0.3

1. Back up your Mealie DB before using experimental writes.
2. Replace `custom_components/mealie_atelier` and `www/mealie-atelier-cards.js` from the v0.4 manual package; restart Home Assistant for bridge updates.
3. Update Lovelace resource URL to `/local/mealie-atelier-cards.js?v=0.4.0` to bust the browser cache.
4. Open the visual card editor to try Photo Crop settings, then test only against a safe test Mealie instance before production.
5. Standalone app users must rebuild their image because the HTML/JS bundle changed.
