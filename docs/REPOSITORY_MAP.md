# Repository map and release boundaries

Mealie Atelier uses one GitHub organization and two product repositories. The standalone Web app and static demo share the Cards repository but have independent release boundaries. The only GitHub workflow is the HACS validation that the Marketplace catalog asks for; tests and linting run locally through `.githooks/`.

## Repositories

| Repository                                                                         | What lives there                                                                                                   | Release channel                                                         |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| [`.github`](https://github.com/mealie-atelier/.github)                             | Organization profile, shared community/security guidance, brand masters and credits                                | Profile and brand assets only                                           |
| [`mealie-atelier-cards`](https://github.com/mealie-atelier/mealie-atelier-cards)   | HACS dashboard cards at the root, standalone Web app in `web/`, bilingual demo in `demo/`, product docs in `docs/` | Cards, Web, and demo are versioned and released as independent products |
| [`mealie-atelier-bridge`](https://github.com/mealie-atelier/mealie-atelier-bridge) | Home Assistant integration under `custom_components/mealie_atelier/`, API proxy, state, and tests                  | Independent, manually prepared HACS integration release                 |

## Boundaries

- The Cards root is the HACS plugin package. Keep root `hacs.json` and the built `dist/mealie-atelier-cards.js` discoverable at the expected HACS locations.
- The Web app in `web/` is a standalone Node service. It keeps Mealie credentials on its server and works without Home Assistant.
- The demo is generated from fictional bilingual recipes in `demo/data/recipes.json`. It stays static and browser-local; it must never use a household Mealie export or call live Mealie/Home Assistant services.
- The Bridge owns Home Assistant-side credentials and durable integration state. Cards and Web must not contain secrets or depend on Bridge for standalone operation.
- Product icon and social-preview artwork use the Week Dial mark; the masters live in the `mealie-atelier/.github` repository and export steps are in `brand/README.md`.

## Release checks

Before each package release, run its documented build, tests, lint and format checks locally from a clean checkout and check the package contents. Distribution details are in [MARKETPLACE.md](MARKETPLACE.md), version history in [CHANGELOG.md](../CHANGELOG.md).

- Cards artifacts contain the HACS JavaScript bundle and its checksum.
- The Web app shares the cards version (a bundle test enforces it) and ships as its own container image.
- Demo deployment is a separate operation. Build it with `npm run build:demo` and set `ATELIER_DEMO_BASE_URL` to the public URL for canonical links and the sitemap.
- Bridge release tags and publishing are prepared in the Bridge repository.

## Product principles

Mealie stays the recipe system of record, and credentials never reach browser code. The standalone experience stays useful without Home Assistant. The official Home Assistant Mealie provider is read-only; the Bridge adds authenticated images and explicit write operations. Privacy, accessibility, responsive behavior and safe failure states are part of the product, and German and English stay equally usable. Recipe suggestions are informational and are not medical or allergen-safety advice. This project is an unofficial companion and is not endorsed by Mealie or Home Assistant.

Support is optional. The in-app Ko-fi link is user-initiated; there are no timed prompts or feature gates.

**License:** MIT.
