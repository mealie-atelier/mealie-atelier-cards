# Control system

This is the current control implementation note for Cards and the standalone web app. The binding product-wide rules live in [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md); version history is in [`CHANGELOG.md`](../CHANGELOG.md).

## Shared control contract

- Lovelace and standalone controls are built from the same source modules under `src/design-system/`.
- Check and radio visuals are 22 × 22 CSS pixels. Their interactive rows and task checkbuttons provide at least a 44 × 44 CSS-pixel target.
- Native inputs have associated labels. Custom task checkbuttons expose `role="checkbox"` and `aria-checked`; selection buttons expose `aria-pressed`.
- Keyboard focus remains visible, and interactive targets do not move when their visual state changes. Only decorative check feedback may animate.
- Focus, disabled, hover, forced-color, and reduced-motion states are implemented in the shared control/editor styles. The operating-system reduced-motion preference takes precedence over the configured motion level.
- The Home Assistant visual editor is shadow-DOM scoped and uses the shared sizing and focus rules; avoid duplicate legacy selectors or view-specific controls.

## Current source and verification

- Shared card controls: `src/design-system/controls.css`
- Home Assistant card editor: `src/design-system/editor.css`
- Standalone shell token mapping: `web/public/shell.css`
- Regression tests: `test/control-system.test.mjs` and `test/design-system.test.mjs`

Run from the Cards repository root:

```sh
npm run build
npm test
npm run check
```

The test suite checks shared source ownership, touch-target tokens, accessibility state, editor label geometry, reduced motion, and the built bundle. It does not replace visual review of a real Home Assistant dashboard.

## Limits

Automated tests and browser-emulated screenshots do not establish physical-device, real Home Assistant dashboard, screen-reader, printer or Safari/PWA acceptance. Review changes to controls in a real dashboard before release.
