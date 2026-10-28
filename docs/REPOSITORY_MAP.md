# Repository map and release boundaries

Mealie Atelier uses one GitHub organization and two product repositories. The standalone Web app and static demo share the Cards repository but have independent manual release boundaries. No GitHub Actions, CI workflows, Dependabot version updates, or automated publishing are used.

## Repositories

| Repository                                                                         | What lives there                                                                                                   | Release channel                                                                  |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| [`.github`](https://github.com/mealie-atelier/.github)                             | Organization profile, shared community/security guidance, brand masters and credits                                | Profile and brand assets only                                                    |
| [`mealie-atelier-cards`](https://github.com/mealie-atelier/mealie-atelier-cards)   | HACS dashboard cards at the root, standalone Web app in `web/`, bilingual demo in `demo/`, product docs in `docs/` | Cards, Web, and demo are versioned and released manually as independent products |
| [`mealie-atelier-bridge`](https://github.com/mealie-atelier/mealie-atelier-bridge) | Home Assistant integration under `custom_components/mealie_atelier/`, API proxy, state, and tests                  | Independent, manually prepared HACS integration release                          |

## Boundaries

- The Cards root is the HACS plugin package. Keep root `hacs.json`, the built `dist/mealie-atelier-cards.js`, and `info.md` discoverable at the expected HACS locations.
- The Web app in `web/` is a standalone Node service. It keeps Mealie credentials on its server and works without Home Assistant.
- The demo is generated from fictional bilingual recipes in `demo/data/recipes.json`. It stays static and browser-local; it must never use a household Mealie export or call live Mealie/Home Assistant services.
- The Bridge owns Home Assistant-side credentials and durable integration state. Cards and Web must not contain secrets or depend on Bridge for standalone operation.
- Shared photo assets have origin and rights notes in `brand/CREDITS.md`. Product icon and social-preview masters use the same original pasta-and-tomato photograph and square-edged artwork; export steps are in `brand/README.md`.

## Manual release checks

Before each package release, run its documented build, tests, lint, and format checks locally from a clean checkout. Check package metadata and release contents by hand, then create the release only after the relevant live-service and device gates pass. HACS/Hassfest acceptance and catalog inclusion are separate external checks.

- Cards artifacts contain the HACS JavaScript bundle and its checksum.
- Web releases use an independent version and container artifact.
- Demo/docs deployment is a separate manual operation and waits for confirmed public URLs and host instructions.
- Bridge release tags and HACS publishing are prepared manually.

## Corrections log

- 2026-10-28 — Replaced the previous CI/automation proposal with the owner's explicit repository policy: no GitHub Actions, Dependabot version updates, or automated publication. Actions are disabled across the organization; all checks/releases are run and reviewed manually.
