# Repository map and release boundaries

Mealie Atelier uses one GitHub organization and two product repositories. The standalone Web app and static demo share the Cards repository but have independent build and publication workflows.

## Repositories

| Repository | What lives there | Release channel |
|---|---|---|
| [`.github`](https://github.com/mealie-atelier/.github) | Organization profile, shared community/security guidance, brand masters and credits | Profile and brand assets only |
| [`mealie-atelier-cards`](https://github.com/mealie-atelier/mealie-atelier-cards) | HACS dashboard cards at the root, standalone Web app in `web/`, bilingual demo in `demo/`, product docs in `docs/` | Cards HACS release, Web container release, and demo/docs deployment are separate workflows |
| [`mealie-atelier-bridge`](https://github.com/mealie-atelier/mealie-atelier-bridge) | Home Assistant integration under `custom_components/mealie_atelier/`, API proxy, state, and optional integration-owned workflows | Independent HACS integration release |

## Boundaries

- The Cards root is the HACS plugin package. Its repository must keep root `hacs.json`, the built `dist/mealie-atelier-cards.js`, and `info.md` discoverable at the expected HACS locations.
- The Web app in `web/` is a standalone Node service. It keeps Mealie credentials on its server and must work without Home Assistant.
- The demo is generated from fictional bilingual recipes in `demo/data/recipes.json`. It stays static and browser-local; it must never use a household Mealie export or call the live Mealie/HA services.
- The Bridge owns Home Assistant-side credentials and durable integration state. Cards and Web must not contain secrets or depend on Bridge for their standalone operation.
- Shared photo assets have explicit origin and rights notes in `brand/CREDITS.md`. The pasta-and-tomato icon photo is original artwork generated for Mealie Atelier.

## Change and release checks

Run the Cards build/tests, Web tests, Bridge tests, HACS validation and `hassfest` independently. A successful Cards check does not imply Web or Bridge is ready. Keep a definitive CI status on each pull request; avoid workflow-level path filters that leave required checks pending.

- Cards release artifacts contain only the HACS JavaScript bundle and its checksums.
- Web releases use a separate `web-v*` version and container workflow.
- Demo/docs deployment is independent and waits for confirmed public URLs and host configuration.
- Bridge release tags trigger only the HACS integration release.

## Corrections log

- **2026-10-28:** Replaced the proposed repository layout with the implemented state: Cards is the HACS root and contains the standalone Web and demo; Bridge remains separate; `.github` remains profile/brand only.
