# Source baseline and repository import

The implementation baseline is `Mealie-Atelier-v0.9.5-polish-2026-10-28.zip`, SHA-256 `d4b6540123635a86af940025b6f51bc92444c3d4a7a2bb978c69ba654b7305c4`. It is a source archive without Git history. The existing GitHub repository histories were retained and the code was imported into them.

## Import mapping

- `mealie-atelier-cards/` became the root of [`mealie-atelier-cards`](https://github.com/mealie-atelier/mealie-atelier-cards), preserving the HACS root contract (`hacs.json`, `dist/mealie-atelier-cards.js`, source, tests and demo).
- `mealie-atelier-web/` became `web/` inside the Cards repository. It has its own Dockerfile, runtime, and tests; it has a separate validation/release boundary, and it does not depend on Home Assistant.
- `mealie-atelier-bridge/` became the root of [`mealie-atelier-bridge`](https://github.com/mealie-atelier/mealie-atelier-bridge), preserving its HACS integration layout under `custom_components/mealie_atelier/`.
- The `.github` repository remains the organization profile, shared security/support guidance and canonical brand-asset source.

The import does not include `.git` directories, environment files, caches, or private Mealie/HA data. Brand assets created after the source archive are documented in `brand/README.md` and `brand/CREDITS.md`.

## Corrections log

- **2026-10-28:** Replaced the earlier planning-only source rule with Daniel's explicit decision to use the checksummed v0.9.5 archive as implementation baseline, while keeping existing public Git history and repository boundaries.
