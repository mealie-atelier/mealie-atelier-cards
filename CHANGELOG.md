# Changelog

All notable changes to Mealie Atelier Cards, the standalone Web app and the demo are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions before 0.10.0 were developer previews.

## [Unreleased]

### Fixed

- Text no longer sits on a blurred compositing layer after a view change: the enter animations stop holding their end frame, which left Safari rendering the whole view slightly soft.
- The pantry and the shopping assistant show the piece unit as "Stück" / "pcs" instead of the stored key "stück", also in the notes sent to the shopping list.
- On phones and narrow cards each day of the week carousel keeps its own height, so a single dish no longer sits above a large empty area.
- Focused card types open their own view. `type: custom:mealie-atelier-today` (and every other focused type) without a `mode` showed the complete kitchen; the type now sets its start view, and an explicit `mode` still wins.
- The visual editor preview no longer shows `extra keys not allowed` once a Bridge connection is picked: the status request is sent without `entry_id`.
- Home Assistant's card picker lists the ten card types with German names and descriptions in a German Home Assistant.
- Kochinspo recognises meat and fish anywhere in German compound words (Hähnchenbrust, Rinderhackfleisch, Lammschulter, Miesmuscheln, Seelachs). "Mit Fleisch" and "Mit Fisch" found nothing, and vegetarian or vegan suggestions could include a chicken soup. Look-alikes stay vegetarian (Fleischtomaten, Kürbisfleisch, Hühnereier, Parmesanrinde, Austernpilze, Steakpfeffer, Hirschhornsalz, tamarind), anything marked vegan or vegetarian never counts as meat, plant drinks and plant cream no longer block vegan suggestions, and eggs inside compounds (Wachteleier, Eiernudeln) do. Every option of a line counts ("Gemüse- oder Hühnerbrühe" is not vegetarian), a plant label only counts for the product as written and not for an alternative after "oder" or "vegan:", and named cheeses and dairy (Feta, Ricotta, Schmand, Ghee, Skyr) as well as vegetarian Parmesan or protein quark are not vegan.
- Safari and other WebKit browsers no longer jump the page down by the card's height after a tap that re-renders the card (Kochinspo choices, settings, ticks). The Kochinspo wizard scrolls back up only when its top has left the screen.
- The corner style in the design settings shows the active option when no radius was set.
- The Kochinspo time step always shows a selected limit. The default of 40 minutes matched none of the choices, so nothing was marked; a saved limit now selects the next choice up.

### Changed

- A card that fills a panel view in Home Assistant drops its frame and runs edge to edge.
- Recipe photos appear in the week grid, in today's plan and in the cookbook list.
- Demo: the meal plan fills the whole current and next week from Monday, so the week view never opens on empty days.
- Exclusive design settings (theme, density, motion, photo crop, corners) are a typographic choice with an accent underline instead of a row of filled buttons; the print section is titled "Druckstudio" / "Print studio".
- Kochinspo choices (diet, cookbooks, time, pantry, ingredients to avoid) are a typographic register with an accent underline instead of rows of rounded chips.
- The search launcher in the toolbar has the same shape as the refresh and settings buttons, the active tab on phones has a straight accent line, and the daily shortcuts keep their labels on one line.
- Demo: dark theme with the green accent by default, the page chrome uses the same palette, the language switch is a typographic register, recipe pages show "Vorbereitung" and "Kochen" in German and leave out zero times, and every external link opens in a new tab.

## [0.10.0] - 2026-10-29

First release prepared for the Home Assistant Marketplace (HA 2026.11), with HACS as the second install route.

### Added

- Offline queue in the cards for shopping edits. Ticks made without a connection are kept on the device and replayed in order when the connection is back. Failed entries show a Discard action, and the bar offers to send them again. The standalone web command was renamed to `offline_replay`.
- Per-user write grants. The cards read the Bridge permissions and hide write and admin actions a person cannot use, with a clear notice when a write grant is missing and a localized message for every error code.
- Accounts in the standalone app through `ATELIER_USERS` (`username:role:scrypt-hash`, roles admin, writer, reader). The shared password keeps working as admin. `npm run hash-password` creates hashes.
- Structured recipe editor with food and unit comboboxes, a review step with scaled preview and a history list with restore. Cover and step photos can be uploaded through bounded, checksummed upload sessions. The web app saves a JSON snapshot before every recipe write.
- Searchable, paginated recipe picker in the meal plan dialog (debounced search, 20 per page, keyboard navigation, category, tag, favourites and sort filters). The web app accepts the same filters.
- Smart Shopping Sync interface in the Shopping view: a status dialog per rule and a seven step setup with a preview of the first batch that is only sent after explicit confirmation. The standalone app reports that sync is not supported.
- Marketplace readiness: HACS validation workflow, package metadata, `hacs.json` and a pinned Prettier setup with a local pre-commit gate.
- Cook mode keeps the screen awake while you cook.
- Opt-in `ATELIER_TRUSTED_PROXIES` so the sign-in throttle sees the real client behind a reverse proxy.

### Fixed

- Security: timers in the standalone app now belong to the person who created them. Listing shows only your own timers and cancelling needs the owner or an admin, also when a shared cooking session is ended (admins see all; timers stored without an owner are admin only). The timer limit counts only active timers, with at most 20 per account.
- Security: `journal_set` now needs the write level in the standalone app, because the journal is one shared object that a reader could overwrite. The app reports `features.shared_journal`, so the cards hide journal actions from readers there.
- Sign-in throttle behind a reverse proxy: the server logs a one-time warning when a private address sends `X-Forwarded-For` while `ATELIER_TRUSTED_PROXIES` is empty, because all users would then share one throttle counter.

### Changed

- Demo photos are self-hosted as WebP files in `demo/photos` instead of being loaded from an external CDN. Photographer credits are kept, and absolute `og:image` and JSON-LD URLs are emitted when a base URL is set.
- The card keeps the first signed photo URL per recipe photo for 90 minutes, so refreshes no longer reload every image. A new photo gets a new URL.
- Recipe edits in the standalone app are attributed to the signed-in person.
- The demo build fails on a missing template anchor and pins the language of each page.
- Hardened the web app image, response headers and sign-in handling. Sign-in lockouts are now at most 60 seconds, and IPv6 clients are keyed by /64.
- Hardcoded interface text was moved into the German and English locale files, and failed actions now show a message.
- The plain-text ingredient path is replaced by the structured editor. The commands `ingredient_preview`, `ingredient_save`, `ingredient_catalog` and the route `/api/recipe-image/*` stay as deprecated aliases during 0.10.x.

### Fixed

- Recipe and cook dialogs open above the Home Assistant sidebar instead of being partly covered by it.
- Re-rendering an open dialog no longer moves focus into its first field.
- The cooking mode swipe hint and the new-list dialog heading are translated instead of always German.
- Optimistic rollbacks undo only their own change, so a write that succeeded in between is no longer wiped. A failed write reloads the collection, and pending rows are disabled while saving.
- A queued entry the user took back is never replayed, and a failed tick holds back later ticks on the same item so their order holds.
- Losing the write grant clears the offline queue instead of replaying it.
- Behind a reverse proxy, one attacker no longer locks out every user.

## [0.9.5]

### Added

- Read-only provider for Home Assistant's built-in Mealie integration. Recipe search, details and cooking steps work without the Bridge and without a Mealie token in the card.
- Guided card setup that detects a single Mealie connection, plus a provider choice per card (`auto`, `atelier`, `home_assistant`).
- Server-managed shared-session alarms with Home Assistant notifications (Bridge) or optional Web Push (standalone app).
- Bilingual static demo built from ten fictional recipes, with 20 recipe pages for search engines.
- Standalone install path with platform-aware browser guidance, Apple touch and maskable icons.
- Neutral Light and Dark themes.

### Changed

- The standalone app and demo moved into the Cards repository (`web/` and `demo/`). The Bridge integration lives in its own repository.
- Catalog paging, signed recipe and step photos, cookbooks, shopping and planning stay Bridge features. The Core provider requests up to 500 matches and pages them locally in sets of 24.

## [0.9.3]

### Changed

- Legacy stylesheets were merged into the design system modules. Views, dialogs, nutrition and journal displays, print renderers and the card editor moved into `src/components/`. The migration produced no visual change in a pixel comparison of ten views at four sizes.
- The build assembles one deterministic bundle for `dist/` and `web/public/`.

### Added

- HTTP level contract tests for the ingredient workflow, photo upload, write limits and the Home Assistant handlers.

## [0.9.2]

### Added

- Central polish stylesheet with consistent spacing, typography, surfaces and contrast.
- Self-contained offline demo with eight embedded sample photos.

### Changed

- Panels and grids follow the card width, not only the window width. Narrow card columns and tablet widths get proper layouts.
- Icon-only buttons have accessible names and 44 × 44 px targets. Dialogs and views carry localized ARIA labels.
- Buttons without an explicit type no longer submit forms by accident. Recipe search uses `type="search"`.

### Fixed

- Mobile overflow in the dashboard and in Manage caused by the recipe gallery rail.

## [0.9.1]

### Added

- Shared control system for checkboxes, radios, checkable lists, selection buttons and forms, with 44 px touch targets, 22 px check marks and hover, focus, checked, disabled and validation states.
- The card editor has consistent controls and four clear categories.

### Fixed

- The cookbook recipe picker updates its counter and PDF action.
- Shopping and family checkboxes have the correct role and an accessible name.
- Accent, theme, motion and print template choices report their state with `aria-pressed`.

## [0.9.0]

### Added

- Modular design system with semantic tokens, layout primitives and shared card, form and button states.
- Reproducible build of the Home Assistant bundle and the standalone bundle.
- Unit tests for structured ingredient merging, version conflicts, file signatures and upload sizes.

### Changed

- The width of the Home Assistant card, not the window, drives responsive grids. Mobile week cards use wider scroll-snap cards.

### Fixed

- Studio main view no longer squeezes into two narrow panels between 900 and 1180 px.
- HTML in recipe titles is escaped.

## [0.8.0]

### Added

- Connection check in Manage (read-only checks for the Bridge, recipes, shopping lists, meal plan and Atelier storage).
- JSON export of Atelier household data (pantry, ratings, shared sessions).

### Changed

- Pantry and ingredient matching uses structured quantities, normalizes g/kg and ml/l, flags unclear units, counts a pantry item only once and ignores expired items. Servings scale up and down.
- Delete, session change, AI consent, quality check and shopping actions use styled dialogs instead of browser prompts.
- The cookbook cover prints on white paper with dark green text, even with background graphics disabled.

### Fixed

- A new shared cooking session no longer replaces a running one without consent, and family members with open tasks cannot be removed silently.

## [0.7.0]

### Added

- Quick access with Ctrl/Cmd + K (or `/`). In Home Assistant it only reacts while the card has focus.
- Motion levels Lively, Subtle and Off per device, honoring the system reduced motion setting.
- Swipeable main navigation on small screens, swipe and arrow key navigation in the cooking cockpit.

### Changed

- Shared motion language: page transitions, card depth, dialog opening, success feedback and loading states.
- Stronger keyboard focus rings, focus returns after a dialog closes, larger touch targets.

## [0.6.0]

### Added

- Cookbook studio with cover, table of contents and several recipe pages.
- Recommendations by time budget, pantry, expiry, taste, favourites and cooking history.
- Seven day meal plan with a preview that keeps existing entries, leftovers and ingredient overlap.
- Pantry with quantities, expiry dates and a shopping list built from planned meals.
- Recipe memory with rating, favourite and personal notes.
- Shared cooking sessions with progress sync, shared timers, family members and helper tasks.
- Quality check and substitution suggestions on request.
- Cooking cockpit with timers, browser text to speech and voice input, and optional Home Assistant scene, volume and TTS actions.
- Wall tablet kiosk layout and a graphical Lovelace editor.

## [0.5.0]

### Added

- Nutrition: USDA FoodData Central search and per-ingredient totals in the Bridge and the standalone app. Eight tracked nutrients with coverage checks. Optional AI search term suggestions. Nothing is saved to Mealie without confirmation.
- Multiple on-device cooking timers and a personal recipe journal.
- Optional nutrition values in the Print Studio.

## [0.4.0]

### Added

- Photo-first desktop gallery and mobile swipe gallery with a full-image recipe detail view.
- Two-panel cooking mode with large steps and a progress line.
- Photo crop choice (portrait, square or wide) in the Design Studio and the card editor.
- Standalone HTML showroom with simulated data.

### Changed

- UI write permissions default to off until the backend confirms them.

## [0.3.0]

### Added

- Print Studio with A4 documents for recipe, shopping list and meal plan (landscape), editorial, compact and economical presets, and Save as PDF.
- Guided forms for creating, importing and editing recipes, shopping lists and the week plan.
- German and English card interface.

## [0.2.0]

### Added

- Today card as the sixth card type.
- Creating shopping lists and adding recipe ingredients to a list.
- Extended recipe editor with name, description, servings and steps.
- Read-only mode (Home Assistant option or `ATELIER_READ_ONLY=true`), enforced on the server.

### Fixed

- Meal plan API parameters (`start_date`, `end_date`).
