# Mealie Atelier

A standalone-first recipe companion for [Mealie](https://mealie.io/) with an optional Home Assistant experience. The Cards repository contains Home Assistant cards, an independently deployable standalone Web app/PWA in `web/`, and a fictional-data demo in `demo/`. The optional server-side Home Assistant integration is maintained in the separate Bridge repository.

> **Status: developer preview 0.9.5.** Local tests and emulated visual evidence are recorded; live Home Assistant/Mealie/Bring, physical-device, HACS, Hassfest, and production-hosting acceptance are still open. Do not describe planned shopping sync as implemented.

## Repositories

- [Atelier Cards, standalone Web app, and demo](https://github.com/mealie-atelier/mealie-atelier-cards)
- [Atelier Bridge integration](https://github.com/mealie-atelier/mealie-atelier-bridge)
- [Organization profile and brand source](https://github.com/mealie-atelier/.github)

## Choose a setup

- **No Home Assistant:** use the [standalone Web app](../web/README.md). Mealie credentials remain server-side.
- **Home Assistant, read-only recipes:** use the official Mealie integration with the Atelier Cards. See the [feature matrix](FEATURE_MATRIX_0.9.5.md).
- **Home Assistant, full Atelier features:** install the [Bridge](https://github.com/mealie-atelier/mealie-atelier-bridge) and [Cards](../README.md), then follow the [guided setup](INSTALLATION_0.9.5.md).

Historical release documents are snapshots; use the current README, setup guide, architecture notes, and release checklist for current behavior.

## Demo

Build the bilingual showcase with `npm run build:demo`, serve `demo/public-site/`, and open `/de/` or `/en/`. It contains ten complete fictional recipes and credited photography. Visitor changes remain local to the browser and the demo never connects to household Mealie or Home Assistant data. Set `ATELIER_DEMO_BASE_URL` only after the production URL is confirmed.

## Development

Requirements: Node.js 22+, Python 3.12+, and the Bridge test tools. From the Cards repository root:

```sh
npm run build
npm test
npm run check
node --test web/test/*.test.mjs
npm run build:demo
```

Run Bridge checks from its independent checkout; see its [`CONTRIBUTING.md`](https://github.com/mealie-atelier/mealie-atelier-bridge/blob/main/CONTRIBUTING.md). Use only fictional data in public issues, screenshots, and fixtures.

## Boundaries

The standalone app and demo work without Home Assistant. The official Home Assistant Mealie provider is read-only and limited by its service response; the Bridge adds authenticated images and explicit write operations. Recipe suggestions are informational and are not medical or allergen-safety advice. This project is an unofficial companion and is not endorsed by Mealie or Home Assistant.

## Support

Support is optional. The in-app Ko-fi link is user-initiated; there are no timed prompts or feature gates.

**License:** MIT. See the repository license and package notices.
