# Mealie Atelier design system

**Binding design and implementation rules for the standalone web app, the Home Assistant cards and the Bridge.** Valid for release 0.10.0 and newer; changes per version are in the [changelog](../CHANGELOG.md). The shorter [control system note](CONTROL_SYSTEM.md) covers the shared controls.

## 1. Principles

Every screen uses the same design system. New views must not add global CSS exceptions for individual devices or private browser windows. Standalone web, HACS/Lovelace cards, and the offline demo are generated from the same component and style sources.

The visual direction is a calm, photographic kitchen studio: excellent food photography, highly legible serif headings, restrained sage green, clear text contrast, generous spacing, and precise micro-interactions. Avoid generic admin tables and motion that distracts from the task.

## 2. Localization contract

- Ship German and English as complete interface languages. `auto` follows the Home Assistant language in cards and the browser language in the standalone web app, then falls back to English. Users can choose German or English explicitly; an explicit choice always wins over automatic detection.
- Translate every Atelier-owned string, including setup, editor, dialogs, notifications, validation, print layouts, empty/error/loading states, keyboard help, and accessible names. Recipe titles, ingredient names, Mealie content, and other user-authored data remain in their source language.
- Keep translations in the standalone `src/i18n/` module, with one resource file per locale and one shared resolver. Never scatter locale tables across view modules or add new user-visible German or English literals directly to view markup or event handlers.
- Register an additional language by adding its complete locale JSON file; the bundle builder discovers supported locale files automatically. Runtime branching must use the resolved locale or translation helper, not a list of hard-coded language checks.
- Every locale must satisfy the same key contract. English is the canonical fallback; missing keys are reported by the localization tests, and plural or parameterized messages use named resolver arguments rather than string concatenation.
- Format dates, numbers, plural labels, and speech language with the resolved locale. A language change must update the current view and any open dialog immediately without clearing user data or configuration.
- Locale coverage includes user-visible runtime errors and compact editorial eyebrow labels, not only primary buttons and headings. Offline modules return stable error codes; the UI maps them to locale resources instead of exposing language-specific exception text.
- Validate both languages with representative full-flow screens, including long German labels, keyboard navigation, screen-reader names, print output, and all responsive viewports.

## 3. Home Assistant setup contract

- Make the recommended path UI-only: no YAML, token pasted into a dashboard, or manual resource registration when the Home Assistant Marketplace/HACS can manage it.
- Start by offering two honest paths: native Home Assistant Mealie for read-only recipe search/cooking without an Atelier server, or the optional Mealie Atelier Bridge for photos and full kitchen workflows. Never make the Bridge sound mandatory for the limited native path.
- Detect an existing Home Assistant Mealie connection and select it automatically when there is exactly one. If there is no usable connection, show the next concrete action and a recovery path in the visual card editor.
- Ask only for credentials required by the selected path. Explain that the Mealie URL must be reachable from the Home Assistant host, where to create an API token, and how to resolve common address/certificate errors. Never request credentials in Lovelace card YAML.
- Keep optional nutrition/AI and experimental settings out of first-run setup. Explain write permissions before users enable household changes; retain safe, explicit defaults.
- Keep the first-run card wizard short, skippable, keyboard accessible, localized, and focused on choosing a starting view and appearance. Installation, data connection, and card appearance are distinct tasks.
- Provide no-YAML install instructions first. Keep manual install and YAML-managed-resource recovery as clearly labeled advanced routes, and never promise Marketplace one-click links before canonical repositories and owners are published.
- Validate the complete new-user journey against both paths, including a missing Bridge, missing native Mealie integration, wrong URL, invalid token, stale frontend resource, and direct recovery without removing existing dashboard data.

## 4. Repository structure

```text
mealie-atelier-cards/
  src/
    card-core.template.js         # Stable HA/Mealie component core, not a generated bundle
    studio-core.js                # Kitchen logic
    studio-ui.js                  # Kitchen and studio views
    design-system/
      foundation.css              # General views and structure
      editorial.css               # Photographic art direction
      kitchen.css                 # Kitchen, studio, and family views
      motion.css                  # Motion and interactions
      adaptive.css                # Container adapters for legacy breakpoints
      tokens.css                  # Central design tokens
      layout.css                  # Responsive container layouts
      components.css              # Panels, fields, lists, and states
      controls.css                # Checkbox and control behavior
      polish.css                  # Approved presentation rules
      control-refinement.css      # Final shared control geometry and states
      editor.css                  # Home Assistant visual editor
      corners.css                 # Shared corner radii
      recipe-editor.css           # Structured recipe editor
      recipe-picker.css           # Recipe picker
      shopping-sync.css           # Smart Shopping Sync
      primitives.js               # Escaping UI constructors
    i18n/
      en.json, de.json            # Locale strings, English is the fallback
      resolver.js                 # Shared locale resolver
    components/
      offline-queue.js            # On-device write queue and ordered replay
      recipe-editor.js            # Structured recipe and ingredient editor
      recipe-picker.js            # Searchable recipe picker
      shopping-sync.js            # Smart Shopping Sync settings and status
      print-document.js           # Standalone print renderer
      print-actions.js            # Print configuration and actions
      views.js                    # Recipe, planning, and list views
      nutrition-journal.js        # Nutrition workflows and local notes
      dialogs.js                  # Modal workflows and dialog content
      editor.js                   # Home Assistant visual card editor
  scripts/build-design-system.mjs # Reproducibly generates both bundles
  dist/mealie-atelier-cards.js    # Generated HACS artifact
  demo/preview.html               # Local interactive fixture demo
```

**Migration in v0.9.3:** The four historical CSS files were moved into `design-system/`. Their proven rules and cascade order were preserved to avoid visual regressions. Dynamically cloned media queries are now static and reviewable in `adaptive.css`. Large parts of the card renderer were also moved into `src/components/`. Some older selectors remain within the semantic modules. Further simplification requires another pixel regression review.

## 5. Tokens and controls

- **Spacing:** `--ds-space-1` through `--ds-space-16` map to the shared 4 px spacing scale; intermediate `--ds-space-7` is 28 px for deliberate page rhythm.
- **Radius:** `--ds-radius-sm`, `--ds-radius-md`, `--ds-radius-lg`, `--ds-radius-xl`, and `--ds-radius-pill`.
- **Surfaces:** `--ds-background`, `--ds-surface`, and `--ds-surface-raised`.
- **Typography:** `--ds-font-xs`, `--ds-font-sm`, `--ds-font-md`, `--ds-font-lg`, `--ds-line-tight`, and `--ds-line-body`. Families are semantic too: editorial display headings use `--ds-font-display`; interface and recipe copy use `--ds-font-ui` and `--ds-font-reading`.
- **Motion:** `--ds-motion-fast`, `--ds-motion-base`, `--ds-motion-enter`, `--ds-motion-slow`, `--ds-motion-image`, `--ds-motion-image-long`, `--ds-motion-loading`, `--ds-motion-reduced`, `--ds-motion-ease`, `--ds-motion-spring`, and `--ds-motion-linear` are the shared timing and easing values for UI motion. The expressive/balanced/off setting scales these tokens; `prefers-reduced-motion` always wins. Legacy `--at-*` names are aliases only and must point back to these tokens. No stylesheet may introduce raw transition durations or curves. The Home Assistant editor has a separate shadow-root stylesheet; bundle generation copies the central motion-token declarations into that stylesheet, so `editor.css` must use the tokens without redeclaring their values.
- **Semantic colors:** `--ds-text`, `--ds-muted`, `--ds-border`, `--ds-brand`, and `--ds-ring` derive from the selected theme.
- **Themes:** Dark and neutral stone-and-plum light surface palettes are declared once in `tokens.css`; components consume semantic surfaces, text, borders, button foreground, and sidebar tokens. The standalone shell and install dialog follow the saved card theme and update the browser theme color. Editorial photography treatments must have a Light variant and cannot carry the dark green overlay into Light mode. The expressive, balanced and off motion presets also apply to the standalone shell. Custom accent colors remain user-controlled and must remain legible against both palettes.
- **Controls:** `--ds-control-height` and `--ds-touch-height` are 48 px. Standard buttons and icon buttons are 48 px tall. Compact `.tiny` and `.plain` buttons retain a 44 px minimum. Text fields and single-selects in the cards, standalone shell, and HA visual editor use a 48 px minimum. Checkbox and radio controls are 22 px, with a 44 px minimum label-row target.
- **Control geometry:** `--ds-control-padding-x`, `--ds-control-padding-y`, `--ds-field-padding-x`, `--ds-field-padding-y`, `--ds-control-gap`, `--ds-control-icon`, `--ds-select-arrow-size`, `--ds-select-arrow-inset`, and `--ds-select-clearance` define shared spacing, icon size, and select text clearance. Keep the single-select arrow and text inset in `control-refinement.css`, where its selector must outrank legacy field rules.
- **Grid:** `--ds-grid-gap`, `--ds-panel-padding`, `--ds-page-gutter`, `--ds-sidebar-width`, and `--ds-content-max`.
- **Recipe steps:** Mealie section titles, step summaries, body text, ingredient references, and embedded step photos must stay associated when steps are reordered or edited. Never render Mealie instruction HTML. Extract only same-recipe asset image references, proxy them through the authenticated standalone app or signed Home Assistant route with filename and image-type validation, and render text and photos in shared responsive step cards. Preserve existing step metadata and embedded photos on text edits by carrying stable step IDs.

Views must not assign ad hoc colors or spacing to whole screens. Add a semantic token or shared component variant when a deliberate exception is needed. Every routed view gets the shared `.ds-page` rhythm; every new panel, field, message, and action group uses a shared component or primitive. Component CSS owns markup geometry. Inline styles are allowed only for validated per-instance values, such as the selected accent, recipe-card ratio, or progress value; never use them for spacing, color, or layout.

## 5.1 Non-negotiable UI contract

- Start each new view from `.ds-page`; use `.ds-page-header`, `.ds-grid`, `.ds-stack`, `.ds-cluster`, `.ds-surface`, `.ds-field`, and `.ds-empty` rather than inventing a page-specific layout.
- Use spacing, typography, color, border, radius, shadow, and motion tokens. CSS pixel values remain appropriate for intrinsic icon geometry, control targets, hairlines, and data-driven image ratios; they are not substitutes for the spacing scale.
- Add variants to shared components when two views need the same treatment. Do not duplicate one-off control, card, dropdown, checkbox, focus, or disabled-state styling in feature stylesheets.
- Every interactive component defines rest, hover, focus-visible, pressed, disabled, and reduced-motion states. Motion should give feedback: short button and selection responses, a restrained view/dialog entrance, and small image movement on deliberate pointer hover. Do not animate idle branding, perpetually pulse controls, delay actions, or transform touch targets. Stay to transform/opacity where possible.
- Keep a single quiet author credit per rendered surface. It reads “Made with ♥ by Daniel”; “Daniel” links to `https://alles-automatisch.de/` in a new tab with `rel="noopener noreferrer"`. On wide dashboard cards the credit lives in the sidebar footer; on compact, single-view, and kiosk layouts it moves to the end of the content. It is text, never a banner, sticky element, or recurring animation. Its heart may respond once on hover/focus and honors reduced motion.
- Add a regression guard when adding a token family or shared component. Keep the standalone shell's small outer-surface tokens mapped to the same values documented here; the card's shadow root is the source for card component styling.

## 6. Layout and breakpoints

**Container queries are required.** A Home Assistant card can be 380 px wide inside a 1510 px browser. Layout decisions must use the actual card width, not only `window.innerWidth`.

- **Above 1180 px card width:** Wide desktop layout, with two columns where the content benefits.
- **At or below 1180 px:** Keep the studio main grid to one column to avoid compressed panels.
- **At or below 860 px:** Stack details, editor, and Print Studio content.
- **At or below 760 px:** Use a horizontally scrollable navigation, adaptive spacing, and flexible forms.
- **At or below 430 px:** Use compact horizontal day cards with a visible next-day preview and accessible button and checkbox targets.

**Shared building blocks:** `.ds-page`, `.ds-page-header`, `.ds-grid`, `.ds-grid--split`, `.ds-grid--three`, `.ds-grid--auto`, `.ds-stack`, `.ds-cluster`, `.ds-surface`, `.ds-field`, and `.ds-empty`.

Views use the shared `AtelierUI` constructors for `pageHeader`, `sectionHeading`, `surfaceStart`, `field`, `metric`, and `empty`. User data is escaped there. HTML markup in title strings is prohibited.

## 7. Forms, navigation, dialogs, and motion

1. Provide labels, a clear field purpose, examples or hints, and validation feedback.
2. Give buttons a visible keyboard focus state. Important actions must not depend on hover.
3. Confirm destructive and write actions in a clear, explicit dialog.
4. Give loading, success, empty, offline, and conflict states their own visible treatment.
5. Use animation to communicate transitions and confirmation, not to delay input. Keep the expressive, balanced and off presets and honor `prefers-reduced-motion`.
6. Horizontal scrollers use scroll snap, a visible edge, and clear navigation cues.
7. Support keyboard interaction, including Escape to close dialogs, while preserving native focus behavior.
8. Separate print layouts from the screen design. Support A4, clear page breaks, optional photos, and ink-saving output.

## 7.1 Kochinspo recipe discovery

**Interaction contract:** The discovery view is named “Kochinspo” and behaves as a short, progressive recipe wizard, not a profile form. Choices are derived from the locally loaded Mealie recipe catalog, the household's live Mealie cookbooks, and shared Kitchen Intelligence ranking. Ask only high-value questions: eating style (anything, vegetarian, vegan, meat, or fish), optional collection selection from supported Mealie cookbook filters, child-friendly/mild preference, people, time budget, pantry-first ranking, and disliked ingredients. Multiple cookbook choices use union semantics; with no selection, all loaded recipes remain eligible. Persist selected cookbook slugs with the other preferences in the existing private Atelier profile. Only evaluate one-clause tag/category ID `IN` filters against recipe IDs; never execute cookbook filter text. Allergy safety is never inferred or promised from tags or ingredient text; show a calm reminder to check the recipe itself.

**Real Mealie data normalization:** Mealie time fields may be localized strings or ranges (for example `25 – 30 Minuten`), not numbers. Parse them for conservative time-budget filtering and ranking using the upper end of a range; preserve the source wording in recipe displays and never append a second unit. Sum explicitly labeled phases only when the field clearly describes separate phases. Mealie often stores a usable base quantity in `recipeYieldQuantity` and a unit in `recipeYield` while `recipeServings` is zero. Use that quantity as a serving basis only when the unit explicitly means people/portions/servings; never treat pieces, slices, or other yields as servings. Scale ingredients only when this verified basis is positive. Preserve unknown durations and ambiguous yield units without guessing.

Show a single, editorially strong recipe suggestion with its image, time, servings, and explainable match reasons, followed by a small set of alternatives. Re-selecting a suggestion is an explicit user action. When opening that recommendation, scale only clearly numeric ingredient amounts to the chosen household size; preserve ambiguous free-text measures and disclose them for manual review. Keep weekly planning below the wizard. Load catalog pages using the reported total, with a 600-recipe safety cap; show live loading progress and disclose when the result set is partial. Filter and ranking semantics live in `studio-core.js`; validation and persistence live in `studio-state.mjs`; markup uses shared Atelier primitives and tokens.

**Visual brief:** Preserve the existing calm photographic kitchen-studio art direction. Use the existing ink/charcoal surface and sage accent tokens, Georgia display headings, and the current interface type. On wide containers, pair a compact preference panel with a large food-photo hero; stack the selection and hero cleanly in narrow containers, including all four iPhone Duo poses. Use a typographic register with an accent underline for preference choices (no pill or chip rows), a restrained four-part progress cue, and compact photo-led alternative cards. Interaction changes may use the existing spring/base motion tokens for one short transition; never add idle animation and always honor reduced motion. Keep the recipe image, title, and metadata in one clear hierarchy.

```text
Kochinspo
┌─────────────────────────┐   ┌──────────────────────────────────┐
│ 01 / Geschmack          │   │                                  │
│ [Alles] [Vegan] [...]   │   │          Rezeptfoto              │
│ 02 / Wer isst mit?      │   │  Hauptvorschlag · Zeit · Portion │
│ Personen · Zeit · Vorrat│   │  Warum passt es? · Rezept öffnen │
│ [Passende Ideen zeigen] │   └──────────────────────────────────┘
└─────────────────────────┘   Alternativen als kleine Bildkarten
```

## 7.2 Home Assistant card compatibility and editor

- Treat the Lovelace card resource as a product in its own right: it runs in Home Assistant without the optional Atelier Web server and has no external runtime dependency.
- Use provider capabilities explicitly. `atelier` is the full signed-proxy provider; `home_assistant` uses only Home Assistant Core's documented Mealie response actions and stays read-only; `auto` prefers Atelier and may fall back only for supported reads. Never silently route writes to a weaker provider.
- The editor reports the detected provider and its capabilities before setup completes. Setup may be skipped and retried. Expose capabilities in plain language, and give unsupported modes a useful alternative path instead of a broken/empty card.
- Core Mealie images are not loaded by constructing guessed URLs or exposing Mealie credentials. Hide them unless delivered through a trusted authenticated proxy. Normalize official response shapes once in the provider layer; view components consume a stable internal recipe shape.
- The editor uses shared tokens and component states. Settings are grouped by outcome (content, layout, motion, optional devices), defaults are previewable, and advanced fields stay collapsed until requested. Every option must do something visible and be keyboard/touch accessible. Reduced-motion remains authoritative.
- Validate the HA card/editor at actual card widths, including narrow dashboard columns, and inspect loading, disconnected-provider, read-only, disabled, and error states in addition to the happy path.

## 8. Quality gates and tests

**Code:** From the Cards repository root, run `npm run build`, `npm test`, `npm run check`, `node --test web/test/*.test.mjs`, and `npm run build:demo`. In the Bridge repository, run `uv run pytest -q`, `uv run ruff check`, and `uv run ruff format --check`.

**Browser:** Use `demo/preview.html` with the generated card bundle and local fixture data. Review all ten views and every supported dialog at 375 px, 720 px, 1010 px, and 1470 px. Also render a 380 px card inside a 1510 px browser to exercise container queries used by Home Assistant dashboards. Check dialogs both within their viewport-constrained scroll area and with the complete content exposed for visual review. The card must not gain unintended horizontal scrolling. Horizontal scrolling is expected for the navigation, recipe galleries, and weekly planner.

**iPhone Duo:** Keep adaptation tied to available width, height, and pose, never a device-name check. Baseline browser simulations use CSS-pixel estimates derived at 3× from [Apple's display resolutions](https://support.apple.com/en-us/148588): outer portrait 466×678 and landscape 678×466; inner portrait 626×890 and landscape 890×626. Safe areas and browser chrome vary, so these are layout baselines rather than guaranteed usable-content dimensions. Check all ten views and every supported dialog in all four poses. The outer screen uses a trailing vertical icon rail with screen-reader labels, respects top and bottom safe-area insets, and keeps content compact in portrait. In outer landscape, recipe and cooking dialogs pair photos with scrollable instructions. The inner portrait can place ingredients beside instructions; inner landscape gives recipe details a dedicated photo pane and a scrollable reading pane. Keep review screenshots out of the repository. Apple also recommends adaptive layouts based on available size rather than assumptions about the device pose; see [Prepare your app for iPhone Duo](https://developer.apple.com/videos/play/tech-talks/111461/).

Live Mealie, live Home Assistant, external AI/USDA providers, and Fully Kiosk are outside this local gate.

## 9. Definition of done for every view

- Use shared tokens and components. Do not add ad hoc styles inside a view.
- Check touch, mouse, and keyboard use; focus, loading, empty, error, confirmation, and read-only states.
- Check card widths from 375 px to 1470 px, including a 380 px card in a wide browser.
- Prevent overflowing labels, clipped buttons, cramped form columns, and unreadable recipe photos.
- Check reduced motion and print output when relevant.
- Protect API writes with permission checks, input validation, and conflict handling.
- Review screenshots and run the relevant regression tests.

## 10. Global search contract

- The `⌘K` / `Ctrl+K` palette searches Mealie's full recipe index, including ingredient text, after a short debounce. Do not limit it to recipes already loaded in the visible page.
- Keep navigation shortcuts in the empty-query state; once a recipe query is present, show live recipe results with a clear match kind, image fallback, result count, and an explicit route to the full results list.
- Detect the host platform for shortcut labels: use `⌘K` on Apple platforms and `Ctrl+K` on Windows/Linux. The keyboard handler accepts the platform's native modifier and keeps the visible shortcut and accessible button label in sync.
- Label a result as a title, ingredient, or combined match only when the loaded Mealie recipe detail confirms that text. Backend fuzzy matches use the neutral “recipe match” label.
- Preserve focus while results update, debounce and discard stale requests, cancel pending work when the palette closes, and keep recipe-opening and full-results actions keyboard accessible.
- Search-result layout, loading, empty, error, focus, motion, and narrow-screen states use shared Atelier tokens and honor reduced motion.

## 11. First-run setup contract

- Getting a first usable kitchen dashboard is the aha moment. Keep the Home Assistant card editor to a skippable, three-step path: connect an existing Mealie Atelier integration, choose the starting view, then pick a visual preset. Save each choice through Home Assistant's `config-changed` event immediately.
- If no integration exists, explain the missing prerequisite and link directly to Home Assistant integrations. Do not ask for a Mealie URL or API token in the card editor; credentials belong only in the secure integration config flow.
- Keep print, kiosk, theme details, and device actions in a clearly optional advanced section. Existing cards reopen with their current selections and can bypass onboarding without losing settings.
- The wizard is a compact native Home Assistant visual-editor surface, not a second application shell. Use the shared editor tokens, accessible progress and focus states, reduced-motion behavior, and a concise preview of the chosen view.
- Do not block the core card behind a tutorial, create a duplicate setup path in the standalone server, or imply that Home Assistant's hosting and security prerequisites have been configured by the card wizard.

## 12. Cooking timer presentation contract

- The cooking timer is a visible part of the cooking cockpit, not a generic form row. Show active countdowns as clear, readable timer cards with a visual progress indicator, meaningful labels, and a reachable stop control.
- Keep timer creation compact and fast with common duration presets, a custom duration, and an optional label. When the label is empty, use a localized kitchen-timer name and include the current recipe step in supporting metadata.
- Put running timers before timer creation so an active countdown takes visual priority. On narrow/mobile layouts, show the current step with its text and photo first, then step navigation, then timer utilities.
- Persisted timers from older versions may lack a start time and duration. Continue displaying their remaining time without inventing progress; new timers carry start time and duration so the ring can show actual elapsed progress.
- Timer motion follows shared motion tokens and reduced-motion preferences. The countdown remains legible and functional when animation is disabled.

## 13. Deliberately open work

The design system prevents new style drift but does not remove every historical layout difference. Incremental legacy-view refactoring remains useful. The ingredient editor, photo upload, the offline write queue and server-side alarms have shipped. Still open: conflict resolution that merges offline edits across devices (the queue is per device), and deleting step photo files in Mealie (it has no endpoint for that).

## 14. Public showcase, recipe data, and discovery contract

- The public demo is an isolated, deterministic fixture application. Recipe edits, checked ingredients, planner changes, timers, and preferences stay in the visitor's browser; the demo never sends mutations to Mealie or Home Assistant.
- Keep exactly ten curated demo recipes in one canonical bilingual DE/EN data source. Each recipe includes measured ingredients, serving yield, preparation and cooking times, categories, dietary labels, complete steps, a stable image URL, photographer credit, and source links. The generator must validate the dataset and reproducibly emit the local preview and a crawlable public demo route with static recipe text and valid Recipe/ItemList structured data.
- Do not claim invented provenance, nutrition, ratings, or user reviews as real. Nutrition is either sourced and cited or clearly presented as an estimate. The demo must label its fixtures and local-only behavior in both languages.
- Unsplash photography must use the standard Unsplash License and show photographer credits. No Unsplash API key belongs in client code or generated output. Replacing a photo must preserve a verifiable source URL and credit.
- The demo search indexes recipe titles, descriptions, ingredient names, categories, and dietary labels in both languages. It supports practical filters such as vegetarian/vegan, time, and servings; parsed search chips remain visible and removable. Highlight matched terms safely and explain whether a match came from a title or ingredient.
- Unit conversion and serving scaling must preserve the original recipe data. Convert only within known unit families using exact factors; volume-to-mass conversion requires a known ingredient-specific density, and ambiguous free-text measures remain unchanged with an explicit note. Locale affects display, never stored quantities.
- Light theme surfaces use neutral stone and porcelain with a high-contrast non-green brand accent. Shared semantic tokens remain the source for card surfaces, shell chrome, controls, dialogs, focus rings, and browser theme color. Editorial photography treatments must also have a light-theme variant; the dark green hero overlay must not bleed into Light mode.
- Generate the publishable demo from the cards package with `npm run build:demo`. `ATELIER_DEMO_BASE_URL` is optional for a local preview and required for production canonical URLs, alternate-language URLs, and sitemap entries. Never commit a demo URL, credentials, or personal Mealie export as a build-time secret/data source.
- Build output includes two localized interactive entry pages and twenty static recipe detail pages. Serve the generated `demo/public-site/` directory unchanged at the selected public path. Keep the deployment path in the base URL; do not publish only the generator output's inner locale folder.
