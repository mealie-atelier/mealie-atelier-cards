# Changelog

All notable changes to Mealie Atelier Cards, the standalone Web app and the demo are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions before 0.10.0 were developer previews.

## [Unreleased]

### Added

- The web app's AI helpers also work with an Anthropic API key (`ANTHROPIC_API_KEY`); `ATELIER_AI_PROVIDER` picks one when both keys are set.

### Fixed

- German copy now matches the Bridge wording: "Backup" instead of "Sicherung", "API-Token", "Home-Assistant-Nutzer" and "Mealie Atelier Bridge".
- Theme auto follows the system colour scheme in the web app, the setup wizard offers Automatic next to the two presets, the Family page title and the provider banner eyebrow are translated, and the recipe print word is normal case.
- The card follows the Home Assistant light or dark mode by default (`theme: auto`); in the light theme the default accent swatch in the Design Studio is shown and named plum, matching the colour you see.
- Design Studio and the editor offer the automatic theme; print documents get a normal-case title (the file name when saving as PDF); the shopping card is called "Einkaufsliste" in the German picker.
- Card picker: one name per view in the picker, navigation and settings (Discover, Meal plan, Family, Manage), neutral parallel descriptions in English and German, and the picker follows a language switch without a reload. Stub configs no longer write an unused `title`.
- German UI: sidebar, menu label, Print Studio and Design Studio headings and the print masthead are translated. Week and shopping prints no longer ask "How was it last time?", the print credit link matches the sheet colours, and the week range uses an en dash.
- The start-view hint now says that only the overview keeps the navigation.
- Shopping: quantity shown once, open items grouped by label with ticked items at the bottom, one print button per view, tidy toolbar on phones; Today items use a checkbox; footer credit link has a 44px touch target; English copy polished.
- Shopping: items with a unit keep their amount ("1 kg Mehl"), unlabelled and ticked items get their own headings, a single toolbar button no longer stretches across the row.
- The week view scrolls to today when the dashboard data arrives or you press the today button, and the plan dialog stays open after removing one of several entries. The German category filter label is plural like the tag label.
- The week plan shows every entry of a day sorted by meal type, labels side, snack, dessert and drink in the UI language, and the plan dialog can plan all seven meal types.
- Tapping a note in the week plan opens the plan dialog for that day, and its remove buttons name the entry and meal type.
- On phones the week strip opens at today and its day cards share one height; the plan dialog no longer jumps when a recipe is picked.
- The recipe picker keeps long names readable, formats times in the UI language, and its German tag filter reads "Schlagwörter" without a pill shape.
- Recipe tiles without a time show a book icon instead of a clock.
- Finished kitchen timers can be removed again, an invalid duration says which values are allowed, one minute reads "1 minute", and the timer keeps running in the card when background delivery is unavailable (for example in the web app without Web Push). Timers of several cards on one dashboard no longer overwrite each other.
- A timer that runs out raises a visible alert with a short beep and vibration where supported.
- Kitchen timers: removed timers no longer come back from another card on the same page, and a finished timer alerts only once. The beep works on iOS Safari (audio is unlocked by the start click) and a late tick of a background tab still alerts. A refused background alarm says in your language that the timer keeps running on this device, an invalid duration keeps what you typed and moves focus to the field, and removing a timer the server no longer knows works.
- URLs in quotes are linked correctly, and links in the cooking step text are clickable.
- A background timer stays visible in its card when another card on the page saves its timers, and the phone layout of the cooking buttons keeps Next full width below Back and Back to recipe.
- Nutrition chips show units consistently (g for protein, carbohydrates, fat, fibre and sugar, mg for sodium).
- Escape and the close button in cooking mode return to the recipe, and a "Back to recipe" button was added.
- The recipe detail shows the category, tags, notes, source link and ingredient group headings, links in the description are clickable, and the nutrition chips read "612 kcal" and include fibre, sugar and sodium.
- Quick actions find views and actions by name again, say "1 result" in the singular, and announce recipe results in the card language.
- Escape in a nested dialog (such as the recipe check) closes only that dialog, not the recipe behind it.
- Failure messages end with proper punctuation, an import failure no longer claims a change was undone and explains unreachable URLs, and a network failure on load (even when only some requests fail) shows the translated offline notice instead of "Failed to fetch" and no longer claims an empty library.
- A missing Bridge or Mealie integration shows one setup state, also with the default provider, with a link to the integrations instead of a useless retry. An empty library gets first-run guidance, and the Manage section no longer shows an admin warning to admins.
- Recipe tiles without a photo clamp the placeholder title, long durations no longer touch the open button and phone titles show three lines.
- Today meal rows share one leading column, mealplan buttons reach 44px on phones, the tablet week scrolls with readable columns (short words are no longer split) and narrow cards keep the toolbar tidy.
- Recipe tiles show the title only once (the placeholder title appears only for tiles without a photo and fits the tile height in every photo ratio), long durations no longer touch the open button and phone titles show three lines.
- Today meal rows share one leading column, mealplan buttons reach 44px on phones, the week strip scrolls with readable columns, fades at the end edge and shows the swipe hint up to 1080px, long meal names avoid splitting short words where the browser supports hyphenation limits, shopping action rows fill evenly, and narrow cards keep the toolbar tidy with an ellipsis for long breadcrumbs.
- Cooking mode keeps timer names whole (two lines, no mid-word breaks), wraps long words and links in step text, and keeps Back and Next pinned at the bottom of the dialog; dialog close buttons stay visible while scrolling. Editor and hint wording is device neutral (no click or tap) and the English editor footer names the Overview mode and the card's Design Studio.
- Copy: the English Today panel reads "On the table today", the empty Kochinspo result says nothing matches (and its buttons sit in one wrapping row), density, motion and photo crop have one name in the editor and the Design Studio, the Bridge is named "Mealie Atelier Bridge" throughout, "Home-Assistant-Nutzer" and "das Token" are used consistently in German, and timer, protected-values and USDA key errors show their own message.
- Copy consistency: US English spelling, one ellipsis style per language, "Bring!" and "pop-ups" spelled one way, matching print guide, quantity hint without ambiguous commas, Discover asks for cookbooks, and clearer German system check and swap suggestion texts.
- German copy uses the du-form throughout, one name per meal type and audit title, "Einträge" instead of "Termine", "Mit KI prüfen", and complete sentences in the catalog note, nutrition lab and placeholders.
- Copy: the English Today panel reads "On the table today", the empty Kochinspo result says nothing matches (and its buttons sit in one wrapping row), density, motion and photo crop have one name in the editor and the Design Studio, the Bridge is named "Mealie Atelier Bridge" throughout, "Home-Assistant-Nutzer" and "das Token" are used consistently in German, and timer and protected-values errors show their own actionable message and the nutrition search empty row tells you what to do (USDA key and rate limit texts are ready for the Bridge error codes).
- Cooking mode shows its extra tools again (read step, voice command, replacement and the optional Kochlicht, lower music and speaker buttons), and shared timers appear in the timer list.
- Cooking mode keeps timer names whole (two lines, no mid-word breaks), wraps long words and links in step text, and keeps Back and Next pinned at the bottom of the dialog (long timer names also show in full as a tooltip); dialog close buttons stay visible and inset while scrolling, including recipe dialogs on short landscape screens. Editor and hint wording is device neutral (no click or tap) and the English editor footer names the Overview mode and the card's Design Studio.
- Recipe tiles show the title only once (the placeholder title appears only for tiles without a photo and scales with the tile width so three lines fit), long durations no longer touch the open button and phone titles show three lines.
- Today meal rows share one leading column, mealplan buttons reach 44px on phones, the week strip scrolls with readable columns, fades at the end edge and shows a scroll hint up to 1080px, long meal names avoid splitting short words where the browser supports hyphenation limits, shopping action rows fill evenly, and narrow cards keep the toolbar tidy with an ellipsis for long breadcrumbs.
- Kochinspo headings and choices use the display and UI fonts again, eyebrows share one uppercase style, accent eyebrows keep readable contrast in the light theme, checked shopping items and disabled primary buttons stay legible, photo index labels get a dark backing, and the error banner button no longer breaks letter by letter.
- Shopping sync: the first-batch send shows the right result icon, the result text no longer repeats "sent", the state line has a separator and a rule no longer repeats its route under an identical title.
- Shopping sync dialog: neutral button and rule name text until a destination is chosen, friendly destination names instead of platform ids, no doubled "Sent" in the result line, a success icon and "just now" for fresh runs, spaced step cards with visually hidden duplicate labels, round radios without layout shift, a regular Cancel button, a distinct review heading and a back arrow that points back.
- Ingredient amounts such as `1/3 TL`, `1 1/2 kg` and `½ l` are read correctly in the recipe check, grocery assistant and nutrition parsing.
- The grocery assistant keeps counting words as units (1 Handvoll Basilikum), merges rows that differ only by a preparation note, rounds piece counts up, files cheese, meat and wine in the right aisle, and its preview hint no longer says "Click".
- The pantry list flows with the page instead of cutting rows in an inner scroller. Dates show no zero padding, add the year when it is not the current one, never wrap, and read the calendar day without a timezone shift. Expired and soon expiring items are marked with text.
- Editing a pantry item shows a Save button and a Cancel button, and the edit survives a re-render.
- The cookbook shows a placeholder for recipes without a photo, and its print preview has a close button and a mobile viewport.
- Cooking mode shows the Studio tools (read step aloud, voice command, ingredient substitute, scene, music, speech) again, and shared timers appear in the timer list.
- The replace-session dialog focuses Cancel first, Cancel now really cancels, and a new "Cook here only" button starts the recipe on this device only. Ending a shared session also focuses Cancel first.
- The cookbook selection heading updates while you tick recipes.
- The system check no longer repeats each status, shows a result heading after a run and spaces the status line.
- The nutrition dialog has a German title, a USDA API key hint that fits the web app, lowercase "servings" and "per 100 g". The AI review reports a missing AI key in your language.
- The shopping sync dialog says "read-only mode" instead of blaming your permissions when the dashboard is read-only.
- Opening a dialog in Home Assistant puts keyboard focus inside it again: Home Assistant renders `ha-card` asynchronously, so the one-shot `focus()` hit content without a layout box and silently did nothing. Focus is retried until it holds, so Esc, Ctrl+K typing and Tab (kept inside the open dialog) work right away, and focus returns to the opener on close.
- Cooking mode keeps focus on the control you used (next, back, timers) after every re-render, so the arrow keys step through repeatedly. When that control is gone or disabled, focus moves to the primary step button (Next or Done), so a repeated Enter neither ends cooking nor starts a timer by accident.
- Ctrl/Cmd+K and "/" also work in Home Assistant while nothing has focus (never while another element has focus, so its own shortcuts stay untouched); Esc, arrows and Tab keep working in an open dialog even if focus fell to the page.
- Cooking mode: "Replace session" in the "Replace the shared cooking session?" dialog opens cooking mode too (the click was replayed after the dialog and no longer hit the button).
- Phone: the active navigation tab is scrolled into view when the view changes (also once more after layout settles), and the tab hover tint applies only on devices that can hover, so no stale highlight stays on a previous tab after a tap.
- Count texts use proper singular and plural in German and English ("1 weitere Idee", "1 Menge unklar", selected recipes, servings, meals, items, failed checks).
- The accent colour swatches in the design settings have a translated colour name as accessible name instead of an English hex value.
- The disabled primary button (for example "Kochbuch als PDF / Druckvorschau") stays readable in the light and dark theme.
- Web app: the footer has a side gutter on phones.
- The Verwalten view no longer repeats the read-only notice that the global banner already shows.
- AI failures show their own message instead of claiming Mealie is unreachable.
- Web app: `icon-maskable-512.png`, which the manifest lists, is served now instead of answering 404. The unused photo `pasta-with-tomatoes.jpg` left the precache list.
- Web app: a reader sees "You are signed in with read access. An administrator can give your account the writer role." instead of the Home Assistant wording.
- Web app: the footer line follows the app language (German or English).
- Web app docs: a reader's shared cooking journal is read only (only personal timers still work), and the sign-in throttle allows 5 free failures and locks out from the 6th.
- Demo recipe catalogue thumbnails load eagerly instead of lazily, so no tile stays empty when the page is captured or printed without scrolling.
- The credit line in the print document (recipe, shopping list, week plan) follows the card language like the card footer does.
- The card credit line ("Made with ♥ by Daniel") and the demo page footer follow the language: "Mit ♥ von Daniel" and "Mit Liebe gemacht von Daniel" in German. Photo credits left the footer; every photo carries its own credit in the recipe catalogue and on its recipe page.
- Demo recipe pages: step titles are h3 under the "Zubereitung" / "Method" h2, and the pages carry og:site_name, Twitter card tags (summary_large_image with title, description and image) and a hreflang x-default pointing to the German page.
- Demo pages declare their dark colour scheme explicitly (meta color-scheme), so a light system setting renders the intended dark page.
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
- A long dish name in the overview week strip ("Hähnchensuppe mit Gemüse") wraps with hyphenation and clamps at three lines instead of overflowing its day button.
- Kochinspo treats "Rahm" compounds (Sauerrahm, Schlagrahm, Kaffeerahm) as dairy, so they are no longer vegan. Plant versions (Kokosrahm, Hafer Rahm, pflanzliche Sahne) still are.
- On phones, "Bearbeiten" in the pantry no longer scrolls the page while the form is on screen.
- The corner style (square, small, large) now shapes recipe tiles, panels, dialogs, day cards, metric tiles and inputs, not only three rules. The default look is unchanged.
- The visual editor names the accent colours (Salbeigrün, Aprikose and so on, in German and English) with a colour swatch beside the select instead of raw hex values.
- The suggested card titles in Home Assistant's card picker follow the Home Assistant language (German or English, English fallback) instead of always being English.
- The visual editor no longer shows the first option when a stored value is not a preset (for example `language: fr`, `columns: 9`, `theme: purple`): the stored value is shown as a selected, labelled extra option and kept on save.
- The data connection select always lists the built-in Home Assistant Mealie option; without a Mealie integration it is disabled with a one-line hint.

### Changed

- New Week Dial icons replace the photo icon: a cream plate with seven day sections, today in paprika. The Cards icon carries a card grid on the plate (`brand/icon.svg` with `icon-192.png`, `icon-512.png` and `icon-1024.png`, also the demo favicon and the GitHub social preview).
- The web app icon carries a browser window on the plate. It is used in the browser tab (`favicon.svg`, `favicon.ico` with 16, 32 and 48 px, `favicon-32.png`), on the iOS home screen, in the installed app (`web/public/icon-192.png`, `icon-512.png`) and as a maskable icon for Android.
- The manifest is named "Mealie Atelier · Kitchen Studio". Its theme and splash colour, the browser theme colour and the window title now match the dark page surface (`#101613`), and the page title no longer uses a dash.
- Timer notifications show a monochrome badge (`badge-96.png`) instead of the full-colour tile, so Android draws a clear glyph in the status bar.
- The overview tiles "Rezepte", "Geplant" and "Offene Artikel" are buttons that open the recipes, the week plan and the shopping list.
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
