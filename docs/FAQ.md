# Frequently asked questions

Full guides are on [alles-automatisch.de](https://alles-automatisch.de/lernen/mealie-atelier): [setup](https://alles-automatisch.de/lernen/mealie-atelier-einrichten) and [troubleshooting](https://alles-automatisch.de/lernen/mealie-atelier-fehlerbehebung). You can try everything in the [live demo](https://mealie.alles-automatisch.de) first.

## How do I install the cards?

The cards are listed in the default catalog that both the Home Assistant Marketplace (Home Assistant 2026.11 and newer) and HACS read. Open the Marketplace (**Settings → Marketplace**, tab **Browse**, route `/marketplace/browse`), search for **Mealie Atelier Cards**, open it and choose **Install**. In classic HACS, search for the same name and choose **Download**. New catalog entries take a while to reach every Home Assistant: if the search does not find the cards yet, use **Add from link** in the Marketplace (paste `https://github.com/mealie-atelier/mealie-atelier-cards`; it needs a one-time **Connect GitHub** login with a free GitHub account), or in classic HACS add the repository as a custom repository of type Dashboard. On dashboards managed in the UI the Lovelace resource is registered for you. For a manual install on a UI-managed dashboard, add the resource under **Settings → Dashboards**, three dots → **Resources**; only YAML-mode dashboards need the `lovelace: resources:` block with `/local/community/mealie-atelier-cards/mealie-atelier-cards.js`. Then use **Edit dashboard → Add card**, switch to the **By card** tab and search for **Mealie Atelier**.

## How do I uninstall the cards?

Remove the cards from your dashboards first (leftover cards show "Configuration error"), delete the Bridge entry if you use it (this also deletes its backups and outbox), uninstall the cards in the Marketplace (**Settings → Marketplace**) or HACS or remove the resource and the `www/community/mealie-atelier-cards` folder, then restart Home Assistant.

## Do I need the Bridge integration?

No, but it unlocks more. The cards can read recipes, the meal plan and the shopping lists through Home Assistant's built-in Mealie integration, and you can tick shopping items on and off there. The optional [Mealie Atelier Bridge](https://github.com/mealie-atelier/mealie-atelier-bridge) is needed for all other writes (adding, editing and deleting shopping items, meal plan changes such as adding, moving and removing entries, recipe editing) and for recipe photos. It keeps your Mealie API token on the server side, never in a card.

## Does it work without Home Assistant?

Yes. The standalone web app in `web/` runs on its own, for example in Docker, and works as an installable PWA. See the [web app guide](../web/README.md).

## Does the demo access my Mealie or Home Assistant?

No. The [demo](https://mealie.alles-automatisch.de) uses fictional recipes in the browser. Changes stay in your current browser and are never sent anywhere.

## How does scaling a recipe work?

Use the stepper above the ingredients in a recipe (Servings; Makes or Amount when a recipe has no serving count). The amounts update in the recipe, in cooking mode (including the ingredients under each step), in print and in the voice answer for "how much". "Recipe: ..." shows the original amount and "Back to the recipe amount" returns to it.

Only clear quantities are scaled. Free-text rows such as "salt to taste" stay as written, so check them yourself. The same goes for rows that Mealie has no parsed quantity for: they are added to the shopping list as written.

Adding to the shopping list with the chosen amounts needs Mealie Atelier Bridge 0.13.0 or newer. With an older Bridge the dialog tells you that it adds the recipe amounts instead. The same version is needed to share the amount in a Cook together session.

## Does shopping list sync to Bring! work?

Yes, in two ways. With Home Assistant, the Bridge syncs a Mealie list to a To-do list such as Bring!. The standalone web app syncs to Bring! directly, without Home Assistant: an administrator connects a Bring! account in the app (see [the web app guide](../web/README.md#smart-shopping-sync-to-bring)). Shopping items are sent to Bring! only after that connection and only for lists named in a rule. The safety rules are in the [Smart Shopping Sync specification](https://github.com/mealie-atelier/mealie-atelier-bridge/blob/main/docs/SMART_SHOPPING_SYNC.md).

## What happens to my shopping edits when I am offline?

The cards queue shopping edits on the device and replay them in order when the connection is back. Entries that fail stay visible with a Discard action.

## Is a step photo deleted from Mealie when I remove it in the editor?

No. Mealie has no endpoint to delete a recipe asset. Removing a step photo detaches it from the step and from the recipe's asset list, but the file stays on the Mealie disk. Cover photos are different: removing one deletes it in Mealie, after a backup copy was saved so that the version history can bring it back.

## Where do I ask for help or suggest an improvement?

Use [GitHub Discussions](https://github.com/orgs/mealie-atelier/discussions) for setup questions and ideas. Open an issue for a reproducible bug. Never post API tokens, private recipe data or sensitive logs publicly; use the private process in [SECURITY.md](../.github/SECURITY.md) for security reports.
