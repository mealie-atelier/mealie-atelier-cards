# Light-theme visual review — 2026-10-28

> Historical warm-light palette. The final neutral stone/plum palette and current full matrix are documented in [`../neutral-light-review-2026-10-28/README.md`](../neutral-light-review-2026-10-28/README.md).

The complete light-theme browser matrix contains **216 screenshots**: ten views and fourteen dialogs at each of nine emulated geometries. Screenshots use fictional local demo data and the German interface locale. They were reviewed as nine contact sheets after capture.

| Profile                      |                 CSS-pixel viewport | Contact sheet                                                        |
| ---------------------------- | ---------------------------------: | -------------------------------------------------------------------- |
| Mobile                       |                          375 × 812 | [`contact-375px.jpg`](contact-375px.jpg)                             |
| Tablet                       |                          720 × 900 | [`contact-720px.jpg`](contact-720px.jpg)                             |
| Desktop compact              |                         1010 × 900 | [`contact-1010px.jpg`](contact-1010px.jpg)                           |
| Desktop wide                 |                        1470 × 1000 | [`contact-1470px.jpg`](contact-1470px.jpg)                           |
| Embedded Home Assistant card | 380 px card in 1510 × 980 viewport | [`contact-embedded-380px.jpg`](contact-embedded-380px.jpg)           |
| iPhone Duo outer portrait    |                          466 × 678 | [`contact-duo-outer-portrait.jpg`](contact-duo-outer-portrait.jpg)   |
| iPhone Duo outer landscape   |                          678 × 466 | [`contact-duo-outer-landscape.jpg`](contact-duo-outer-landscape.jpg) |
| iPhone Duo inner portrait    |                          626 × 890 | [`contact-duo-inner-portrait.jpg`](contact-duo-inner-portrait.jpg)   |
| iPhone Duo inner landscape   |                          890 × 626 | [`contact-duo-inner-landscape.jpg`](contact-duo-inner-landscape.jpg) |

For an individual image, use `light-<profile>-view-<view>.jpg` or `light-<profile>-dialog-<dialog>.jpg`. Profile names match the contact-sheet table. Views are dashboard, today, discover, recipes, mealplan, pantry, shopping, family, cookbook, and manage. Dialogs are command, cook, create-list, create, edit, import, journal, loading, nutrition, plan, print, recipe-to-list, recipe, and settings.

Every captured state was checked for document-level horizontal overflow at its target viewport; **no overflowing state was found**. Intended internal horizontal rails remain part of the design. Contact sheets were reviewed for surface contrast, text hierarchy, clipping, dialog sizing, and responsive layout. The dedicated standalone-app install dialog was also checked in light mode: [`install-dialog-light.png`](install-dialog-light.png).

The iPhone Duo sizes are browser simulations, and the 380 px card is embedded in a local browser fixture. This matrix does not substitute for a physical device, a live Home Assistant dashboard, keyboard-only and screen-reader acceptance, or a real Safari/PWA installation check.

## Motion review

- Theme changes use a short content fade and the standalone shell transitions its color scheme.
- Cooking-step selection uses a small spring response without moving the touch target.
- The standalone install dialog fades and lifts into view.
- Expressive, balanced, off, and operating-system reduced-motion preferences are supported. No ambient looping animation was introduced.

## Corrections log

- **2026-10-28:** Added the complete light-theme counterpart to the German nine-profile, ten-view, fourteen-dialog matrix, plus a light PWA-install dialog capture. All 216 card states had no document-level horizontal overflow in the local fixture.
