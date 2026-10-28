# Frequently asked questions

## Does Atelier Cards work without Home Assistant?

Yes. The standalone Web app and the fictional-data demo are separate from Home Assistant. Home Assistant Cards and the optional Bridge add integrations for HA users.

## Is the project ready for a stable release?

Not yet. Version 0.9.5 is a developer preview. Local tests and browser simulations pass, but live Mealie/Home Assistant/provider checks and physical-device acceptance are still open. See [Open work](OPEN_TODOS.md) for the current status and [release readiness](RELEASE_READINESS_0.9.5.md) for detailed gates.

## Do I need the Atelier Bridge?

No. The Cards can use Home Assistant's built-in Mealie integration for supported read-only discovery. The optional Bridge provides server-side API access for additional workflows. Follow the [setup guide](INSTALLATION_0.9.5.md) to choose the path that fits your setup.

## Does shopping-list sync to Bring work already?

No. Mealie-to-Home-Assistant To-do/Bring synchronization is planned but not implemented. Its safety rules and validation requirements are in the [Smart Shopping Sync specification](https://github.com/mealie-atelier/mealie-atelier-bridge/blob/main/docs/SMART_SHOPPING_SYNC.md).

## Does the public demo access my Mealie or Home Assistant?

No. The generated demo uses fictional recipes in the browser and does not call a household Mealie or Home Assistant server. Changes are temporary to the current browser session.

## Is a step photo deleted from Mealie when I remove it in the editor?

No. Mealie 3.29 has no endpoint to delete a recipe asset. Removing a step photo detaches it from the step and from the recipe's asset list, but the file stays on the Mealie disk. Mealie Atelier never claims it was deleted. Cover photos are different: removing one deletes it in Mealie, after a backup copy was saved so that the version history can bring it back.

## Where do I ask for help or suggest an improvement?

Use [GitHub Discussions](https://github.com/orgs/mealie-atelier/discussions) for setup questions and ideas. Open an Issue for a reproducible bug in a published release. Never post API tokens, private recipe data, or sensitive logs publicly; use the private process in [SECURITY.md](../.github/SECURITY.md) for security reports.

## Corrections log

- 2026-10-28 — Added a concise repository FAQ and linked it to the current preview status, setup guidance, shopping-sync scope, demo privacy, and support channels.
