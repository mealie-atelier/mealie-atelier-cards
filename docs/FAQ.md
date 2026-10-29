# Frequently asked questions

Full guides are on [alles-automatisch.de](https://alles-automatisch.de/lernen/mealie-atelier): [setup](https://alles-automatisch.de/lernen/mealie-atelier-einrichten) and [troubleshooting](https://alles-automatisch.de/lernen/mealie-atelier-fehlerbehebung). You can try everything in the [live demo](https://mealie.alles-automatisch.de) first.

## How do I install the cards?

The cards are submitted to the default catalog that both the Home Assistant Marketplace (Home Assistant 2026.11 and newer) and HACS read. Once they are listed, search for **Mealie Atelier Cards** and install them. Until then, add `https://github.com/mealie-atelier/mealie-atelier-cards` as a custom repository of type Dashboard in HACS and install from there. On dashboards managed in the UI the Lovelace resource is registered for you; a YAML-mode dashboard needs the module resource `/local/community/mealie-atelier-cards/mealie-atelier-cards.js`. Then use **Edit dashboard → Add card** and search for **Mealie Atelier**.

## Do I need the Bridge integration?

No, but it unlocks more. The cards can read recipes through Home Assistant's built-in Mealie integration. The optional [Mealie Atelier Bridge](https://github.com/mealie-atelier/mealie-atelier-bridge) is needed for writes (shopping, meal plan, recipe editing) and for recipe photos. It keeps your Mealie API token on the server side, never in a card.

## Does it work without Home Assistant?

Yes. The standalone Web app in `web/` runs on its own, for example in Docker, and works as an installable PWA. See the [Web app guide](../web/README.md).

## Does the demo access my Mealie or Home Assistant?

No. The [demo](https://mealie.alles-automatisch.de) uses fictional recipes in the browser. Changes stay in your current browser and are never sent anywhere.

## Does shopping list sync to Bring! work?

The cards include the interface for Smart Shopping Sync rules, which needs the Bridge and Home Assistant. The standalone app cannot sync. The safety rules are in the [Smart Shopping Sync specification](https://github.com/mealie-atelier/mealie-atelier-bridge/blob/main/docs/SMART_SHOPPING_SYNC.md).

## What happens to my shopping edits when I am offline?

The cards queue shopping edits on the device and replay them in order when the connection is back. Entries that fail stay visible with a Discard action.

## Is a step photo deleted from Mealie when I remove it in the editor?

No. Mealie has no endpoint to delete a recipe asset. Removing a step photo detaches it from the step and from the recipe's asset list, but the file stays on the Mealie disk. Cover photos are different: removing one deletes it in Mealie, after a backup copy was saved so that the version history can bring it back.

## Where do I ask for help or suggest an improvement?

Use [GitHub Discussions](https://github.com/orgs/mealie-atelier/discussions) for setup questions and ideas. Open an Issue for a reproducible bug. Never post API tokens, private recipe data or sensitive logs publicly; use the private process in [SECURITY.md](../.github/SECURITY.md) for security reports.
