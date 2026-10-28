# Mealie Atelier showcase brief

## Purpose

Show the practical difference between storing recipes in Mealie and using Atelier to choose, prepare and finish a meal. The showcase is a product explanation, not a claim that every feature is production-ready. Current package status and unverified integrations stay visible next to the demo.

## Story: from a recipe to dinner

Use one fictional recipe and one goal throughout the comparison: “Get a weeknight dinner ready for four, with one child helping.” The baseline shows a recipe page and the user manually moving between recipe, meal plan, shopping and cooking. The Atelier side shows the corresponding path: choose a recipe, scale servings, review missing ingredients, follow focused steps, let a helper complete an approved task, and keep shared timers visible. This demonstrates the value without implying that Mealie's own screens are defective.

## Existing assets and safe data

- The cards repository includes `demo/preview.html` and `demo/standalone-preview.html`, both intended for fictional data and local interaction.
- Existing image examples live under `mealie-atelier-cards/assets/`. Review any selected image for outdated UI and verify its fictional/demo label before using it on a public page.
- Browser evidence is indexed in `docs/qa/visual-review-2026-10-28/README.md`. Its CSS-pixel profiles are simulations, not physical iPhone Duo or Home Assistant acceptance evidence.
- Never put the household's recipe catalog, private hostnames, Mealie API token, account identity, or Home Assistant entities in the public showcase.

## Presentation design

- Lead with a short interactive walkthrough: “Pick dinner → prep together → cook with confidence.” Keep the current live step prominent and let users advance, go back, or reset.
- Offer a side-by-side comparison on wide screens and a user-controlled before/after toggle on narrow screens. Make labels explicit and maintain the same recipe content in both states.
- Provide static screenshots and a transcript so the page remains useful without JavaScript. Every image needs concise alt text and a visible demo-data label.
- Use motion only to explain a state change (selected recipe, checked ingredient, completed step). Do not autoplay a carousel, pulse continuously, or animate essential text. Honor `prefers-reduced-motion`.
- Keep all controls keyboard-operable, visibly focused, touch-friendly, and understandable to screen readers. The comparison must not depend on color alone.
- Test reduced widths, zoom, long translated labels, portrait/landscape, and the four iPhone Duo CSS-pixel simulations. Confirm each page has no horizontal overflow and that actions remain reachable. Physical device checks are still required before claiming Duo support.

## Release and content checks

1. Use fictional recipe fixtures only and inspect the page in German and English.
2. Check all links and accessibility text, no console errors, no network calls to a private Mealie host, and no tokens in HTML or network requests.
3. Match public feature claims to [`FEATURE_MATRIX_0.9.5.md`](FEATURE_MATRIX_0.9.5.md) and open release gates to [`RELEASE_READINESS_0.9.5.md`](RELEASE_READINESS_0.9.5.md).
4. Do not label an emulated viewport or local demo as a physical-device, live-Mealie, Home Assistant, HACS or stable-release verification.
5. Link “Mit Liebe gebaut” author credit to [alles-automatisch.de](https://alles-automatisch.de/) and offer the optional support link in a quiet footer or about section, never in a blocking prompt.

## Current state

The local interactive before/after demo is implemented in [`demo/showcase.html`](../demo/showcase.html). It uses fictional recipe data and local image assets; it does not contact Mealie or Home Assistant. The public CMS page has not been built or published because its source and deployment access are outside this archive.

The README links two small landscape animated tours composed from the current 0.9.5 emulated UI screenshots in `docs/qa/visual-review-2026-10-28/`. They open only when selected, so the README itself does not autoplay motion. These are sequential still states with restrained fades, not recordings of live pointer/keyboard interaction. Static desktop/mobile screenshots remain visible as an alternative. Replace the tours with current, recorded interactions before marketing them as workflow recordings; see [open work](OPEN_TODOS.md).
