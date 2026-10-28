# Mealie Atelier v0.5.0 – Nutrition Lab & Cooking Companion

**Status:** Developer beta, not public HACS/Marketplace release. **No live Mealie, HA, USDA or OpenAI call has been tested.** This version is distributed with synthetic demo fixtures and does not guarantee API compatibility on the user's server.

## Shipped

- Backend: USDA FoodData Central search and per-ingredient nutrient totals in both the HA Python bridge and the standalone Node companion. No invented macros; values are per 100 g × confirmed grams / servings.
- Optional OpenAI structured search-term suggestions. Returns ingredient search terms, no nutrient numbers; `store:false` in API request. No key is needed to use USDA lookups manually.
- Nutrition modal: explainable matching, editable grams, real data source links, visual results and explicit confirmation. Existing nutrition protected; fingerprint used against race conditions; server recalculates before Mealie PATCH.
- Eight tracked nutrition dimensions with coverage checks (calories, protein, fats, carbs, fiber, sugars, sodium, saturated fats) and explicit null for incomplete source data.
- Cooking mode: multiple on-device timers and personal recipe journal with notes and rating. Timers use local deadlines, no background notifications when browser closes. Journal uses browser localStorage and is not shared between devices.
- Print Studio: optional nutrition data already saved in Mealie, off by default to maintain one-sheet layout. No AI-estimated values inserted into prints unless manually confirmed and stored.
- UI: same premium v0.4 photographs / editorial design, responsive nutrition matching on mobile, printable A4 documents.

## Configuration

### Home Assistant

Configure Bridge in Settings → Devices & services → Configure. `usda_fdc_api_key` and optional `openai_api_key` are hidden from cards; they are stored as config-entry options. Write permissions: admin + not read-only, and explicit overwrite approval if already populated. A user with the HA admin role is not necessarily the same as the Mealie account; Mealie API-token rights apply as well.

### Standalone web / Docker

Set `USDA_FDC_API_KEY=...` and optionally `OPENAI_API_KEY=...` in your private `.env`. Keep `MEALIE_URL`, `MEALIE_API_TOKEN`, `ATELIER_PASSWORD`. Prefer HTTPS with authentication, private networks and backups. Never expose the Node companion publicly without additional hardening.

## Tested

- Python `unittest` against local aiohttp fake USDA/AI endpoints plus existing Mealie API mock: **9 passing**.
- Node `node --test`: mocked USDA and AI nutrient calculations plus existing web companion tests: **7 passing**.
- Lovelace card static bundle: **4 passing**.
- Playwright nutrition flow on desktop 1510×950 and phone 390×844, using synthetic API and data; ingredient matching, calculate, protected save, notes and timer.
- Print Studio original three A4 formats previously verified on Chromium; nutrition-optional print regression included in this release's QA checks.

## Known limitations / deferred

- **No acceptance test with a running real Mealie/HA version.** `PATCH /api/recipes/{slug}` schema may differ with Mealie releases. Never assume actual Mealie nutrient persistence is verified.
- **No real external USDA/OpenAI calls in tests.** Requires user's own keys and explicit choice; provider rate limits or schema changes may affect behavior.
- USDA nutrient values do not model cooking yield, water retention, densities, preparation losses or food-brand specifics. Incorrect source selection remains a risk; do not use these estimates for clinical decisions.
- Browser-local timers/journal do not sync between household devices; browser closed means no alarm notification.
- Recipe ingredient editing, HA marketplace approval and fully managed end-to-end onboarding remain incomplete.
- Public release requires separate GitHub repositories, real tests and HACS/hassfest acceptance.

### Upgrade from v0.4

Replace Bridge `custom_components/mealie_atelier` and the JS card bundle; restart HA; update Lovelace resource path to `/local/mealie-atelier-cards.js?v=0.5.0` to avoid browser cache. Configure USDA key only on the backend. Keep Mealie backup before enabling writes.
