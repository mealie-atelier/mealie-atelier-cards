# Mealie Atelier: recipes, cooking mode, and a more useful kitchen

**Developer preview 0.9.5.** Mealie Atelier adds responsive Home Assistant cards and an optional standalone web app to Mealie. This preview has local and mock-backed tests, but it is not a stable release. Live Home Assistant and Mealie acceptance, HACS validation, and physical device checks remain open.

Mealie Atelier is an independent community project. It is not made, endorsed, or supported by Mealie or Home Assistant.

## Choose the setup that fits your home

| Setup                                                  | What you need                                                 | What it provides                                                                                                                                                             |
| ------------------------------------------------------ | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Atelier cards with Home Assistant's Mealie integration | Home Assistant and its built-in Mealie integration            | Read-only recipe search, recipe details, and cooking steps through documented Home Assistant actions. Results are limited to one response; large catalogs may be incomplete. |
| Atelier cards with Atelier Bridge                      | Home Assistant, Mealie, the Bridge integration, and the cards | The full card feature set, authenticated recipe and step photos, and planning, shopping, and other writes according to Mealie permissions and Bridge settings.               |
| Standalone Atelier Web                                 | Mealie and a private Node.js/Docker host                      | The Atelier web experience without Home Assistant. The server proxies Mealie requests and requires app credentials.                                                          |

See the repository's current [installation guide](../../INSTALLATION_0.9.5.md), [feature matrix](../../FEATURE_MATRIX_0.9.5.md), and package READMEs for the exact preview behavior. Do not use historical version guides as current setup instructions.

## Standalone Web and home-screen installation

The standalone app is an optional, self-hosted web app. Serve it over HTTPS on a trusted private network before using a browser's install or “Add to Home Screen” feature. The available browser flow depends on the device: Chromium-based browsers may offer an install action, while iPhone and iPad users generally use Safari's Share menu and choose **Add to Home Screen**. The app does not use the Chromium install prompt on iOS.

A home-screen shortcut opens the same self-hosted web app; it does not create another Mealie account or make private recipe data available offline. The service worker is intentionally conservative and does not cache private API data or recipe photos. Physical iPhone Duo checks, safe-area behavior, and install acceptance have not yet been completed for this preview. See [Apple's web app configuration](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html) and [web.dev's PWA installation guide](https://web.dev/learn/pwa/installation) for platform behavior.

For Docker, the checked-in compose setup binds to localhost by default. Do not expose the app directly to the public internet. To access it from another device, use a trusted private network or a properly configured HTTPS reverse proxy with strong authentication. Back up the persistent Atelier data volume alongside Mealie.

## Before setup: protect your recipes and credentials

1. Back up both Home Assistant and Mealie before enabling any write feature.
2. Use a Mealie account with only the permissions you need. Start in read-only mode while you confirm the connection.
3. Enter the Mealie API token only in the protected Bridge or standalone server configuration. Never put it in card YAML, a URL, browser storage, screenshots, or a support post.
4. Do not place the standalone server directly on the public internet. Basic authentication over plain HTTP is not safe on an untrusted network.
5. Keep optional API keys private. A USDA query sends the chosen ingredient search term to USDA. If you explicitly request an optional AI ingredient suggestion, the ingredient text is sent to the configured AI provider. Those requests are not required for normal recipe browsing.
6. Recommendation and allergy-related hints are informational. They cannot guarantee an ingredient is safe for an allergy or dietary requirement. Check the complete recipe, product packaging, and cross-contamination information yourself.

The standalone web app currently uses one shared Mealie account for all app logins. It does not provide individual family-member accounts. The simplified child-helper view is not an authorization boundary.

## Home Assistant setup

The full [setup guide](../../INSTALLATION_0.9.5.md) walks through both paths without YAML. For read-only recipe search and cooking, use Home Assistant's built-in Mealie integration with Atelier Cards. Add the optional Bridge for authenticated photos, planning, shopping, and the rest of the studio.

1. Back up Home Assistant and Mealie. For the Bridge, have the direct Mealie address reachable from the HA host and a Mealie API token ready.
2. Add **Mealie Atelier Bridge** from **Settings → Devices & services → Add integration**. The UI checks the URL and token before saving them securely.
3. Install the Atelier Cards package. UI-managed HACS/Marketplace resources register the JavaScript module automatically. This unpublished preview archive still needs its temporary manual installation steps from the setup guide.
4. In a dashboard choose **Add card → Mealie Atelier → Complete Kitchen**. The visual editor detects a single existing Mealie connection and guides you through the opening view and appearance.

For recipe search and details without the Atelier Bridge, the official Home Assistant Mealie integration is a read-only fallback. It returns a bounded response and does not provide Atelier's authenticated images or write operations. See the [Home Assistant Mealie integration documentation](https://www.home-assistant.io/integrations/mealie).

## Recipes, photos, timers, and cooking

The Bridge provides authenticated, time-limited image routes for recipe and step photos. The Core Mealie fallback hides image URLs unless they are served by a trusted authenticated proxy. It requests up to 500 matches in one response and does not fetch every subsequent service page, so a larger collection can be incomplete.

Bridge and standalone providers store shared cooking-session alarms server-side. Notification delivery requires a configured Home Assistant notification service or a working standalone Web Push subscription. Core-provider timers are local to the current browser. Do not treat a browser countdown as an alarm guarantee.

The weekly meal picker currently uses the recipes already loaded for the selected provider. Schema-aware ingredient editing, recipe image upload, per-person standalone logins, and reliable offline access to private recipe data are not available in this preview.

## Troubleshooting

- **No connection:** confirm the Mealie address is reachable from the Home Assistant host or standalone container, then check HTTPS and certificate settings.
- **No or too few recipes:** verify the selected provider, Home Assistant Mealie actions, and the one-response result limit.
- **A card looks unchanged after an update:** refresh the browser cache and increment the Lovelace resource version query string.
- **Recipe photos are missing:** use the Bridge's authenticated image routes or configure a trusted authenticated proxy for the Core provider.
- **A write action is hidden or rejected:** check the selected provider, Mealie permissions, and Bridge read-only setting.
- **A timer did not notify:** a browser-local timer cannot notify after the browser closes. For a shared timer, check Bridge/standalone alarm status and the configured notification channel.

Do not attach API tokens, private recipe exports, private hostnames, household IP addresses, or unredacted logs to issues or screenshots. The repository includes a [release readiness checklist](../../RELEASE_READINESS_0.9.5.md) with the preview's known external test gates.

## Status and support

This is developer preview 0.9.5, not a stable release. Local Cards, Web, Bridge, and demo checks are documented in the repository. HACS/Hassfest CI, live Mealie/Home Assistant acceptance, physical iPhone Duo and printer checks, and production deployment remain open. The current German, English, and neutral Light view/dialog matrices are documented as browser-emulated evidence. The repositories are public, but stable package links will be added only after releases exist.

Made with love by [Daniel](https://alles-automatisch.de/). If the project helps your kitchen, support is optional via [Alles Automatisch](https://alles-automatisch.de/unterstuetzen) or [Ko-fi](https://ko-fi.com/allesautomatisch).
