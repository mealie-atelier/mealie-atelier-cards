# Localization follow-up — 2026-10-28

This follow-up records the shared-locale migration for dialog section labels, the standalone print document, and offline UI errors. It contains 36 fresh screenshots: the plan, create, import, and edit dialogs at nine responsive geometries.

| Profile | Geometry | Screenshot files |
| --- | ---: | --- |
| Mobile | 375 × 812 | `375px-<dialog>.jpg` |
| Tablet | 720 × 900 | `720px-<dialog>.jpg` |
| Compact desktop | 1010 × 900 | `1010px-<dialog>.jpg` |
| Wide desktop | 1470 × 1000 | `1470px-<dialog>.jpg` |
| Embedded card | 380 px card in 1510 × 980 viewport | `embedded-380px-<dialog>.jpg` |
| Duo outer portrait | 466 × 678 | `duo-outer-portrait-<dialog>.jpg` |
| Duo outer landscape | 678 × 466 | `duo-outer-landscape-<dialog>.jpg` |
| Duo inner portrait | 626 × 890 | `duo-inner-portrait-<dialog>.jpg` |
| Duo inner landscape | 890 × 626 | `duo-inner-landscape-<dialog>.jpg` |

`<dialog>` is `plan`, `create`, `import`, or `edit`. Fixtures are fictional, the theme is neutral Light, and reduced motion is enabled so captures show settled layouts. The four localized strings render correctly across the screenshots. A separate bounds run checked all fourteen dialog types at all nine geometries (126 states); none crossed the emulated viewport. The complete theme/view/dialog screenshot matrices remain in the sibling QA folders.
