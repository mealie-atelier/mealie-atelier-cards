<p align="center"><img width="112" alt="Mealie Atelier icon: handmade pasta with tomatoes" src="https://raw.githubusercontent.com/mealie-atelier/mealie-atelier-cards/main/brand/icon-512.png"></p>

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
<a href="https://github.com/mealie-atelier/mealie-atelier-bridge">Atelier Bridge</a> ·
<a href="https://github.com/orgs/mealie-atelier/discussions">Discussions</a>
</p>

<p align="center"><img width="900" alt="Mealie Atelier kitchen overview in a Home Assistant dashboard, light theme" src="https://raw.githubusercontent.com/mealie-atelier/mealie-atelier-cards/main/assets/screens/dashboard-light.webp"></p>

## Why Mealie Atelier

[Mealie](https://mealie.io) is a wonderful self-hosted recipe manager. Mealie Atelier brings it into the place your household already looks every day: the Home Assistant dashboard.

- **Cook without the clutter.** A full-screen cooking mode with one step at a time, kitchen timers, step photos and a screen that stays awake.
- **Plan the week at a glance.** A weekly planner with a searchable recipe picker.
- **Shop together.** Tick items on the phone, even with a weak signal: edits wait on the device and are sent in order when the connection is back.
- **Feels native.** A visual card editor, ten focused card types, German and English, light and dark, compact and comfortable density, your accent colour.
- **Safe by design.** Your Mealie token stays on the server, writes respect per-user grants and an optional read-only mode, and every recipe edit is backed up first.

## Screenshots

<p align="center"><img width="440" alt="Recipe collection with photos, dark theme" src="https://raw.githubusercontent.com/mealie-atelier/mealie-atelier-cards/main/assets/screens/recipes-dark.webp"> <img width="440" alt="Recipe details with cooking, nutrition and print actions, light theme" src="https://raw.githubusercontent.com/mealie-atelier/mealie-atelier-cards/main/assets/screens/recipe-light.webp"></p>
<p align="center"><img width="440" alt="Cooking mode with step, timer and photo, dark theme" src="https://raw.githubusercontent.com/mealie-atelier/mealie-atelier-cards/main/assets/screens/cook-dark.webp"> <img width="440" alt="Weekly meal planner, light theme" src="https://raw.githubusercontent.com/mealie-atelier/mealie-atelier-cards/main/assets/screens/mealplan-light.webp"></p>
<p align="center"><img width="440" alt="Shopping list with ticked items, dark theme" src="https://raw.githubusercontent.com/mealie-atelier/mealie-atelier-cards/main/assets/screens/shopping-dark.webp"> <img width="440" alt="Cook ideas questionnaire, light theme" src="https://raw.githubusercontent.com/mealie-atelier/mealie-atelier-cards/main/assets/screens/discover-light.webp"></p>
<p align="center"><img width="820" alt="Four phone screens: overview, recipe, cooking mode and shopping list" src="https://raw.githubusercontent.com/mealie-atelier/mealie-atelier-cards/main/assets/screens/phones.webp"></p>

<sub>All screenshots show fictional sample recipes in a disposable Home Assistant 2026.11 test instance. Photos are credited in the [demo catalogue](demo/data/recipes.json).</sub>

## Install

**1. Install the cards.** Mealie Atelier Cards is submitted to the default catalog used by the Home Assistant Marketplace (Home Assistant 2026.11 and newer) and HACS. Until it is listed, add it to HACS as a custom repository of type **Dashboard**:

[![Open the repository in HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=mealie-atelier&repository=mealie-atelier-cards&category=plugin)

The card bundle installs to `/local/community/mealie-atelier-cards/`, and the dashboard resource is registered for you. Reload the browser when Home Assistant asks.

**2. Connect Mealie.** Pick one:

| Connection                                                                                         | What you get                                                                                                  |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| [Mealie Atelier Bridge](https://github.com/mealie-atelier/mealie-atelier-bridge) (recommended)     | Everything: photos, shopping and meal plan writes, recipe editing, timers, offline shopping, per-user grants. |
| Home Assistant's built-in [Mealie integration](https://www.home-assistant.io/integrations/mealie/) | Read-only recipe browsing and cooking mode, no photos or writes.                                              |

**3. Add a card.** Open **Edit dashboard → Add card**, search for **Mealie Atelier** and pick **Complete Kitchen** or a focused card. The visual editor finds your Mealie connection and walks you through view and appearance. No YAML needed.

Step-by-step guides in German: [setup](https://alles-automatisch.de/lernen/mealie-atelier-einrichten) and [troubleshooting](https://alles-automatisch.de/lernen/mealie-atelier-fehlerbehebung). Answers to common questions are in the [FAQ](docs/FAQ.md).

<details>
<summary>Dashboards in YAML mode</summary>

Add the module resource yourself:

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
| `custom:mealie-atelier-card`     | The complete kitchen with navigation and every view      |
| `custom:mealie-atelier-today`    | Today's meals and open groceries on one screen           |
| `custom:mealie-atelier-recipes`  | Recipe collection, search, details and cooking mode      |
| `custom:mealie-atelier-mealplan` | Weekly planner with a searchable recipe picker           |
| `custom:mealie-atelier-shopping` | Shopping lists with tick, add and offline queue          |
| `custom:mealie-atelier-manage`   | Create, import and edit recipes with a structured editor |
| `custom:mealie-atelier-discover` | Cook ideas and a proposed seven-day menu                 |
| `custom:mealie-atelier-pantry`   | Pantry and staples for grocery planning                  |
| `custom:mealie-atelier-family`   | Shared cooking sessions with helper tasks                |
| `custom:mealie-atelier-cookbook` | A print-ready A4 cookbook                                |

Every option is in the visual editor. The YAML equivalent looks like this:

```yaml
type: custom:mealie-atelier-card
mode: dashboard # or recipes, mealplan, shopping, discover, ...
theme: dark # light or dark
language: en # auto, en or de
accent: "#9dcbb2"
density: comfortable # or compact
show_images: true
```

## Features in detail

- **Cooking mode:** one step per screen with swipe and keyboard navigation, step photos, kitchen timers that can notify after the browser closes (Bridge), personal notes and ratings, screen wake lock.
- **Recipe editor:** structured ingredients with food and unit lookup, a review step with scaled preview, cover and step photo upload, and a version history with restore. Every write is backed up first.
- **Print Studio:** A4 layouts for recipes, shopping lists, the week plan and a whole cookbook, in Editorial, Compact or Ink saver style.
- **Nutrition Lab:** match ingredients against USDA data, confirm grams and store per-serving values in Mealie. AI name suggestions are optional and off by default.
- **Smart Shopping Sync:** rule-based sync from a Mealie list to a Home Assistant To-do list such as Bring, with a preview before the first batch (Bridge).
- **Offline shopping:** ticks and new items made without a connection are kept on the device and replayed in order, exactly once, when the connection returns.
- **Accessibility:** keyboard navigation and focus management in every dialog, screen reader labels and reduced motion support.

## Standalone web app and demo

The cards also run without Home Assistant. The [standalone web app](web/README.md) is a small Node server with accounts and roles that keeps the Mealie token on the server and installs as a PWA. The [live demo](https://mealie.alles-automatisch.de) runs the same cards with ten fictional recipes entirely in your browser; nothing is sent anywhere.

Build the demo locally with `npm run build:demo` and serve `demo/public-site/`.

## Development

```sh
npm ci
npm run build && npm test && npm run check
node --test web/test/*.test.mjs
```

Architecture, design system and release steps are in [`docs/`](docs/REPOSITORY_MAP.md), changes in the [changelog](CHANGELOG.md), contribution rules in [CONTRIBUTING.md](CONTRIBUTING.md). Live acceptance tests against disposable Mealie and Home Assistant containers live in the [Bridge repository](https://github.com/mealie-atelier/mealie-atelier-bridge/tree/main/tests/live).

## Support the project

Mealie Atelier is free, open source and independent. If it makes your kitchen a little calmer:

- [Buy me a coffee on Ko-fi](https://ko-fi.com/allesautomatisch)
- [Become a member of the Alles Automatisch YouTube channel](https://www.youtube.com/@alles-automatisch/join)
- Star the repository and share your dashboard in [Show and tell](https://github.com/orgs/mealie-atelier/discussions)

## License

[MIT](LICENSE). Mealie Atelier is an unofficial companion and is not affiliated with Mealie or Home Assistant.

<p align="center"><sub>Made with love by Daniel Boberg · <a href="https://alles-automatisch.de">alles-automatisch.de</a></sub></p>
