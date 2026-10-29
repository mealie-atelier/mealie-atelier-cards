# Distribution

Mealie Atelier Cards is built for the Home Assistant Marketplace (Home Assistant 2026.11 and newer), which is HACS moved into core and reads the `hacs/default` catalog. Both packages are submitted to that catalog; until they are listed, use **Add from link** with the repository URL (this needs the one-time GitHub connection) or add them to HACS as custom repositories. HACS stays supported as a second route and works on older Home Assistant versions. The card bundle installs to `/local/community/mealie-atelier-cards/`, and on UI-managed dashboards the Lovelace resource is registered automatically.

## Packages

1. [`mealie-atelier-cards`](https://github.com/mealie-atelier/mealie-atelier-cards): HACS category `plugin`. The root `hacs.json` and the built `dist/mealie-atelier-cards.js` are what the Marketplace and HACS read.
2. [`mealie-atelier-bridge`](https://github.com/mealie-atelier/mealie-atelier-bridge): HACS category `integration`, installed under `custom_components/mealie_atelier/`. It is optional and is needed for writes and recipe photos.

The standalone Web app (`web/`) and the demo (`demo/`) live in the Cards repository but are not installed through the Marketplace. They work without Home Assistant. The demo runs at [mealie.alles-automatisch.de](https://mealie.alles-automatisch.de).

## Release checklist

- [ ] Run the package checks locally (see [CONTRIBUTING.md](../CONTRIBUTING.md)) and confirm the `Validate` workflow (HACS validation) passes on the release commit.
- [ ] Keep the version in `package.json`, the card `VERSION` and the web app package identical. A bundle test enforces this.
- [ ] Rebuild `dist/` and `web/public/` so both bundles match the source.
- [ ] Add the release to [CHANGELOG.md](../CHANGELOG.md).
- [ ] Create a GitHub release whose tag matches the package version.
- [ ] Run the live rig in the Bridge repository (`tests/live/`) against the supported Home Assistant (stable and beta) and Mealie versions: `smoke.py` and `ui_smoke.py` must pass.
- [ ] Verify a clean install through the Marketplace or HACS and add a card from the card picker.
- [ ] For a first listing, open or update the `hacs/default` pull request with a link to a passing `Validate` run.

## Help and documentation

- [Documentation](https://alles-automatisch.de/lernen/mealie-atelier)
- [Setup](https://alles-automatisch.de/lernen/mealie-atelier-einrichten)
- [Troubleshooting](https://alles-automatisch.de/lernen/mealie-atelier-fehlerbehebung)

## Official references

- [HACS publishing](https://www.hacs.dev/docs/publish/start/)
- [HACS repository inclusion](https://www.hacs.dev/docs/publish/include/)
- [Home Assistant Marketplace contributor guide](https://contributors.home-assistant.io/marketplace/)
