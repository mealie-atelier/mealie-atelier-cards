# Contributing

## Source language and style

- Write developer-facing source, identifiers, comments, logs, and repository documentation in English.
- Keep end-user interface copy in the locale resources under `src/i18n/`; do not add user-visible strings directly to rendering or event code.
- Use focused modules with one responsibility. Keep adapters, state transitions, markup, styling, and persistence separate where practical.
- Explain invariants, security decisions, compatibility constraints, and non-obvious tradeoffs in comments. Avoid comments that merely repeat code.
- Use the repository Prettier configuration and Ruff for Python.
- Never edit generated bundles directly. Build them from source and verify that the Web copy matches.

## Project layout

- `src/`: Home Assistant cards, editor, locale resources, and shared design system.
- `test/`: Card, localization, design-system, and feature tests.
- `web/`: Optional standalone server, PWA, API boundaries, state stores, and browser assets.
- `web/test/`: Standalone app and server tests.
- `demo/`: Fictional bilingual recipe data, showcase generator, and generated static site.
- `docs/`: Architecture, setup, release status, and visual QA evidence.

The Home Assistant integration is maintained in the separate [`mealie-atelier-bridge`](https://github.com/mealie-atelier/mealie-atelier-bridge) repository. Run its lint and test commands from that repository’s own contributing guide.

## Format and verify

From the repository root:

```sh
npx --yes prettier@3.5.3 --write "**/*.{js,mjs,cjs,css,json,jsonc,html,yaml,yml}" "!**/dist/**" "!**/public/mealie-atelier-cards.js"
```

Run package checks:

```sh
npm run build
npm test
npm run check
node --test web/test/*.test.mjs
npm run build:demo
```

The card build must leave `dist/mealie-atelier-cards.js` and `web/public/mealie-atelier-cards.js` byte-identical. The demo generator must use only reviewed fictional data and produce separate German and English routes.
