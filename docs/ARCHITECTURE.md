# Architecture and boundaries

## System layout

```
 Mealie (private URL, your own recipes)
       | REST /api/*  [Bearer API token stored server-side]
       +--> Mealie Atelier Bridge (Home Assistant custom component)
       |       | WebSocket: mealie_atelier/* (46 commands in groups)
       |       |   catalog and planning: recipes, recipe, mealplan, shopping, metadata, status, foods, units
       |       |   writes and media: mutate, upload_*, recipe_image_*, step_image_*, recipe_backups, recipe_restore
       |       |   kitchen and nutrition: alarm*, ingredients_*, nutrition_*, food_create, unit_create
       |       |   studio and sync: studio_*, sync_*, offline_replay
       |       | HA-signed image routes: /api/mealie_atelier/image/<entry>/<recipe>
       |       |                         /api/mealie_atelier/recipe_asset/...
       |       +--> Ten Lovelace custom cards and graphical card editor
       |
       +--> Mealie Atelier Web (optional self-hosted Node 22 server)
               | password-protected /api/bridge and /api/image/*
               +--> Same custom-card JavaScript in standalone PWA
```

The Bridge integration and Lovelace cards do not depend on the standalone web server. The web companion does not depend on Home Assistant. They are alternative ways to display and manipulate Mealie data.

## Boundaries and security

- Mealie API token must never be written into a Lovelace card config, URL, browser localStorage, or static JS bundle.
- API requests are on the server; the frontend calls Home Assistant's authenticated WebSocket or a password-protected web-server proxy.
- The bridges expose a strict set of known endpoints. They reject arbitrary API paths and unsafe IDs and limit input text lengths.
- Writes for creating/importing/editing recipes are restricted to Home Assistant admins. Shopping and meal planning writes are allowed to authenticated HA users by default. The HA Options Flow can disable **all** write commands per Mealie connection (enforced server-side). Mealie API token permissions are independently enforced by Mealie. The standalone web companion also supports an enforced `ATELIER_READ_ONLY=true` mode; otherwise all authenticated web logins share the same Mealie account.
- HA recipe images are linked through authenticated URLs with HA signed-path expiration. Web companion proxies image data. Never log tokens.
- Docker defaults bind `127.0.0.1`; if using a reverse proxy, terminate HTTPS and add rate limiting and ideally SSO. Web companion uses Basic auth and is not intended for direct public Internet exposure.
- The custom integration's domain is `mealie_atelier`; Home Assistant core's built-in `mealie` integration remains untouched.
- Lovelace cards support two explicit provider tiers. The Atelier Bridge is the full provider (signed recipe/step images, catalog paging, cookbooks, shopping and meal planning, writes, nutrition and kitchen actions). Home Assistant Core's built-in Mealie integration is the optional no-Atelier provider for read-only recipe search/detail via its official response-enabled `mealie.get_recipes` and `mealie.get_recipe` actions. Call them through `hass.callService(..., notifyOnError, returnResponse)`; never call Mealie directly from the browser or ask for its token in card YAML. Core-provider images stay hidden unless served through a trusted authenticated HA proxy. In Core mode, navigation and command-palette destinations are restricted to recipes; Bridge-only actions such as nutrition workflows and AI checks must be omitted, while local-safe cooking, notes, quality checks, and print remain available.
- Provider choice is persisted per card as `provider: auto | atelier | home_assistant`. `auto` prefers the Atelier Bridge and falls back to Core Mealie only for read-only recipe operations; it must never silently downgrade a requested write. The visual editor explains capability differences before choosing, detects available services, offers retry, and allows skipping setup. Core `mealie.get_recipes` responses are nested as `recipes.items` with pagination metadata and `mealie.get_recipe` responses as `recipe`; normalize both documented service envelopes at the provider boundary before shared views. Request a bounded catalog limit large enough for the household's expected catalog, preserve provider result counts/truncation metadata, and paginate the loaded Core results locally so every returned recipe is reachable.
- Home Assistant cards remain installable as a Lovelace JavaScript resource without the optional Mealie Atelier Web companion. The shared bundle has no external runtime dependencies. The standalone web app is an alternative host, not a prerequisite.
- Local appearance overrides are saved in each browser/device's localStorage, not in Mealie. Visual-editor settings are saved by Home Assistant as Lovelace card configuration.
- Support links are optional and user-initiated. The Design Studio may show one compact Ko-fi link; never use timed prompts, blocking dialogs, repeated banners, or donation gating. Repository support is declared through GitHub funding metadata and the READMEs, all pointing to the canonical `allesautomatisch` Ko-fi page.
- Distributed package metadata, card bundle diagnostics, and Bridge status must report the same release version. Update all source version constants before building the shared browser bundle.

## Technical choices

Frontend: Custom Elements + Shadow DOM for styles isolated from Home Assistant; plain JS bundle; no external asset or runtime dependency; HA `getConfigElement` support. Modern browser APIs (`color-mix` etc.) expected.

Localization: Source locale JSON lives under `src/i18n/`; the build discovers language files and bundles them with a shared resolver. English is the canonical fallback. Every locale must have the same keys and all `Intl.PluralRules` categories used by the UI. The card editor stores its language choice in HA configuration, while Design Studio can persist a browser-local override.

HA backend: Config Flow in German/English; aiohttp client via HA's managed shared session; lightweight async WS functions; signed image proxy with size cap. No sensor platform: the official Mealie integration already supplies Home Assistant entities for shopping lists, planned meals and sensors.

Standalone: Node.js 22+ HTTP server with zero npm dependencies and a read-only filesystem container. The same frontend bundle is copied under `public/`; edits to the card JS must be synced to `web/public/mealie-atelier-cards.js` when publishing.

## Source code conventions

- Use English for source file names, identifiers, comments, logs, and developer documentation. User-facing strings belong in locale resources; recipe content and other user-authored data retain their original language.
- Keep modules focused on one boundary: card rendering and event handling, design tokens and styles, stateful Atelier features, server routes, persistence, API clients, or integration platforms. Prefer small named functions over compressed multi-purpose expressions.
- Add comments only when they explain a non-obvious invariant, security boundary, compatibility behavior, or reason for a deliberate tradeoff. Do not narrate the next line of code.
- Format JavaScript, CSS, JSON, and HTML with the shared Prettier configuration. Format Python with Ruff. Generated card bundles are build outputs and must only change through the build script.
- Keep behavior unchanged during formatting and structural refactors. Run package tests and checks after each coherent change; document any intentional behavior change separately.
- Treat `src/i18n/` as the source of truth for interface copy. Do not place new German or English display text in templates, handlers, server responses, or comments.

## Known limits

1. Mealie APIs change between releases. Mutation payloads and media permissions are covered by mock-server tests; verify a new Mealie release on a disposable instance before relying on writes.
2. Recipe transfer to shopping lists uses the current batch endpoint first and falls back to the legacy single-recipe route only when the batch route is unavailable (HTTP 404/405).
3. Recipe edits go through the structured editor with food and unit links. Both the Bridge (recipe backups) and the web app save a JSON snapshot before every recipe write and support restore from the history list. Step photos can be added and replaced; removing one detaches it from Mealie but cannot delete the file, because Mealie has no endpoint for that.
4. Writes are gated per person: the Bridge reports permissions and the standalone app has admin, writer and reader accounts (`ATELIER_USERS`). Read-only mode is enforced on the server.
5. Shopping edits made without a connection go into an on-device queue and are replayed in order. The queue is per device and does not merge edits across devices.
6. Signed photo URLs last two hours. The card reuses the first URL per recipe photo for 90 minutes so refreshes do not reload every image.
7. Basic auth for the optional web app is suitable only behind a trusted HTTPS reverse proxy or on private networks. Set `ATELIER_TRUSTED_PROXIES` so the sign-in throttle sees the real client.
8. The Core Mealie provider is read-only and limited to official search/detail actions. It does not provide signed recipe images, complete catalog pagination, cookbooks, shopping-list mutation, planning writes, recipe administration, nutrition workflows or server-side timer alarms. Those remain Atelier Bridge capabilities unless Core exposes a documented safe equivalent.
9. A rejected or rotated Mealie token is fixed in Home Assistant: the Bridge asks for reauthentication, and the address or token can be changed later with **Reconfigure**.
