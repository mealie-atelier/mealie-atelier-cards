# Visual review evidence — 2026-10-28

This folder contains browser screenshots for the cards demo. The base matrix has nine emulated CSS-pixel profiles, ten main views and fourteen dialogs per profile: **216 screenshots**. Nine additional bottom-of-Design-Studio captures check the Ko-fi section, bringing the original evidence set to **225 images**. The language-selector change was checked in English at the top and bottom of Design Studio in all nine profiles, adding 18 images. Later English spot checks cover Kochinspo, pantry/shopping, family cooking, cookbook, print output, and the dashboard at mobile width. The folder currently contains **261 image files** (243 JPG and 18 PNG); several family captures record visual refinement iterations.

| Profile                    |           Width × height (CSS px) |  Views | Dialogs |   Total |
| -------------------------- | --------------------------------: | -----: | ------: | ------: |
| 375px                      |                         375 × 844 |     10 |      14 |      24 |
| 720px                      |                         720 × 900 |     10 |      14 |      24 |
| 1010px                     |                        1010 × 900 |     10 |      14 |      24 |
| 1470px                     |                       1470 × 1000 |     10 |      14 |      24 |
| embedded-380px             | card 380px inside a wide viewport |     10 |      14 |      24 |
| iPhone Duo outer portrait  |                         466 × 678 |     10 |      14 |      24 |
| iPhone Duo outer landscape |                         678 × 466 |     10 |      14 |      24 |
| iPhone Duo inner portrait  |                         626 × 890 |     10 |      14 |      24 |
| iPhone Duo inner landscape |                         890 × 626 |     10 |      14 |      24 |
| **Total**                  |                                   | **90** | **126** | **216** |

Each profile filename follows `<profile>-view-<name>.jpg` or `<profile>-dialog-<name>.jpg`. Views: cookbook, dashboard, discover, family, manage, mealplan, pantry, recipes, shopping, today. Dialogs: command, cook, create-list, create, edit, import, journal, loading, nutrition, plan, print, recipe-to-list, recipe, settings.

## What this evidence supports

- Screenshots show that all listed views and dialogs rendered at the recorded emulated widths, using demo fixtures.
- The underlying matrix review checked legibility, spacing, card overflow, button/input placement, dialog scrolling, and pose-specific layout.
- “embedded-380px” is a container-width simulation, not a live Home Assistant dashboard with an embedded HA card.
- iPhone Duo dimensions are browser CSS-pixel estimates. They do not prove physical display behavior, browser chrome, safe-area insets, hinge behavior, or touch ergonomics.
- The original German full-view/dialog matrix contains 216 screenshots. The complete English matrix now contains another 216 screenshots across the same nine CSS-pixel profiles, covering all ten views and fourteen dialogs in each. The dedicated [English visual review index](../english-visual-review-2026-10-28/README.md) lists the profiles and evidence.
- The final English dashboard at 375 × 812 CSS px has no main-card horizontal overflow. The local demo reported zero console errors and warnings after the latest bundle build.
- Screenshots use fictional demo content. They do not verify a live Mealie account, live Home Assistant, HACS, physical tablet, screen reader, or printer.

The supplemental files follow `support-<profile>-dialog-settings-bottom.jpg`. They capture the scrollable settings dialog at its lower section, including the Ko-fi link, reset action, and close action. The complete matrix was visually reviewed as contact sheets. The support section was inspected at all nine profiles; it remains a voluntary action with no overflow or clipped controls.

The language selector and settings dialog were recaptured in English after the selector was added. Each file captures the top or bottom of the scrollable dialog; the embedded profile is a verified 380 px card inside a 1510 px viewport.

| Profile             | English settings screenshots                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| 375 px              | [Top](en-settings-375px-top.jpg) · [Bottom](en-settings-375px-bottom.jpg)                             |
| 720 px              | [Top](en-settings-720px-top.jpg) · [Bottom](en-settings-720px-bottom.jpg)                             |
| 1010 px             | [Top](en-settings-1010px-top.jpg) · [Bottom](en-settings-1010px-bottom.jpg)                           |
| 1470 px             | [Top](en-settings-1470px-top.jpg) · [Bottom](en-settings-1470px-bottom.jpg)                           |
| 380 px embedded     | [Top](en-settings-embedded-380px-top.jpg) · [Bottom](en-settings-embedded-380px-bottom.jpg)           |
| Duo outer portrait  | [Top](en-settings-duo-outer-portrait-top.jpg) · [Bottom](en-settings-duo-outer-portrait-bottom.jpg)   |
| Duo outer landscape | [Top](en-settings-duo-outer-landscape-top.jpg) · [Bottom](en-settings-duo-outer-landscape-bottom.jpg) |
| Duo inner portrait  | [Top](en-settings-duo-inner-portrait-top.jpg) · [Bottom](en-settings-duo-inner-portrait-bottom.jpg)   |
| Duo inner landscape | [Top](en-settings-duo-inner-landscape-top.jpg) · [Bottom](en-settings-duo-inner-landscape-bottom.jpg) |

For the detailed design contract and dimensions, see [`docs/DESIGN_SYSTEM.md`](../../DESIGN_SYSTEM.md). For required live/device checks, see [`docs/RELEASE_READINESS_0.9.5.md`](../../RELEASE_READINESS_0.9.5.md).

## Latest English view captures

- [Dashboard, 375 × 812 px](en-final-card-375.png)
- [Kochinspo wizard, 375 px](en-discover-375.png)
- [Pantry and shopping, 375 px](en-pantry-375.png)
- [Family cooking, 375 px](en-family-375-final.png)
- [Cookbook, 375 px](en-cookbook-375.png)
- [A4 cookbook print output](en-print-preview.png)

## Recipe-step and showcase follow-up — 2026-10-28

The recipe instruction view and cooking cockpit were rechecked after changing step-photo framing and short-screen action placement. Screenshots use the eight coherent, fictional demo recipes rather than the authenticated household recipe.

| State                                                           | Evidence                                                                              |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Recipe detail with inline step images, 390 × 844 px             | [Mobile instructions](steps-recipe-detail-mobile.png)                                 |
| Recipe detail with inline step images, 1470 × 1000 px           | [Desktop instructions](steps-recipe-detail-desktop-1470.png)                          |
| Cooking step, 390 × 844 px                                      | [Mobile cooking](steps-cook-mobile-390.png)                                           |
| Duo outer portrait, 466 × 678 px                                | [Outer portrait cooking](steps-cook-duo-outer-portrait.png)                           |
| Duo outer landscape, 678 × 466 px                               | [Outer landscape cooking](steps-cook-duo-outer-landscape.png)                         |
| Duo inner portrait, 626 × 890 px                                | [Inner portrait cooking](steps-cook-duo-inner-portrait.png)                           |
| Duo inner landscape, 890 × 626 px                               | [Inner landscape cooking](steps-cook-duo-inner-landscape.png)                         |
| Interactive before/after showcase, 390 × 844 and 1470 × 1000 px | [Mobile English](showcase-mobile-en.png) · [Desktop English](showcase-desktop-en.png) |

The cooking-step captures show the full 44 px navigation controls inside all four emulated Duo poses after the short-screen refinements; no horizontal page overflow was measured. The English showcase was checked at 390 px and 1470 px, including its language toggle and fictional-data notice. The full English view/dialog matrix is recorded separately and does not represent physical-device acceptance.

## PWA installation dialog — 2026-10-28

The localized, user-triggered standalone-app install dialog was opened and visually reviewed in a 390 × 844 CSS-pixel mobile viewport. The screenshot records the modal layout, dismissal and primary actions, platform-neutral install guidance, and privacy note. This browser-emulated review does not replace testing the native install prompt, the iOS/iPadOS Safari Share Sheet, browser-specific installation behavior, or physical safe areas.

- [Mobile install dialog, 390 × 844 px](pwa-install-dialog-mobile-390.png)
