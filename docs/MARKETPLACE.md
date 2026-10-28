# Home Assistant distribution and release playbook

The Cards and Bridge are separate HACS packages with independent source, validation, compatibility notes, and releases. Do not describe either package as Marketplace-listed until it is accepted and visible in the relevant catalog. Home Assistant Marketplace availability and contribution requirements can change; verify the current official documentation before submitting.

## Package boundaries

1. [`mealie-atelier-bridge`](https://github.com/mealie-atelier/mealie-atelier-bridge) — HACS category `integration`; installs under `custom_components/mealie_atelier/`. It provides the optional secure server-side integration.
2. [`mealie-atelier-cards`](https://github.com/mealie-atelier/mealie-atelier-cards) — HACS category `plugin`; installs the dashboard card bundle.

The standalone Web app and fictional-data demo live in the Cards repository under `web/` and `demo/`, but are not installed as HACS packages. They remain independently usable and publishable without Home Assistant.

## Release checklist

- [ ] Run the package's GitHub Actions, HACS validation, and (for Bridge) Hassfest on the exact release commit.
- [ ] Test against the supported Home Assistant and Mealie versions; record real provider behavior and limitations.
- [ ] Review manifest, `hacs.json`, code owners, issue/security links, license, icons, README, and changelog.
- [ ] Create a GitHub release with a version matching the package manifest and include compatibility notes.
- [ ] Submit the repository to the appropriate HACS/default catalog only after the checks and release requirements pass.
- [ ] Test direct installation and the HACS/UI-managed setup in a clean Home Assistant instance.
- [ ] Keep stable package links out of public setup guides until a real release exists.

Current local readiness and open gates are tracked in [`RELEASE_READINESS_0.9.5.md`](RELEASE_READINESS_0.9.5.md). The planned Mealie-to-To-do shopping sync is not implemented; see [Bridge specification](https://github.com/mealie-atelier/mealie-atelier-bridge/blob/main/docs/SMART_SHOPPING_SYNC.md).

## Official references

- [HACS publishing](https://www.hacs.dev/docs/publish/start/)
- [HACS repository inclusion](https://www.hacs.dev/docs/publish/include/)
- [Home Assistant custom integration validation actions](https://github.com/home-assistant/actions)
- [Home Assistant Marketplace contributor guide](https://contributors.home-assistant.io/marketplace/)
