# Mealie Atelier v0.3.0 — Print Studio & Form Redesign

**Status:** Developer Beta; not published to HACS or Marketplace. Supports German and English card UI.

## New

- Dedicated A4 print documents for recipe, shopping list and meal plan (planner landscape).
- Clean white page, no HA dashboard/navigation; browser print and Save as PDF.
- Editorial, compact and economical presets; optional photo, checkbox, notes; shopping done-items optional.
- Print Studio modal with layout choice and thumbnail preview.
- Editor defaults for print preferences; local design preferences for each device.
- Guided editorial creation, import, shopping-list, week-planner and edit forms.
- Step-by-step form fields with add/remove/up/down actions. To replace instructions, explicitly check the relevant option before saving.
- Long-recipe fallback across pages, break-inside avoidance and notes/footer suppression for extremely verbose recipes to avoid isolated empty last pages.

## QA and limitations

- Automated Node backend tests, Python bridge API tests, JS bundle tests, Playwright visual smoke and browser PDF rendering exercised against synthetic fixture data.
- PDF test cases: single-page recipe, shopping list, landscape week planner; extended 34-step/28-ingredient recipe spanning 4 pages.
- No real Home Assistant/Mealie deployment tests, Safari/iOS printing or printer hardware tests yet.
- Ingredient editing is still protected; linked foods and units must be edited in original Mealie until a fully compatible editor exists.
- User design settings in Print Studio are browser-local; card editor configuration serves as cross-device defaults but local overrides take precedence.
- Print sheets use the user's current recipe content. Recipe photos are off by default to conserve ink and avoid failed images in offline print dialogs.

## Security

- Print content is generated in the user browser using escaped Mealie data. No API token, authorization header or sensitive data is exposed in a URL or sent to a print service.
- The standalone app remains private and password-protected. Do not publicly expose it without a trusted HTTPS reverse proxy.
- Read-only installations can still print recipes and lists but cannot mutate Mealie.

## Install or upgrade

Follow `docs/START_HIER.md` and update the dashboard JS resource cache parameter to `?v=0.3.0`. Bridge restart required if you also update the Python custom component. Back up your Mealie database before using any experimental write features.
