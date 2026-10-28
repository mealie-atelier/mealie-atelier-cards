# Home Assistant setup — 0.9.5 preview

This guide keeps setup in Home Assistant's UI. You do not need YAML for the recommended path. This is a developer preview: the repositories are public, but no stable release or catalog listing is available yet, and a live HA acceptance run is still required. Back up Home Assistant and Mealie before installing preview software.

## Choose your setup

| You want… | Install | What works |
|---|---|---|
| Recipe search, details, and cooking steps with the fewest moving parts | Home Assistant's built-in **Mealie** integration + Atelier Cards | Read-only recipe browsing and cooking. No Atelier Bridge or extra Mealie token is needed in the card. |
| The complete kitchen studio | **Mealie Atelier Bridge** + Atelier Cards | Recipe photos and the Atelier planning, shopping, kitchen, and recipe tools, subject to Mealie permissions and the enabled options. |

The card wizard detects a single existing Mealie connection and selects it for you. It never needs a Mealie password or API token in a dashboard card.

## Before you start

For the full Bridge path, have these two details ready:

1. **Mealie address from Home Assistant's point of view.** Use the server's reachable base address, for example `http://192.168.1.20:9000`. If you run the Mealie Home Assistant app, use its direct address and port `9090`. Do not use a Home Assistant ingress URL, a `/login` page, or an address that only your browser can resolve.
2. **A Mealie API token.** In Mealie, open your profile → **Manage Your API Tokens**, create a token for Home Assistant, and copy it. Use a dedicated Mealie account with only the permissions this household needs. Paste the token only into the Bridge setup form.

## Recommended path: full studio, no YAML

When the official listing is available, use **Settings → Marketplace** on supported Home Assistant versions or HACS on older versions. Install **Mealie Atelier Bridge** under Integrations and **Mealie Atelier Cards** under Dashboard. The Marketplace/HACS UI manages the card resource for UI-managed dashboards; after installation, reload the browser when Home Assistant asks.

The source repositories exist, but stable releases and catalog listings are still pending. Use the temporary developer-preview steps below until those release gates pass.

### Install the preview Bridge

1. Clone or download the [Bridge repository](https://github.com/mealie-atelier/mealie-atelier-bridge), then copy its `custom_components/mealie_atelier/` folder into `<HA config>/custom_components/mealie_atelier`.
2. Restart Home Assistant.
3. Open **Settings → Devices & services → Add integration**, search for **Mealie Atelier Bridge**, and add it.
4. Enter the Mealie address and API token. Leave **Verify TLS certificate** enabled unless you deliberately use a self-signed certificate on a trusted local network. The flow checks the connection before it saves.

### Install the preview card bundle

1. Copy `dist/mealie-atelier-cards.js` into `<HA config>/www/mealie-atelier-cards.js`.
2. For the standard UI-managed resources, open **Settings → Dashboards → ⋮ → Resources → Add resource**. Add `/local/mealie-atelier-cards.js` and choose **JavaScript module**.
3. If your dashboards manage Lovelace resources in YAML, add the resource using your existing YAML setup instead. Do not create a second `lovelace:` section. This is the advanced path; back up the dashboard configuration first.
4. Reload Home Assistant's browser tab.

### Add your first kitchen card

1. Open a dashboard, select **Edit dashboard → Add card**, and search for **Mealie Atelier**.
2. Pick **Complete Kitchen** for the whole studio, or choose a focused card such as Recipes, Today, Meal Plan, or Shopping.
3. In the visual editor, follow the three short steps: confirm the detected connection, choose the opening view, and pick the appearance. The wizard is skippable and every choice can be changed later.
4. Save. Your recipes should appear without entering YAML. Keep write-enabled cards on dashboards shared only with trusted Home Assistant users.

## Fewest-moving-parts path: built-in Mealie

1. In **Settings → Devices & services → Add integration**, add Home Assistant's built-in **Mealie** integration and follow its connection form.
2. Install Atelier Cards, then add a Mealie Atelier card from the dashboard card picker.
3. The visual editor detects the native Mealie integration and selects its read-only provider automatically.

This path is intentionally limited: recipe search, recipe details, and cooking steps work without the Atelier Bridge. Bridge-only photos, shopping/planning writes, recipe management, and other server-backed kitchen tools are not available. See the [feature matrix](FEATURE_MATRIX_0.9.5.md).

## If something does not connect

| What you see | Check this first |
|---|---|
| Connection refused or timed out | Open the same Mealie base address from the Home Assistant host/network. Container service names only work when both services share that network. |
| Authentication failed | Create a fresh Mealie API token and paste it into the Bridge flow. Never place it in card YAML or screenshots. |
| Not found / HTML login page | Replace the ingress, login, or deep link with the direct Mealie base URL and port. |
| Certificate error | Use a valid trusted certificate. Only disable certificate verification for a self-signed certificate on a trusted local network. |
| Card type not found | Confirm the JavaScript module resource is loaded. With HACS/Marketplace-managed resources, reload the browser. For manual UI setup, confirm the resource URL and `JavaScript module` type. |
| No recipes in the card | Open the Bridge integration and check its connection status; for the native provider, confirm that Home Assistant's Mealie integration and recipe actions are available. Then reopen the visual editor and retry. |

If the fix is not clear, collect the Home Assistant integration diagnostics and logs, redact tokens and private recipe content, then report the issue. Do not remove a working dashboard or delete the integration as a first troubleshooting step.

## Standalone app

For use without Home Assistant, see [`../web/README.md`](../web/README.md). Use a private network or HTTPS reverse proxy with modern authentication. Never expose the development server directly to the public Internet. Set `ATELIER_READ_ONLY=true` when evaluating without writes.

## Update and rollback

Back up the HA configuration and Mealie database before updating a preview. For a manual card update, replace the JavaScript file and reload the browser; keep the same resource URL. For a Bridge update, replace the integration folder and follow Home Assistant's restart prompt. To roll back, restore the previous backed-up integration folder and card bundle. Removing Atelier does not delete Mealie recipes, but the Bridge also stores local kitchen-session state in Home Assistant storage.

## Official references

- [Home Assistant Mealie integration](https://www.home-assistant.io/integrations/mealie) — supported Mealie versions, API-token creation, URL and TLS guidance.
- [Add an integration in Home Assistant](https://www.home-assistant.io/getting-started/integration/)
- [Home Assistant custom Lovelace resources](https://contributors.home-assistant.io/frontend/custom-ui/resources/)
- [HACS dashboard repositories](https://hacs.dev/docs/use/repositories/type/dashboard/)
- [HACS publishing guide](https://www.hacs.dev/docs/publish/start/)
- [Mealie API usage and local OpenAPI docs](https://mealie.io/documentation/getting-started/api-usage/)
- [Marketplace publication checklist](MARKETPLACE.md)

## Corrections log

- **2026-10-28:** Reorganized the HA setup around the two provider paths, removed the misleading default Mealie URL, added translated field guidance for URL/token/TLS, and made the full preview installation explicitly distinguish Marketplace/HACS from temporary manual steps. Live setup and first-time-user usability still require acceptance testing on a real Home Assistant instance.
