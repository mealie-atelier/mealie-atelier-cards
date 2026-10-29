<p align="center"><img width="112" alt="Mealie Atelier Cards icon: a cream plate with seven day sections and a card grid" src="https://raw.githubusercontent.com/mealie-atelier/mealie-atelier-cards/main/brand/icon-512.png"></p>

<h1 align="center">Mealie Atelier Cards</h1>

<p align="center"><strong>Your Mealie kitchen, beautifully at home in Home Assistant.</strong><br>Recipes, meal plans, shopping lists and a calm step-by-step cooking mode as dashboard cards, in light and dark, on the wall tablet and on the phone.</p>

<p align="center">
<a href="https://github.com/mealie-atelier/mealie-atelier-cards/releases"><img alt="Latest release" src="https://img.shields.io/github/v/release/mealie-atelier/mealie-atelier-cards?style=flat-square&color=75465d"></a>
<a href="https://github.com/mealie-atelier/mealie-atelier-cards/actions/workflows/validate.yml"><img alt="Validate" src="https://img.shields.io/github/actions/workflow/status/mealie-atelier/mealie-atelier-cards/validate.yml?branch=main&style=flat-square&label=validate"></a>
<a href="https://hacs.xyz"><img alt="HACS Dashboard" src="https://img.shields.io/badge/HACS-Dashboard-41BDF5?style=flat-square"></a>
<img alt="Home Assistant 2026.10 or newer" src="https://img.shields.io/badge/Home%20Assistant-2026.10%2B-41BDF5?style=flat-square">
<a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/github/license/mealie-atelier/mealie-atelier-cards?style=flat-square"></a>
</p>

<p align="center">
<a href="https://mealie.alles-automatisch.de"><strong>Try the live demo</strong></a> ·
<a href="https://alles-automatisch.de/lernen/mealie-atelier">Documentation</a> ·
<a href="https://github.com/mealie-atelier/mealie-atelier-bridge">Mealie Atelier Bridge</a> ·
<a href="https://github.com/orgs/mealie-atelier/discussions">Discussions</a>
</p>

<p align="center"><img width="900" alt="Mealie Atelier kitchen overview in a Home Assistant dashboard, light theme" src="https://raw.githubusercontent.com/mealie-atelier/mealie-atelier-cards/main/assets/screens/dashboard-light.webp"></p>

<p align="center"><sub><a href="#why-mealie-atelier">Why</a> · <a href="#screenshots">Screenshots</a> · <a href="#install">Install</a> · <a href="#card-types">Card types</a> · <a href="#configuration-reference">Configuration</a> · <a href="#features-in-detail">Features</a> · <a href="#standalone-web-app-and-demo">Standalone app</a> · <a href="#documentation">Docs</a> · <a href="#support-the-project">Support</a></sub></p>

## Why Mealie Atelier

[Mealie](https://mealie.io) is a wonderful self-hosted recipe manager. Mealie Atelier brings it into the place your household already looks every day: the Home Assistant dashboard.

- **Cook without the clutter.** A full-screen cooking mode with one step at a time, kitchen timers, step photos and a screen that stays awake.
- **Plan the week at a glance.** A weekly planner with a searchable recipe picker.
- **Shop together.** Tick items on the phone, even with a weak signal: edits wait on the device and are sent in order when the connection is back.
- **Feels native.** A visual card editor, ten focused card types, German and English, light and dark, compact and comfortable density, your accent color.
- **Safe by design.** Your Mealie token stays on the server, writes respect per-user grants and an optional read-only mode, and every recipe edit is backed up first.

## Screenshots

<p align="center"><img width="400" alt="Recipe collection with photos, dark theme" src="https://raw.githubusercontent.com/mealie-atelier/mealie-atelier-cards/main/assets/screens/recipes-dark.webp"> <img width="400" alt="Recipe details with cooking, nutrition and print actions, light theme" src="https://raw.githubusercontent.com/mealie-atelier/mealie-atelier-cards/main/assets/screens/recipe-light.webp"></p>
<p align="center"><img width="400" alt="Cooking mode with step, timer and photo, dark theme" src="https://raw.githubusercontent.com/mealie-atelier/mealie-atelier-cards/main/assets/screens/cook-dark.webp"> <img width="400" alt="Weekly meal planner, light theme" src="https://raw.githubusercontent.com/mealie-atelier/mealie-atelier-cards/main/assets/screens/mealplan-light.webp"></p>
<p align="center"><img width="400" alt="Shopping list with ticked items, dark theme" src="https://raw.githubusercontent.com/mealie-atelier/mealie-atelier-cards/main/assets/screens/shopping-dark.webp"> <img width="400" alt="Discover questionnaire, light theme" src="https://raw.githubusercontent.com/mealie-atelier/mealie-atelier-cards/main/assets/screens/discover-light.webp"></p>
<p align="center"><img width="820" alt="Four phone screens: overview, recipe, cooking mode and shopping list" src="https://raw.githubusercontent.com/mealie-atelier/mealie-atelier-cards/main/assets/screens/phones.webp"></p>

<sub>All screenshots show fictional sample recipes in a disposable Home Assistant 2026.11 test instance. Photos are credited in the [demo catalog](demo/data/recipes.json).</sub>

## Install

### 1. Install the cards

Mealie Atelier Cards is submitted to the default catalog (`hacs/default`) that the Home Assistant Marketplace and HACS both read. Pick one route:

- **Home Assistant Marketplace** (Home Assistant 2026.11 and newer): open the Marketplace, search for **Mealie Atelier Cards** and download it. Available as soon as the catalog listing is merged. Until then, use **Add from link**, paste `https://github.com/mealie-atelier/mealie-atelier-cards` and complete the one-time **Connect GitHub** login (a free GitHub account is needed).
- **HACS** (classic): add the repository as a custom repository of type **Dashboard**, then download it.
- **Manual**: download `mealie-atelier-cards.js` from the [latest release](https://github.com/mealie-atelier/mealie-atelier-cards/releases/latest) and copy it to the `www/community/mealie-atelier-cards/` folder of your Home Assistant config. Then register it as a resource, either [in the UI](#ui-resource) or [in YAML](#yaml-resource).

The button below opens the add dialog for this repository (it still needs the GitHub connection on Home Assistant 2026.11).

[![Open the repository in HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=mealie-atelier&repository=mealie-atelier-cards&category=plugin)

The Marketplace and HACS install the bundle to `/local/community/mealie-atelier-cards/` and register the dashboard resource for you on UI-managed dashboards. Reload the browser when Home Assistant asks.

### 2. Connect Mealie

You need a Mealie server that Home Assistant can reach: Mealie 3.x (tested with v3.29). Pick one connection:

| Connection                                                                                         | What you get                                                                                                  |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| [Mealie Atelier Bridge](https://github.com/mealie-atelier/mealie-atelier-bridge) (recommended)     | Everything: photos, shopping and meal plan writes, recipe editing, timers, offline shopping, per-user grants. |
| Home Assistant's built-in [Mealie integration](https://www.home-assistant.io/integrations/mealie/) | Read-only recipe browsing and cooking mode through its read actions, no photos or Atelier writes.             |

### 3. Add a card

Open **Edit dashboard → Add card**, switch to the **By card** tab (the cards create no entities, so **By entity** finds nothing), search for **Mealie Atelier** and pick **Complete kitchen** or a focused card. The visual editor finds your Mealie connection and walks you through view and appearance. No YAML needed.

Step-by-step guides in German: [setup](https://alles-automatisch.de/lernen/mealie-atelier-einrichten) and [troubleshooting](https://alles-automatisch.de/lernen/mealie-atelier-fehlerbehebung). Answers to common questions are in the [FAQ](docs/FAQ.md).

<a id="ui-resource"></a>

### Manual install on UI-managed dashboards

Turn on **Advanced mode** in your user profile, open **Settings → Dashboards**, choose the three dots → **Resources**, add `/local/community/mealie-atelier-cards/mealie-atelier-cards.js` as a **JavaScript module** and hard-reload the browser. A `lovelace: resources:` block in `configuration.yaml` is ignored on UI-managed dashboards.

<a id="yaml-resource"></a>

<details>
<summary>Dashboards in YAML mode (resource_mode: yaml)</summary>

Only for dashboards in YAML mode, add the module resource yourself:

```yaml
lovelace:
  resources:
    - url: /local/community/mealie-atelier-cards/mealie-atelier-cards.js
      type: module
```

</details>

## Card types

| Card type                        | Purpose                                                  |
| -------------------------------- | -------------------------------------------------------- |
| `custom:mealie-atelier-card`     | Recipes, meal plan, shopping and management in one card  |
| `custom:mealie-atelier-today`    | Today's meals and open groceries on one screen           |
| `custom:mealie-atelier-recipes`  | Recipe collection, search, details and cooking mode      |
| `custom:mealie-atelier-mealplan` | Weekly planner with a searchable recipe picker           |
| `custom:mealie-atelier-shopping` | Shopping lists with tick, add and offline queue          |
| `custom:mealie-atelier-discover` | Discover recipes and a proposed seven-day menu           |
| `custom:mealie-atelier-pantry`   | Pantry and staples for grocery planning                  |
| `custom:mealie-atelier-family`   | Shared cooking sessions with helper tasks                |
| `custom:mealie-atelier-cookbook` | A print-ready A4 cookbook                                |
| `custom:mealie-atelier-manage`   | Create, import and edit recipes with a structured editor |

Most options are in the visual editor. The YAML equivalent looks like this:

```yaml
type: custom:mealie-atelier-card
mode: dashboard # or recipes, mealplan, shopping, discover, ...
theme: auto # auto, light or dark
language: en # auto, en or de
accent: "#9dcbb2"
density: comfortable # or compact
show_images: true
```

## Configuration reference

<details>
<summary>All card options (YAML)</summary>

Most options are available in the visual editor; `keep_awake` has no field in the card editor: toggle it in cooking mode or set it in YAML. YAML is otherwise only needed if you prefer it. Colors and layout set here are defaults. Choices made in the Design Studio of a card are stored in that browser and take priority on that device.

| Option                                                                                 | Values                                                                                                        | Default                                   | Purpose                                                                                                               |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `mode`                                                                                 | `dashboard`, `today`, `discover`, `recipes`, `mealplan`, `pantry`, `shopping`, `family`, `cookbook`, `manage` | `dashboard`                               | Start view. `dashboard` shows the navigation to every view; any other value shows only that view without navigation.  |
| `theme`                                                                                | `auto`, `light`, `dark`                                                                                       | `auto`                                    | Color scheme. `auto` follows the Home Assistant light or dark mode.                                                   |
| `language`                                                                             | `auto`, `en`, `de`                                                                                            | `auto`                                    | `auto` follows the Home Assistant language and falls back to English.                                                 |
| `accent`                                                                               | `#rrggbb`                                                                                                     | `#9dcbb2`                                 | Accent color.                                                                                                         |
| `density`                                                                              | `comfortable`, `compact`                                                                                      | `comfortable`                             | Spacing.                                                                                                              |
| `motion`                                                                               | `expressive`, `balanced`, `off`                                                                               | `expressive`                              | Animation level. The operating system's reduced-motion setting always wins.                                           |
| `radius`                                                                               | `large`, `small`, `square`                                                                                    | `large`                                   | Corner rounding.                                                                                                      |
| `columns`                                                                              | `2` to `4`                                                                                                    | `3`                                       | Recipe grid columns.                                                                                                  |
| `photo_ratio`                                                                          | `portrait`, `square`, `landscape`                                                                             | `portrait`                                | Recipe photo shape.                                                                                                   |
| `show_images`                                                                          | `true`, `false`                                                                                               | `true`                                    | Show recipe photos.                                                                                                   |
| `keep_awake`                                                                           | `true`, `false`                                                                                               | `true`                                    | Keep the screen awake in cooking mode (not in the card editor; toggle it in cooking mode or set it in YAML).          |
| `kiosk_mode`                                                                           | `true`, `false`                                                                                               | `false`                                   | Enlarged tablet layout.                                                                                               |
| `provider`                                                                             | `auto`, `atelier`, `home_assistant`                                                                           | `auto`                                    | Data source. `auto` prefers the Bridge and falls back to the built-in Mealie integration for read-only recipe access. |
| `entry_id`                                                                             | Bridge config entry ID                                                                                        | first entry                               | Choose a Bridge connection if you have several.                                                                       |
| `mealie_entry_id`                                                                      | built-in Mealie config entry ID                                                                               | first entry                               | Choose a built-in Mealie connection if you have several.                                                              |
| `print_style`                                                                          | `editorial`, `compact`, `minimal`                                                                             | `editorial`                               | Print Studio layout (`minimal` is the black-ink "Ink saver").                                                         |
| `print_image`, `print_checkboxes`, `print_notes`, `print_completed`, `print_nutrition` | `true`, `false`                                                                                               | `false`, `true`, `true`, `false`, `false` | What a printed recipe or list includes.                                                                               |
| `cooking_scene`                                                                        | `scene.*` entity ID                                                                                           | none                                      | Optional scene to turn on from cooking mode.                                                                          |
| `cooking_media_player`                                                                 | `media_player.*` entity ID                                                                                    | none                                      | Optional speaker for the quiet-kitchen and read-aloud actions.                                                        |
| `cooking_volume`                                                                       | `0` to `1`                                                                                                    | `0.18`                                    | Volume set by the quiet-kitchen action. The editor offers presets (10, 18, 30, 50 %); YAML accepts any value.         |
| `cooking_tts_engine`                                                                   | `tts.*` entity ID                                                                                             | none                                      | Optional text-to-speech engine for reading a step aloud.                                                              |

The cooking actions only run when you press them. Nothing triggers automatically.

</details>

## Features in detail

- **Cooking mode:** one step per screen with swipe and keyboard navigation, step photos, kitchen timers that can notify after the browser closes (Bridge), personal notes and ratings, screen wake lock.
- **Recipe editor:** structured ingredients with food and unit lookup, a review step with scaled preview, cover and step photo upload, and a version history with restore. Every write is backed up first.
- **Print Studio:** A4 layouts for recipes, shopping lists, the week plan and a whole cookbook, in Editorial, Compact or Ink saver style.
- **Nutrition Lab:** match ingredients against USDA data, confirm grams and store per-serving values in Mealie. AI name suggestions are optional and off by default.
- **Smart Shopping Sync:** rule-based sync from a Mealie list to a Home Assistant To-do list such as Bring!, with a preview before the first batch (Bridge).
- **Offline shopping:** ticks and new items made without a connection are kept on the device and replayed in order, exactly once, when the connection returns.
- **Accessibility:** keyboard navigation and focus management in every dialog, screen reader labels and reduced motion support.

## Standalone web app and demo

The cards also run without Home Assistant. The [standalone web app](web/README.md) is a small Node server with accounts and roles that keeps the Mealie token on the server and installs as a PWA. The [live demo](https://mealie.alles-automatisch.de) runs the same cards with ten fictional recipes entirely in your browser; nothing is sent anywhere.

Build the demo locally with `npm run build:demo` and serve `demo/public-site/`.

## Uninstall

1. Remove every Mealie Atelier card from your dashboards first. Leftover cards show a bare "Configuration error" once the files are gone.
2. If you use the Bridge, delete its entry under **Settings → Devices & services**. This also deletes its backups and outbox.
3. Uninstall the cards in the Marketplace or HACS, or remove the resource (**Settings → Dashboards → Resources**) and delete the `mealie-atelier-cards` folder from `www/community/`.
4. Restart Home Assistant and hard-reload the browser.

## Documentation

- **Questions and answers:** [FAQ](docs/FAQ.md)
- **Standalone web app (Docker, accounts, environment variables):** [web/README.md](web/README.md)
- **Architecture and security boundaries:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Design system and control rules:** [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md), [docs/CONTROL_SYSTEM.md](docs/CONTROL_SYSTEM.md)
- **Repository layout and releases:** [docs/REPOSITORY_MAP.md](docs/REPOSITORY_MAP.md), [docs/MARKETPLACE.md](docs/MARKETPLACE.md)
- **Home Assistant integration (Bridge):** [Bridge README](https://github.com/mealie-atelier/mealie-atelier-bridge#readme), [installation guide](https://github.com/mealie-atelier/mealie-atelier-bridge/blob/main/docs/INSTALLATION.md)
- **Guides (German):** [alles-automatisch.de/lernen/mealie-atelier](https://alles-automatisch.de/lernen/mealie-atelier)

## Development

```sh
npm ci
npm run build && npm test && npm run check
node --test web/test/*.test.mjs
```

Changes are in the [changelog](CHANGELOG.md), contribution rules in [CONTRIBUTING.md](CONTRIBUTING.md). Live acceptance tests against disposable Mealie and Home Assistant containers live in the [Bridge repository](https://github.com/mealie-atelier/mealie-atelier-bridge/tree/main/tests/live).

## Support the project

Mealie Atelier is free, open source and independent. If it makes your kitchen a little calmer:

- [Buy me a coffee on Ko-fi](https://ko-fi.com/allesautomatisch)
- [Become a member of the Alles Automatisch YouTube channel](https://www.youtube.com/@alles-automatisch/join)
- Star the repository and share your dashboard in [Show and tell](https://github.com/orgs/mealie-atelier/discussions/categories/show-and-tell)

## License

[MIT](LICENSE). Mealie Atelier is an unofficial companion and is not affiliated with Mealie or Home Assistant.

<p align="center"><sub>Made with love by Daniel Boberg · <a href="https://alles-automatisch.de">alles-automatisch.de</a></sub></p>
