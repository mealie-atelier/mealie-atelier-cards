# Theme and motion review — 2026-10-28

This focused browser review checks the shared dark and warm-light palettes after consolidating theme colors into the design-system tokens.

| Capture                    | CSS-pixel viewport | Review                                                                     |
| -------------------------- | -----------------: | -------------------------------------------------------------------------- |
| `dark-desktop.png`         |        1470 × 1000 | Dark baseline, dashboard hierarchy, photography, navigation and controls   |
| `light-desktop.png`        |        1470 × 1000 | Warm paper surfaces, sidebar separation, text contrast and primary actions |
| `light-mobile-390x844.png` |          390 × 844 | Compact navigation, stacked actions, heading wrap and hero image           |

The light theme was also switched in the authenticated standalone companion. The card appearance, document color scheme, and browser `theme-color` changed together. Its API preview used an intentionally unavailable local Mealie endpoint; the standalone's expected connection error was not treated as a UI regression or live-service result.

The complete German-language light-theme view/dialog matrix is in [`../light-theme-review-2026-10-28/README.md`](../light-theme-review-2026-10-28/README.md). The existing dark-theme German and English matrices remain in `../visual-review-2026-10-28/` and `../english-visual-review-2026-10-28/`. Live HA dashboards, physical devices, screen readers, and printer output remain separate release gates.

## Motion review

- Theme changes use a short content fade and the companion shell transitions its color scheme.
- Cooking-step selection uses a small spring response; it does not move the touch target.
- The standalone install dialog fades and lifts into view.
- The card's motion setting and operating-system reduced-motion preference remain in force. No new ambient looping animation was introduced.
