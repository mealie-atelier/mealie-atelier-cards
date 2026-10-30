# Changelog

All notable changes to Mealie Atelier Cards, the standalone web app and the demo are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions before 0.10.0 were developer previews.

## [Unreleased]

### Added

- Web app: Smart Shopping Sync to Bring! without Home Assistant. It implements the Bridge sync contract (preview, confirmed first batch, exactly-once delivery, duplicate skip, after-add and watch triggers, move mode, pause, resume, retry and resolve) against Bring! lists, and the existing sync dialog of the cards configures it.
- Web app: an administrator connects the Bring! account in the sync dialog (**Bring!-Konto**). The password is used for one login; only the session tokens and the account's e-mail address (shown masked, in full to administrators so that signing in again needs only the password) are stored in the data directory with file mode 600. `BRING_EMAIL` and `BRING_PASSWORD` stay available for headless setups and are never persisted.

- Product page and docs: a feature block "Bring! ohne Home Assistant" (German and English) with real captures of the connected account from the web app against a fake Bring! server and a fictional account, a rewritten Bring! setup section in `web/README.md` and a capture script (`scripts/capture-bring-showcase.py`).

### Changed

- Home Assistant sync dialog: the run button now reads "Send now" ("Jetzt senden"), the duplicate options say "entries" instead of "items", the rule card shows its status as a facts layout (mode, status, waiting, last run), and a clean run shows no result line (screen readers still announce it).
- Demo site: the shopping texts no longer say that the sync to Bring! needs Home Assistant, and "Bring!" is spelled with its exclamation mark throughout.
- The note that the standalone app never sends shopping data to third parties now reads: shopping items go to Bring! only after an administrator connects an account.

### Fixed

- Web app: the app icons, favicon, touch icon, notification badge and the install dialog mark now show the herb leaf Week Dial like the logo inside the app and the demo site, instead of the old browser window glyph.
- Demo site: the 404 page swaps its header, footer and language switch to the language of the URL below `/en/` or `/de/` and marks it as current. On any other path it stays neutral, German first with English beside it.
- Install docs: the FAQ names where the Marketplace is (**Settings → Marketplace**, route `/marketplace/browse`).
- README screenshots: the recipe dialog shot ends between two rows instead of slicing a step card, and the phone cooking shot shows the tools panel and the timer clear of the Back and Next bar.
- Cooking mode: Enter in the timer fields starts the timer, and Enter in a prompt dialog (such as "Alternative Zutat") confirms it instead of cancelling.
- Cooking mode: a shared timer is shown as a timer card with a running or finished label and a remove button.
- Shared cooking: the family view stops at the recipe's last step and shows "Schritt x von y".
- Recipe search without a match says so (naming the search) instead of reading like an empty library, and the German empty text is "Keine Rezepte gefunden."
- Shopping: a free-text item typed with a leading 1 keeps it.
- Light theme: form and editor errors use the readable error color. The plan dialog's sort field spans the form and its rows are spaced evenly.
- Recipe editor: the English heading reads "Recipe name & description".
- Shared cooking: helper tasks can be removed, and the refusal to remove a person who still has tasks is shown as translated text.
- Pantry: amounts such as 0.25 are accepted and an amount of 0 is refused.
- Forms: a name made of spaces only is refused with a message instead of being ignored silently.
- Shared cooking: the helper mode is called "Helper view" ("Helferansicht") on the toggle, the person tag and the note, and the empty card spaces its "Browse recipes" button from the hint.
- Quick actions (Ctrl+K): the clear button of the search field uses the Atelier color, and "no matching views" no longer shows above matching recipes.
- Web app: switching the language also translates the title, group titles, note and buttons of the Sync & kitchen timers bar at once.
- Timers: a finished timer started on another device says "Timer abgelaufen" instead of "Aktiver Timer", and the in-card finished message ends with "!" like the push and Home Assistant messages.
- Cooking mode: on tall tablets in portrait the photo caption and the footnote stay inside the dialog, only the step column scrolls.
- Shared cooking: the English feature name is "Cook together" in the navigation, the page title and the card picker, matching "Gemeinsam kochen".

## [0.11.0] - 2026-10-30

### Added

- Shopping: edit an item (name, quantity, note), delete it, or clear all ticked items of a list after a confirmation. The offline queue keeps these edits too, and the web app server mirrors them with the same permission rules. The Mealie Atelier Bridge provides the matching actions `shopping_update`, `shopping_delete` and `shopping_clear_checked`. This needs Bridge 0.11 or newer; an older Bridge rejects these actions.
- The web app's AI helpers also work with an Anthropic API key (`ANTHROPIC_API_KEY`); `ATELIER_AI_PROVIDER` picks one when both keys are set.
- Demo site: the German and English landing pages are now a full product page, with hero, facts, food photos, a before/after slider (mouse, touch and keyboard), the live card in its own "try it" section, a week in the kitchen with a scroll stage, features, devices, Home Assistant, the web app without Home Assistant, the optional AI helpers, the recipe directory, open source and both install routes. Scroll reveals, counters, parallax and the slider sweep respect `prefers-reduced-motion`.
- Demo site: new product screenshots from the current recipes at phone, tablet and desktop size, plus Home Assistant and Bridge captures with fictional data only. They ship as WebP with `srcset`, explicit width and height, and lazy loading below the first screen.
- Demo site: the hero shows the product on real devices: a kitchen tablet in cooking mode with the running timer under its step, and a phone with the shopping list in front. On phones only the phone shows, in front of the Week Dial ring.
- Live demo: a fullscreen button. It uses the Fullscreen API where the browser has it and a full viewport overlay elsewhere (iPhone), keeps the card at the full screen height and returns with Escape or the same button.
- Demo site: a designed footer on every page with brand, both routes, guides, GitHub, YouTube, Ko-fi, a language switch and "Mit ♥ gemacht von Daniel" or "Made with ♥ by Daniel". Recipe pages share the header, footer and design language.

### Fixed

- Demo: recipe tags now show in the page language (German "vegetarisch, familienfreundlich, schnell" instead of English ids). The tag names live in `demo/data/recipes.json` (`tagLabels`) and the localized data files carry them, so the recipe view and search show the same words. Tags from Mealie keep showing as stored. Discover keeps its kid-friendly bonus for German family tags ("familienfreundlich").
- Cooking mode: the progress bar and the step counter end a fixed 12 px before the close button at every width (the bar ran under the button at about 1180 px), whatever the dialog padding.
- Phone tab rail: the active tab is scrolled fully into view and the rail starts on a whole tab (scroll snap to tab starts with scroll padding) instead of centring it, so no label is cut at the left edge. The rail also ends on a whole tab. The edge fade only shows on a side that has more tabs. A re-render without a view change (timer, toast, Home Assistant update) keeps the rail where it was instead of clamping it onto a cut tab.
- Cooking mode: starting a timer no longer moves the view. The timer list now sits under the start form (newest first), so the start button keeps its place however many timers run, focus stays on it, and the started timer is announced through a polite live region inside the dialog instead of a toast hidden behind it.
- Shopping sync: the "Add a sync rule" button no longer sits directly on the "Recent runs" card, and the two "When to sync" check rows keep the same 12 px rhythm as the choices above and below them.
- Cooking mode in a shared kitchen session: going back and forward quickly no longer jumps back a step with "Someone else changed this meanwhile". The step is sent one write at a time, always the newest one, and a refresh while a step is still being sent keeps the step on screen. If sending fails, the dialog shows the step the shared session really has.
- Resetting the design in the web app now also switches the page theme, language and motion back, not only the card inside it.
- Recipe editor: after adding or replacing a step photo the thumbnail and its remove and replace buttons show up right away. Mealie gives every step a new id on each write, and the editor now follows the new ids instead of keeping the old ones.
- Web app: restoring a recipe backup after the recipe was renamed now works. Mealie gives a renamed recipe a new slug, and the restore follows the slug it returns instead of the old one.
- Demo site: unknown paths no longer answer 200 with the home page. `npm run build:demo` writes `404.html`, a bilingual page in the site design (noindex, no canonical, not in the sitemap) that Cloudflare Pages serves with status 404.
- Cooking mode no longer flashes or twitches when you step through the recipe. Going to the next or previous step (buttons, arrow keys, swipe, a Home Assistant state update) now patches the open dialog in place instead of rebuilding it: the backdrop stays in the top layer and is never replayed from transparent, so the page behind no longer shines through. The step photo and the progress bar keep their elements (the bar grows to the next step), a running timer keeps its pulse, and only the step lines that changed fade in softly (never the photo, and not at all with reduced motion or motion off). A different step photo is decoded off screen first: its frame stands at full size at once (the old photo stays, or an empty calm slot), the new photo fades in over the old one (instantly with reduced motion), so the timer and the buttons below never jump.
- URLs in the recipe detail step text are links too. The step number is now its own toggle button, so the text is no longer inside a button, and links in recipe text use the brand colour.
- Removing a kitchen timer the server already dispatched or no longer knows now works on every server and language: the card matches the dedicated error codes (`timer_dispatched`, `timer_not_found`) instead of English message text, and a refused cancel names its real reason. The web app reports `timer_not_found` the same way and treats a dispatched timer as already removed.
- On short landscape phones the cooking navigation stays one level row of three buttons with every label on one line.
- The step number in the recipe detail is a round serif badge again (32 px on phones, 35 px elsewhere) although it is a real button now.
- AI review and substitute helpers: "Review with AI" is hidden when no AI key is set, the consent dialog names the configured provider (OpenAI or Anthropic), requests carry the card language, and the missing-key texts use one term ("AI API key"). The web app reports `ai_enabled` and `ai_provider` in its status. The web app's USDA hint points to `USDA_FDC_API_KEY` in the server's `.env` file. Every destructive confirm (remove pantry item, remove member, end or replace a session) focuses Cancel.
- Demo site review fixes: the footer wordmark sits clear of the rule, the favicon and touch icon now come from the same organization family as the page mark (plate with the herb leaf, no more Cards grid), the footer support tiles stack in one column and show up once per page (the landing page keeps them in its closing section only), the legal line keeps its disclaimer in a balanced block, recipe stats form an even grid on small screens, steps carry one number instead of two, English recipe pages use English URLs (`slugEn`), the pumpkin soup cuisine reads "European", the hero eyebrow keeps "Home Assistant" together, commands in the web app terminal no longer break inside tokens, the before/after labels sit above the frame and the frame is cropped inside a photo row, the Home Assistant integration shot has no pending-issue badge and no untranslated sidebar entry, the two README dashboard screens show the Week Dial mark, and the credits pages carry og:image, og:url and twitter tags.
- The product page and the live demo are dark only (Night scheme, as in the design draft); the light system scheme no longer switches them.
- Demo site: `npm run build:demo` removes the pages of recipes that left the catalog from a reused output folder, so an old build can no longer leave unstyled recipe pages behind.
- The Week Dial mark in the card sidebar has a light variant: on the light theme the plate is Night (`#14201a`) with a Night rim and a Mint leaf, so it no longer disappears on the light sidebar. The dark theme is unchanged.
- English recipe pages on the demo site now use English slugs (`en/recipes/<English slug>/`). The sitemap lists the new URLs.
- Live demo: the total time on the card includes the rest time (pizza 107 min, focaccia 165 min), matching the recipe pages. The localized demo data exports `restMinutes`.
- Demo site build: without Chromium (or with an empty `demo/.og-cache`) `npm run build:demo` warns and skips the missing Open Graph images instead of failing, and the pages then carry no `og:image` or `twitter:image` tags for them, so no share-image URL 404s; set `ATELIER_DEMO_REQUIRE_OG=1` to make that an error for a release build. The tests that need those images skip with a reason.
- Hero and Today meal photos load eagerly instead of lazily.
- The phone hero scrim is darker (the lower stops go from 0.53 to 0.74 and from 0.11 to 0.5), and the hero eyebrow has a text shadow, so both stay readable on bright photos.
- Pantry shopping assistant quantities no longer wrap onto a second line.
- The modal close button shows a clear focus ring.
- Cooking mode has tablet layouts: landscape tablets (701 to 900 px tall) get tighter gaps and padding, and those 701 to 800 px tall also get a smaller step title, so the timer panel is not cut, and portrait tablets get a 136 px photo band above the step.
- German wording: "Nur-Lese-Modus" replaces "Nur-Lesen-Modus".
- Demo site: the timer notification mockup shows the German text the Bridge really sends ("Mealie Atelier · Küchentimer", "… ist fertig!") on both pages; the English page says that the notification is German for now.
- Demo site: the English install card no longer calls the Cards and the Bridge an add-on, and the English footer lists the German-only guides under one "in German" note instead of a "(DE)" after every link. Footer links keep the external arrow right after the last word.
- Demo site: the live card has its natural height instead of a scroll window inside the page, and it opens on "Today" so it does not repeat the page headline.
- Demo site: each "week in your kitchen" scene shows one large phone (or the tablet for cooking mode) with real content, such as Cook ideas with a suggestion, the shopping assistant and the helper view, instead of small desktop and phone pairs. The device row of the devices section is wider.
- Demo site: dish names on the food photos sit on a stronger scrim, and the fifth fact closes the facts strip as a full-width row on narrow screens.
- Demo photos: the skillet eggs and the pizza are cropped tight on the dish (no drink, no empty table), the skillet eggs recipe no longer lists crispbread, and all product screenshots were captured again with them.
- Cooking mode on laptop-height screens (landscape, 701 to 1000 px tall): Back and Next sit right under the step and stay pinned to the bottom of the step column, the photo column keeps its full height with the recipe title readable, and only the step column scrolls. At 1440 × 900 the buttons were cut off at the dialog edge.
- German copy now matches the Bridge wording: "Backup" instead of "Sicherung", "API-Token", "Home-Assistant-Nutzer" and "Mealie Atelier Bridge".
- Theme auto follows the system colour scheme in the web app, live while it is open (the card and the theme colour of the browser bar included). The setup wizard offers Automatic next to the two presets. The Family page title and the provider banner eyebrow are translated. The recipe print word is normal case.
- The card follows the Home Assistant light or dark mode by default (`theme: auto`).
- Design Studio and the editor offer the automatic theme; print documents get a normal-case title (the file name when saving as PDF); the shopping card is called "Einkaufsliste" in the German picker.
- Card picker: one name per view in the picker, navigation and settings (Discover, Meal plan, Family, Manage), neutral parallel descriptions in English and German, and the picker follows a language switch without a reload. Stub configs no longer write an unused `title`.
- German UI: sidebar, menu label, Print Studio and Design Studio headings and the print masthead are translated. Week and shopping prints no longer ask "How was it last time?" and the print credit link matches the sheet colours. The week range uses an en dash.
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
- Copy consistency: US English spelling, one ellipsis style per language, "Bring!" and "pop-ups" spelled one way, matching print guide, quantity hint without ambiguous commas, Discover asks for cookbooks, and clearer German system check and swap suggestion texts.
- German copy uses the du-form throughout, one name per meal type and audit title, "Einträge" instead of "Termine", "Mit KI prüfen", and complete sentences in the catalog note, nutrition lab and placeholders.
- Copy: the English Today panel reads "On the table today", the empty Kochinspo result says nothing matches (and its buttons sit in one wrapping row), density, motion and photo crop have one name in the editor and the Design Studio, the Bridge is named "Mealie Atelier Bridge" throughout, "Home-Assistant-Nutzer" and "das Token" are used consistently in German, and timer and protected-values errors show their own actionable message and the nutrition search empty row tells you what to do (USDA key and rate limit texts are ready for the Bridge error codes).
- Nutrition save and calculate show the translated message for a Bridge error code (for example protected values), removing a timer treats the Bridge codes for a dispatched or unknown timer as already removed, and the timer ownership error says "remove" like the card's action.
- Cooking mode keeps timer names whole (two lines, no mid-word breaks), wraps long words and links in step text, and keeps Back and Next pinned at the bottom of the dialog (long timer names also show in full as a tooltip); dialog close buttons stay visible and inset while scrolling, including recipe dialogs on short landscape screens. Editor and hint wording is device neutral (no click or tap) and the English editor footer names the Overview mode and the card's Design Studio.
- Recipe tiles show the title only once (the placeholder title appears for tiles without a photo, also when a photo fails to load, and it shrinks on narrow cards so three lines fit), long durations no longer touch the open button and phone titles show three lines.
- Today meal rows share one leading column, mealplan buttons reach 44px on phones, the week strip scrolls with readable columns, fades at the end edge and shows a scroll hint up to 1080px, long meal names avoid splitting short words where the browser supports hyphenation limits, shopping action rows fill evenly, and narrow cards keep the toolbar tidy with an ellipsis for long breadcrumbs.
- Kochinspo headings and choices use the display and UI fonts again, eyebrows share one uppercase style, accent eyebrows keep readable contrast in the light theme, checked shopping items and disabled primary buttons stay legible, photo index labels get a dark backing, and the error banner button no longer breaks letter by letter.
- Visual editor: the card editor writes only the keys you set (type first, no defaults, no private setup flag), keeps the optional section open and keeps keyboard focus after each change (editing a Home Assistant entity field no longer re-renders the form on blur), warns when a scene, media player or TTS entity has the wrong domain (matching the card check exactly, no trimming) and suggests existing entities, names the Mealie connection the same way everywhere, explains that the setup wizard is remembered per browser and uses neutral example entity ids.
- Kochinspo, Pantry and the studio views share the main eyebrow, drop the stray section numbers, show time and servings once on the result card and use singular forms ("1 Person", "1 Portion").
- Kochinspo result photo is height-capped, the unclear-amounts reason names ingredients, the recipe scale note and the shopping print line use singular forms, and the Family and Cookbook studio kickers drop their section numbers.
- Shopping sync: the first-batch send shows the right result icon, the result text no longer repeats "sent", the state line has a separator and a rule no longer repeats its route under an identical title.
- Shopping sync dialog: neutral button and rule name text until a destination is chosen, friendly destination names instead of platform ids, no doubled "Sent" in the result line, a success icon and "just now" for fresh runs, spaced step cards with visually hidden duplicate labels, round radios without layout shift, a regular Cancel button, a distinct review heading and a back arrow that points back.
- Ingredient amounts such as `1/3 TL`, `1 1/2 kg` and `½ l` are read correctly in the recipe check, grocery assistant and nutrition parsing.
- The grocery assistant keeps counting words as units (1 Handvoll Basilikum), merges rows that differ only by a preparation note, rounds piece counts up, files cheese, meat and wine in the right aisle, and its preview hint no longer says "Click".
- The pantry list flows with the page instead of cutting rows in an inner scroller. Dates show no zero padding, add the year when it is not the current one, never wrap, and read the calendar day without a timezone shift. Expired and soon expiring items are marked with text.
- Editing a pantry item shows a Save button and a Cancel button, and the edit survives a re-render.
- The cookbook print preview fits phone and tablet screens instead of scrolling sideways, deleting a pantry row you are editing resets the form, and values typed while editing survive a re-render.
- The grocery assistant files Schwein with the meat and keeps Zuckerschoten, Pfefferminze and Gewürzgurken out of the spice aisle, broths, stocks (Fond) and bouillon cubes go to the pantry, "3 Zehen Knoblauch" and "2 Knoblauchzehen" become one row, and fractions of counting units round up.
- The cookbook shows a placeholder for recipes without a photo, and its print preview has a close button and a mobile viewport.
- Cooking mode shows the Studio tools (read step aloud, voice command, ingredient substitute, scene, music, speech) again, and shared timers appear in the timer list.
- The replace-session dialog focuses Cancel first, Cancel now really cancels, and a new "Cook here only" button starts the recipe on this device only. Ending a shared session also focuses Cancel first.
- The cookbook selection heading updates while you tick recipes.
- The system check no longer repeats each status, shows a result heading after a run and spaces the status line.
- The nutrition dialog has a German title, a USDA API key hint that fits the web app, lowercase "servings" and "per 100 g". The AI review reports a missing AI key in your language.
- The shopping sync dialog says "read-only mode" instead of blaming your permissions when the dashboard is read-only.
- Docs and repository files: Markdown issue templates (required sections are marked, since Markdown cannot enforce them) and a current security policy, README screenshots that sit side by side on GitHub, corrected statements about the built-in Mealie integration, a refreshed design system file tree and architecture diagram (second image route), and a stated Mealie minimum (3.x, tested with v3.29).
- Docs: the manual install describes the UI resource route and the HA 2026.11 Marketplace (Add from link, GitHub login), the card picker needs the By card tab, an Uninstall section was added, the config table lists `kiosk_mode`, and the install and documentation lists wrap on phones.
- Web app: `.env.example` no longer enables read-only mode and the user name `home` by default, drops the removed experimental flag and uses the published Mealie port 9925 in its example; the web README corrects the CSP, VAPID, proxy and contents notes.
- The phone week toolbar buttons now really reach 44px, the install dialog "Later" button keeps its visible text as accessible name, and the iOS install step 1 reads as an action.

- The web app install dialog translates its "Later" button and no longer claims that only Safari can install on iPhone; the install button, week toolbar, Kochinspo choices and credit link reach 44px touch targets.
- The web app manifest and browser theme colour match the shell colours, and the static page text uses no dashes as punctuation.
- The sidebar and print brand lines are localized, the iOS install steps no longer repeat Share, offline conflict counts use proper singular and plural, and the sync status reads "wird synchronisiert".
- Web app: free-text shopping items show exactly as typed (no forced "1 " prefix).
- Web app: a wrong Mealie token reports `mealie_auth` (HTTP 502) instead of a passed-through 401, and the status call reports `connected: false` and an `ai` feature flag.
- Web app: an address that answers with a web page instead of Mealie reports `mealie_not_mealie`; so does a 404 that is not JSON. A Mealie 403 (missing permission) reports `mealie_forbidden`, not a wrong token (recipe editing is the exception and keeps `mealie_auth`, HTTP 502). A JSON 404 reports `mealie_not_found`.
- Timer, AI review, AI substitute and background timer errors now show in the UI language, and "Review with AI" is hidden without an AI key. New `err*` texts cover a missing AI provider, a rejected USDA key, no notification destination, a wrong Mealie address and a forbidden Mealie action.
- Web app: an invalid USDA key reports `usda_key_rejected` instead of a Mealie connection error; read-only, missing AI key and missing notification destination errors carry codes.
- Web app: browsers see a small German or English page for the sign-in prompt and the lockout (with the wait time); API clients still get JSON.
- Web app: a scheme-less `MEALIE_URL`, an invalid `PORT`, `ATELIER_TRUSTED_PROXIES`, `ATELIER_HA_URL`, `ATELIER_ALARM_CHANNEL`, or half-set VAPID or Home Assistant settings now stop the app at startup with a one-line message instead of a stack trace or silent ignore.
- Opening a dialog in Home Assistant puts keyboard focus inside it again: Home Assistant renders `ha-card` asynchronously, so the one-shot `focus()` hit content without a layout box and silently did nothing. Focus is retried until it holds, so Esc, Ctrl+K typing and Tab (kept inside the open dialog) work right away, and focus returns to the opener on close.
- Cooking mode keeps focus on the control you used (next, back, timers) after every re-render, so the arrow keys step through repeatedly. When that control is gone or disabled, focus moves to the primary step button (Next or Done), so a repeated Enter neither ends cooking nor starts a timer by accident.
- Ctrl/Cmd+K and "/" also work in Home Assistant while nothing has focus (never while another element has focus, so its own shortcuts stay untouched); Esc, arrows and Tab keep working in an open dialog even if focus fell to the page.
- Cooking mode: "Replace session" in the "Replace the shared cooking session?" dialog opens cooking mode too (the click was replayed after the dialog and no longer hit the button).
- Phone: the active navigation tab is scrolled into view when the view changes (also once more after layout settles), and the tab hover tint applies only on devices that can hover, so no stale highlight stays on a previous tab after a tap.
- Count texts use proper singular and plural in German and English ("1 weitere Idee", "1 Menge unklar", selected recipes, servings, meals, items, failed checks).
- The accent color swatches in the design settings have a translated color name as accessible name instead of an English hex value.
- The disabled primary button (for example "Kochbuch als PDF / Druckvorschau") stays readable in the light and dark theme.
- Web app: the footer has a side gutter on phones.
- The Verwalten view no longer repeats the read-only notice that the global banner already shows.
- AI failures show their own message instead of claiming Mealie is unreachable.
- Web app: `icon-maskable-512.png`, which the manifest lists, is served now instead of answering 404. The unused photo `pasta-with-tomatoes.jpg` left the precache list.
- Web app: a reader sees "You are signed in with read access. An administrator can give your account the writer role." instead of the Home Assistant wording.
- Web app: the footer line follows the app language (German or English).
- Web app docs: a reader's shared cooking journal is read only (only personal timers still work), and the sign-in throttle allows 5 free failures and locks out from the 6th.
- Demo recipe catalog thumbnails load eagerly instead of lazily, so no tile stays empty when the page is captured or printed without scrolling.
- The credit line in the print document (recipe, shopping list, week plan) follows the card language like the card footer does.
- The card credit line ("Made with ♥ by Daniel") and the demo page footer follow the language: "Mit ♥ von Daniel" and "Mit Liebe gemacht von Daniel" in German. Photo credits left the footer; every photo carries its own credit in the recipe catalog and on its recipe page.
- Demo recipe pages: step titles are h3 under the "Zubereitung" / "Method" h2, and the pages carry og:site_name, Twitter card tags (summary_large_image with title, description and image) and a hreflang x-default pointing to the German page.
- Demo pages declare their dark color scheme explicitly (meta color-scheme), so a light system setting renders the intended dark page.
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
- The visual editor names the accent colors (Salbeigrün, Aprikose and so on, in German and English) with a color swatch beside the select instead of raw hex values.
- The suggested card titles in Home Assistant's card picker follow the Home Assistant language (German or English, English fallback) instead of always being English.
- The visual editor no longer shows the first option when a stored value is not a preset (for example `language: fr`, `columns: 9`, `theme: purple`): the stored value is shown as a selected, labelled extra option and kept on save.
- The data connection select always lists the built-in Home Assistant Mealie option; without a Mealie integration it is disabled with a one-line hint.

### Changed

- Demo site and product page: the Week Dial mark replaces the leaf tile in the header, the footer, the recipe call to action and the sidebar of the live demo card. The pages ship the SVG favicon with an ICO fallback, a 180 px `apple-touch-icon` and the page-surface `theme-color` (also on the redirect page at the site root), all generated from the Week Dial masters. The product screenshots (desktop and tablet app, Home Assistant dashboard, Bridge integration page) show the new mark too.
- The card sidebar identity shows the Week Dial mark instead of the green leaf tile, in Home Assistant and in the web app.
- Photo credits are quiet on the demo site: no more "Photo: X · Unsplash" overlays on the recipe grid, the AI helper photo, the closing photo or the recipe directory. A recipe page shows one small muted caption under its hero photo, and one complete list lives on the new "Bildnachweise" (de) and "Photo credits" (en) pages, linked from every footer.
- Demo photos: eight of the ten photos are new (pancakes, skillet eggs, chicken salad, pumpkin soup, penne with artichokes, wonton soup, coconut curry, lemon focaccia), the gnocchi and pizza photos stay, and every fictional recipe now matches its photo. The shakshuka, Greek salad, chicken soup, lemon pasta, paneer curry, ramen and roasted vegetables gave way to the new dishes, the pizza became ham and mushroom, and the gnocchi and pancake recipes and all alt texts describe exactly what their photos show.
- The light theme uses the Herb green of the brand mark (`#3e6b48`) instead of plum, for the default accent, inks, shadows and photo fallback; the default accent swatch in the Design Studio and the editor is shown and named "herb green" in the light theme, matching the colour you see.
- New Week Dial icons replace the photo icon: a cream plate with seven day sections, today in paprika. The Cards icon carries a card grid on the plate (`brand/icon.svg` with `icon-192.png`, `icon-512.png` and `icon-1024.png`, also the GitHub social preview; the demo favicon is the organization Week Dial mark, not this icon).
- The web app icon carries a browser window on the plate. It is used in the browser tab (`favicon.svg`, `favicon.ico` with 16, 32 and 48 px, `favicon-32.png`), on the iOS home screen, in the installed app (`web/public/icon-192.png`, `icon-512.png`) and as a maskable icon for Android.
- The manifest is named "Mealie Atelier · Dein Küchenstudio" (language `de`, like the page). Its theme and splash colour, the browser theme colour and the window title now match the dark page surface (`#101613`), and the page title no longer uses a dash.
- Timer notifications show a monochrome badge (`badge-96.png`) instead of the full-colour tile, so Android draws a clear glyph in the status bar.
- The overview tiles "Rezepte", "Geplant" and "Offene Artikel" are buttons that open the recipes, the week plan and the shopping list.
- A card that fills a panel view in Home Assistant drops its frame and runs edge to edge.
- Recipe photos appear in the week grid, in today's plan and in the cookbook list.
- Demo: the meal plan fills the whole current and next week from Monday, so the week view never opens on empty days.
- Exclusive design settings (theme, density, motion, photo crop, corners) are a typographic choice with an accent underline instead of a row of filled buttons; the print section is titled "Druckstudio" / "Print studio".
- Kochinspo choices (diet, cookbooks, time, pantry, ingredients to avoid) are a typographic register with an accent underline instead of rows of rounded chips.
- The search launcher in the toolbar has the same shape as the refresh and settings buttons, the active tab on phones has a straight accent line, and the daily shortcuts keep their labels on one line.
- Demo: dark theme with the green accent by default, the page chrome uses the same palette, the language switch is a typographic register, recipe pages show "Vorbereitung" and "Kochen" in German and leave out zero times, and every external link opens in a new tab.
- The web app's container health check no longer sends `ATELIER_USERNAME` and `ATELIER_PASSWORD`. It calls the new unauthenticated `/healthz` endpoint, which replies only `{"ok": true|false}` and probes Mealie (cached for 60 s when healthy, 10 s when not). The container is now unhealthy when Mealie is down or rejects the token; before, a 401 from `/api/health` counted as healthy.

## [0.10.0] - 2026-10-29

First release prepared for the Home Assistant Marketplace (HA 2026.11), with HACS as the second install route.

### Added

- Offline queue in the cards for shopping edits. Ticks made without a connection are kept on the device and replayed in order when the connection is back. Failed entries show a Discard action, and the bar offers to send them again. The standalone web command was renamed to `offline_replay`.
- Per-user write grants. The cards read the Bridge permissions and hide write and admin actions a person cannot use, with a clear notice when a write grant is missing and a localized message for every error code.
- Accounts in the standalone app through `ATELIER_USERS` (`username:role:scrypt-hash`, roles admin, writer, reader). The shared password keeps working as admin. `npm run hash-password` creates hashes.
- Structured recipe editor with food and unit comboboxes, a review step with scaled preview and a history list with restore. Cover and step photos can be uploaded through bounded, checksummed upload sessions. The web app saves a JSON snapshot before every recipe write.
- Searchable, paginated recipe picker in the meal plan dialog (debounced search, 20 per page, keyboard navigation, category, tag, favorites and sort filters). The web app accepts the same filters.
- Smart Shopping Sync interface in the Shopping view: a status dialog per rule and a seven step setup with a preview of the first batch that is only sent after explicit confirmation. The standalone app reports that sync is not supported.
- Marketplace readiness: HACS validation workflow, package metadata, `hacs.json` and a pinned Prettier setup with a local pre-commit gate.
- Cook mode keeps the screen awake while you cook.
- Opt-in `ATELIER_TRUSTED_PROXIES` so the sign-in throttle sees the real client behind a reverse proxy.

### Fixed

- Security: timers in the standalone app now belong to the person who created them. Listing shows only your own timers and cancelling needs the owner or an admin, also when a shared cooking session is ended (admins see all; timers stored without an owner are admin only). The timer limit counts only active timers, with at most 20 per account.
- Security: `journal_set` now needs the write level in the standalone app, because the journal is one shared object that a reader could overwrite. The app reports `features.shared_journal`, so the cards hide journal actions from readers there.
- Sign-in throttle behind a reverse proxy: the server logs a one-time warning when a private address sends `X-Forwarded-For` while `ATELIER_TRUSTED_PROXIES` is empty, because all users would then share one throttle counter.
- Recipe and cook dialogs open above the Home Assistant sidebar instead of being partly covered by it.
- Re-rendering an open dialog no longer moves focus into its first field.
- The cooking mode swipe hint and the new-list dialog heading are translated instead of always German.
- Optimistic rollbacks undo only their own change, so a write that succeeded in between is no longer wiped. A failed write reloads the collection, and pending rows are disabled while saving.
- A queued entry the user took back is never replayed, and a failed tick holds back later ticks on the same item so their order holds.
- Losing the write grant clears the offline queue instead of replaying it.
- Behind a reverse proxy, one attacker no longer locks out every user.

### Changed

- Demo photos are self-hosted as WebP files in `demo/photos` instead of being loaded from an external CDN. Photographer credits are kept, and absolute `og:image` and JSON-LD URLs are emitted when a base URL is set.
- The card keeps the first signed photo URL per recipe photo for 90 minutes, so refreshes no longer reload every image. A new photo gets a new URL.
- Recipe edits in the standalone app are attributed to the signed-in person.
- The demo build fails on a missing template anchor and pins the language of each page.
- Hardened the web app image, response headers and sign-in handling. Sign-in lockouts are now at most 60 seconds, and IPv6 clients are keyed by /64.
- Hardcoded interface text was moved into the German and English locale files, and failed actions now show a message.
- The plain-text ingredient path is replaced by the structured editor. The commands `ingredient_preview`, `ingredient_save`, `ingredient_catalog` and the route `/api/recipe-image/*` stay as deprecated aliases during 0.10.x.

## Developer previews (0.2.0 to 0.9.5)

These versions were never tagged or dated, so they are kept as plain headings below.

### 0.9.5

#### Added

- Read-only provider for Home Assistant's built-in Mealie integration. Recipe search, details and cooking steps work without the Bridge and without a Mealie token in the card.
- Guided card setup that detects a single Mealie connection, plus a provider choice per card (`auto`, `atelier`, `home_assistant`).
- Server-managed shared-session alarms with Home Assistant notifications (Bridge) or optional Web Push (standalone app).
- Bilingual static demo built from ten fictional recipes, with 20 recipe pages for search engines.
- Standalone install path with platform-aware browser guidance, Apple touch and maskable icons.
- Neutral Light and Dark themes.

#### Changed

- The standalone app and demo moved into the Cards repository (`web/` and `demo/`). The Bridge integration lives in its own repository.
- Catalog paging, signed recipe and step photos, cookbooks, shopping and planning stay Bridge features. The Core provider requests up to 500 matches and pages them locally in sets of 24.

### 0.9.3

#### Changed

- Legacy stylesheets were merged into the design system modules. Views, dialogs, nutrition and journal displays, print renderers and the card editor moved into `src/components/`. The migration produced no visual change in a pixel comparison of ten views at four sizes.
- The build assembles one deterministic bundle for `dist/` and `web/public/`.

#### Added

- HTTP level contract tests for the ingredient workflow, photo upload, write limits and the Home Assistant handlers.

### 0.9.2

#### Added

- Central polish stylesheet with consistent spacing, typography, surfaces and contrast.
- Self-contained offline demo with eight embedded sample photos.

#### Changed

- Panels and grids follow the card width, not only the window width. Narrow card columns and tablet widths get proper layouts.
- Icon-only buttons have accessible names and 44 × 44 px targets. Dialogs and views carry localized ARIA labels.
- Buttons without an explicit type no longer submit forms by accident. Recipe search uses `type="search"`.

#### Fixed

- Mobile overflow in the dashboard and in Manage caused by the recipe gallery rail.

### 0.9.1

#### Added

- Shared control system for checkboxes, radios, checkable lists, selection buttons and forms, with 44 px touch targets, 22 px check marks and hover, focus, checked, disabled and validation states.
- The card editor has consistent controls and four clear categories.

#### Fixed

- The cookbook recipe picker updates its counter and PDF action.
- Shopping and family checkboxes have the correct role and an accessible name.
- Accent, theme, motion and print template choices report their state with `aria-pressed`.

### 0.9.0

#### Added

- Modular design system with semantic tokens, layout primitives and shared card, form and button states.
- Reproducible build of the Home Assistant bundle and the standalone bundle.
- Unit tests for structured ingredient merging, version conflicts, file signatures and upload sizes.

#### Changed

- The width of the Home Assistant card, not the window, drives responsive grids. Mobile week cards use wider scroll-snap cards.

#### Fixed

- Studio main view no longer squeezes into two narrow panels between 900 and 1180 px.
- HTML in recipe titles is escaped.

### 0.8.0

#### Added

- Connection check in Manage (read-only checks for the Bridge, recipes, shopping lists, meal plan and Atelier storage).
- JSON export of Atelier household data (pantry, ratings, shared sessions).

#### Changed

- Pantry and ingredient matching uses structured quantities, normalizes g/kg and ml/l, flags unclear units, counts a pantry item only once and ignores expired items. Servings scale up and down.
- Delete, session change, AI consent, quality check and shopping actions use styled dialogs instead of browser prompts.
- The cookbook cover prints on white paper with dark green text, even with background graphics disabled.

#### Fixed

- A new shared cooking session no longer replaces a running one without consent, and family members with open tasks cannot be removed silently.

### 0.7.0

#### Added

- Quick access with Ctrl/Cmd + K (or `/`). In Home Assistant it only reacts while the card has focus.
- Motion levels Lively, Subtle and Off per device, honoring the system reduced motion setting.
- Swipeable main navigation on small screens, swipe and arrow key navigation in the cooking cockpit.

#### Changed

- Shared motion language: page transitions, card depth, dialog opening, success feedback and loading states.
- Stronger keyboard focus rings, focus returns after a dialog closes, larger touch targets.

### 0.6.0

#### Added

- Cookbook studio with cover, table of contents and several recipe pages.
- Recommendations by time budget, pantry, expiry, taste, favorites and cooking history.
- Seven day meal plan with a preview that keeps existing entries, leftovers and ingredient overlap.
- Pantry with quantities, expiry dates and a shopping list built from planned meals.
- Recipe memory with rating, favorite and personal notes.
- Shared cooking sessions with progress sync, shared timers, family members and helper tasks.
- Quality check and substitution suggestions on request.
- Cooking cockpit with timers, browser text to speech and voice input, and optional Home Assistant scene, volume and TTS actions.
- Wall tablet kiosk layout and a graphical Lovelace editor.

### 0.5.0

#### Added

- Nutrition: USDA FoodData Central search and per-ingredient totals in the Bridge and the standalone app. Eight tracked nutrients with coverage checks. Optional AI search term suggestions. Nothing is saved to Mealie without confirmation.
- Multiple on-device cooking timers and a personal recipe journal.
- Optional nutrition values in the Print Studio.

### 0.4.0

#### Added

- Photo-first desktop gallery and mobile swipe gallery with a full-image recipe detail view.
- Two-panel cooking mode with large steps and a progress line.
- Photo crop choice (portrait, square or wide) in the Design Studio and the card editor.
- Standalone HTML showroom with simulated data.

#### Changed

- UI write permissions default to off until the backend confirms them.

### 0.3.0

#### Added

- Print Studio with A4 documents for recipe, shopping list and meal plan (landscape), editorial, compact and economical presets, and Save as PDF.
- Guided forms for creating, importing and editing recipes, shopping lists and the week plan.
- German and English card interface.

### 0.2.0

#### Added

- Today card as the sixth card type.
- Creating shopping lists and adding recipe ingredients to a list.
- Extended recipe editor with name, description, servings and steps.
- Read-only mode (Home Assistant option or `ATELIER_READ_ONLY=true`), enforced on the server.

#### Fixed

- Meal plan API parameters (`start_date`, `end_date`).

[Unreleased]: https://github.com/mealie-atelier/mealie-atelier-cards/compare/v0.11.0...HEAD
[0.11.0]: https://github.com/mealie-atelier/mealie-atelier-cards/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/mealie-atelier/mealie-atelier-cards/releases/tag/v0.10.0
