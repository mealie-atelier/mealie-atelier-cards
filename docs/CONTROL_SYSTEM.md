# Control system QA

This is the current control implementation note for Cards and the standalone web app. The binding product-wide rules live in [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md); old release notes are historical records, not current implementation instructions.

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

## Visual evidence and limits

The repository contains fictional-data view/dialog captures for German and English in [`docs/qa/visual-review-2026-10-28/README.md`](qa/visual-review-2026-10-28/README.md), a previous neutral/warm Light matrix in [`docs/qa/light-theme-review-2026-10-28/README.md`](qa/light-theme-review-2026-10-28/README.md), and the motion review in [`docs/qa/theme-motion-review-2026-10-28/README.md`](qa/theme-motion-review-2026-10-28/README.md). The final stone-and-plum Light refinement was checked at representative widths; its complete dialog matrix still needs a fresh capture.

Browser-emulated screenshots do not establish physical-device, real HA dashboard, screen-reader, keyboard-only, printer, Safari/PWA, or live Mealie acceptance. Those release gates are tracked in [`RELEASE_READINESS_0.9.5.md`](RELEASE_READINESS_0.9.5.md).

## Corrections log

- **2026-10-28:** Replaced the obsolete German v0.9.1 note and removed references to QA scripts that are no longer in the repository. Pointed control rules and verification at the current shared stylesheet modules and test suite; recorded the completed neutral-Light matrix and current repository paths.
