# Product roadmap — Mealie Atelier

> Current code is a 0.9.5 developer preview. The canonical, prioritized list of open tasks is [OPEN_TODOS.md](OPEN_TODOS.md); detailed manual acceptance procedures are in [RELEASE_READINESS_0.9.5.md](RELEASE_READINESS_0.9.5.md). GitHub Actions and automated dependency-update pull requests are intentionally disabled.

## Product direction

Build a warm, local-first kitchen studio that makes a large recipe collection easier to discover, plan, shop for, and cook from. The standalone experience must remain useful without Home Assistant; HA Cards and the optional Bridge add capabilities without making HA mandatory.

Keep Mealie as the recipe system of record. Keep credentials out of browser code. Make privacy, accessibility, responsive behavior, and safe failure states part of the product rather than release-week additions. Use the design system consistently and keep German and English equally usable.

## Now — prove the developer preview on real systems

The next milestone is acceptance, not a feature-count target:

1. Validate HACS/Hassfest and installation manually on a disposable Home Assistant instance.
2. Test supported Mealie versions and real read/write workflows without touching household data.
3. Complete provider tests and safety behavior before implementing/advertising the planned shopping sync.
4. Finish physical-device, embedded-card, accessibility, security, and public-demo checks.
5. Document supported versions and publish only independently validated packages.

The [open-work index](OPEN_TODOS.md) records priority and completion evidence. It supersedes old checkbox plans in milestone notes.

## After release readiness

Schedule these only when their dependencies and user value are clear:

- Safe Mealie-to-HA shopping-list copy/move with durable retries, duplicate reconciliation, and explicit failure states.
- Further cooking-flow improvements driven by live recipe content, including step-photo composition, legibility, and progress controls.
- Additional household planning and provider integrations where real users and supported APIs justify the maintenance cost.
- More languages through the established translation workflow, with parity checks for every user-facing string.

## Shipped direction and retained history

The current preview includes the photo-led recipe library and cooking mode, responsive cards, a standalone Web/PWA path, bilingual demo generation, neutral Light and Dark themes, recipe search and conversion, shopping and meal planning workflows, and a visual setup path. Historical release notes and feature matrices remain the record of version-by-version changes; do not use them as the current task tracker.

## Corrections log

- 2026-10-28 — Replaced stale milestone checkboxes (including a public HACS Action that conflicts with the no-Actions policy) with a current roadmap linked to the canonical open-work index.
