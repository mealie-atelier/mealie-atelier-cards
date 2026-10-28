# English visual review — 2026-10-28

This evidence set records the complete English-language browser matrix for the local Mealie Atelier cards demo. It contains **216 screenshots**: ten views and fourteen dialogs at each of nine emulated geometries. All recipe and household content is fictional. The interface is English; user-authored recipe names and instructions intentionally remain in their source language.

## Coverage

| Profile             |                   CSS-pixel viewport |  Views | Dialogs | Evidence                                                                                                                                                              |
| ------------------- | -----------------------------------: | -----: | ------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 375 px mobile       |                            375 × 812 |     10 |      14 | [Dashboard](en-375px-view-dashboard.jpg) · [Recipe](en-375px-dialog-recipe.jpg) · [Settings](en-375px-dialog-settings.jpg)                                            |
| 720 px              |                            720 × 900 |     10 |      14 | [Dashboard](en-720px-view-dashboard.jpg) · [Cooking](en-720px-dialog-cook.jpg) · [Nutrition](en-720px-dialog-nutrition.jpg)                                           |
| 1010 px             |                           1010 × 900 |     10 |      14 | [Dashboard](en-1010px-view-dashboard.jpg) · [Cooking](en-1010px-dialog-cook.jpg) · [Nutrition](en-1010px-dialog-nutrition.jpg)                                        |
| 1470 px desktop     |                          1470 × 1000 |     10 |      14 | [Dashboard](en-1470px-view-dashboard.jpg) · [Recipe](en-1470px-dialog-recipe.jpg) · [Settings](en-1470px-dialog-settings.jpg)                                         |
| Embedded card       | 380 px card in a 1510 × 980 viewport |     10 |      14 | [Dashboard](en-embedded-380px-view-dashboard.jpg) · [Cooking](en-embedded-380px-dialog-cook.jpg) · [Nutrition](en-embedded-380px-dialog-nutrition.jpg)                |
| Duo outer portrait  |                            466 × 678 |     10 |      14 | [Dashboard](en-duo-outer-portrait-view-dashboard.jpg) · [Cooking](en-duo-outer-portrait-dialog-cook.jpg) · [Settings](en-duo-outer-portrait-dialog-settings.jpg)      |
| Duo outer landscape |                            678 × 466 |     10 |      14 | [Dashboard](en-duo-outer-landscape-view-dashboard.jpg) · [Cooking](en-duo-outer-landscape-dialog-cook.jpg) · [Settings](en-duo-outer-landscape-dialog-settings.jpg)   |
| Duo inner portrait  |                            626 × 890 |     10 |      14 | [Dashboard](en-duo-inner-portrait-view-dashboard.jpg) · [Cooking](en-duo-inner-portrait-dialog-cook.jpg) · [Nutrition](en-duo-inner-portrait-dialog-nutrition.jpg)    |
| Duo inner landscape |                            890 × 626 |     10 |      14 | [Dashboard](en-duo-inner-landscape-view-dashboard.jpg) · [Cooking](en-duo-inner-landscape-dialog-cook.jpg) · [Nutrition](en-duo-inner-landscape-dialog-nutrition.jpg) |
| **Total**           |                                      | **90** | **126** | **216 screenshots**                                                                                                                                                   |

Views: cookbook, dashboard, discover, family, manage, mealplan, pantry, recipes, shopping, today. Dialogs: command, cook, create-list, create, edit, import, journal, loading, nutrition, plan, print, recipe-to-list, recipe, settings.

## Review method and limits

- The same fictional demo catalog and all nine profile dimensions were used for every view and dialog. English was selected through the card's locale configuration; the nutrition view was opened through its normal demo interaction so it includes prepared nutrition rows.
- Every capture was checked for the expected view/dialog, English interface locale, and document-level horizontal overflow. The screenshots were reviewed in profile contact sheets for clipped labels, misplaced actions, and layout breaks.
- The embedded-card profile uses a local 380 px card inside a wide browser viewport. It is not a live Home Assistant dashboard.
- Duo geometries are browser simulations. They do not validate physical hinges, safe areas, touch targets under real device scaling, Safari behavior, or native keyboard behavior.
- The matrix does not replace physical device, screen-reader, keyboard-only, reduced-motion, contrast, printer, or live Home Assistant acceptance tests.

For the German baseline, focused recipe-step checks, PWA install dialog, and showcase images, see the [visual review evidence index](../visual-review-2026-10-28/README.md). Remaining external acceptance items are listed in [`RELEASE_READINESS_0.9.5.md`](../../RELEASE_READINESS_0.9.5.md).

## Corrections log

- 2026-10-28 — Added a complete English companion to the existing German view/dialog matrix after the design and localization changes.
