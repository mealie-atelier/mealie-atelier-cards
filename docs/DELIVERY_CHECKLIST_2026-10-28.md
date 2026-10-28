# Delivery checklist — public demo and Light theme

This checklist records the current implementation and the release steps that still need an identified public host, maintainers, and live services. The repository remains a developer preview; this document does not claim production acceptance.

## Implemented in this archive

- Light surfaces use a neutral stone and porcelain base, plum brand accent, matching shell theme color, and a contrasting foreground for primary buttons. The editorial recipe hero has its own plum-toned image overlay in Light mode rather than inheriting the dark green overlay.
- The public showcase is generated from one bilingual catalog at `demo/data/recipes.json`. It contains ten complete DE/EN recipes with measured ingredients, portions, timings, steps, descriptive image text, and photographer/source credits for Unsplash photos.
- `npm run build:demo` builds the shared card and emits a static demo at `demo/public-site/`: two localized interactive entry pages, twenty crawlable recipe detail pages, localized JSON fixtures, Recipe/ItemList JSON-LD, canonical and alternate language links when configured, plus robots/sitemap output when configured.
- The interactive demo runs on fictional data in the current browser tab. It does not call Mealie or Home Assistant and does not persist visitor changes. Unsplash photos load from `images.unsplash.com`.
- Command search indexes demo titles, descriptions, ingredients, categories, cuisine, and dietary tags in both languages while keeping recipe content in the selected locale. Measurement queries support decimal and fractional amounts, mass/volume/temperature families, common English and German unit names, and explicit density warnings for mass-to-volume requests. Recipe data is never changed by a conversion.
- The local preview loader accepts both the canonical bilingual catalog and the generated locale-specific fixture format. Generated language routes set both document and card language explicitly.

## Verification completed locally

- Cards build, test suite, and syntax check: see the current result in `RELEASE_READINESS_0.9.5.md`.
- Web suite, package syntax check, Bridge suite, Ruff, and Python compile check: see the same release-readiness record.
- Browser review covered the generated DE and EN landing pages at desktop width, the 390 px mobile layout, ten visible recipe entries, loaded Unsplash images, no document-level horizontal overflow, Light-mode primary-button contrast, and the working `250 g in oz` search conversion. A generated English recipe-detail page was opened directly.
- Generator URL-mode was exercised with a disposable test base URL. It emitted two language-index sitemap URLs plus twenty recipe URLs and correct canonical/hreflang/Recipe/ItemList metadata. The output was then regenerated in local mode, which intentionally omits production canonical URLs and removes any stale sitemap.
- These are local browser-emulated checks. The final neutral Light palette has a complete ten-view/fourteen-dialog matrix at nine geometries (216 states), captured with recipe images enabled and visually reviewed using nine contact sheets; no state had document-level horizontal overflow. This evidence does not represent a deployed public site, physical device, or live Home Assistant/Mealie acceptance. See [`qa/neutral-light-review-2026-10-28/README.md`](qa/neutral-light-review-2026-10-28/README.md).

## Required before public deployment

1. Choose the exact public demo URL and deployment subpath. The source has no production URL configured. Do not publish the test-only hostname used for generator validation.
2. Confirm the real Mealie Atelier documentation and showcase routes on `alles-automatisch.de`. The website plan proposes `/mealie/atelier/showcase/`; it is not confirmed as a live route. Until then, the demo links to the verified site root.
3. Decide how to handle the external Unsplash image requests in the privacy notice. Either disclose the browser request to Unsplash or self-host properly licensed image files and retain all photographer/source credits. Review the [Unsplash License](https://unsplash.com/license) before repackaging any photos.
4. Build with the selected public URL so canonical URLs, hreflang, `robots.txt`, and the sitemap use the final host and full subpath:

   ```sh
   cd mealie-atelier-cards
   ATELIER_DEMO_BASE_URL=https://example.org/atelier/ npm run build:demo
   ```

5. Publish the contents of `demo/public-site/` as the static directory root. Keep both `/de/` and `/en/` and every localized recipe path reachable; do not deploy only an inner locale directory.
6. Verify HTTPS, redirects, image loading, canonical URLs, sitemap submission, structured data, 404 handling, keyboard use, reduced motion, screen-reader names, contrast, and mobile layouts on the real host. Link the confirmed documentation destination from the demo.
7. Attach the public URL and deployment/check date to this file and the public guide once the site deployment repository/CMS is selected.

## Other release gates

The demo and theme polish do not close the broader 0.9.5 release gates. The remaining Home Assistant `hassfest` and HACS checks, disposable live Mealie/HA mutation tests, physical iPhone Duo outer/inner screens in both poses, a real embedded dashboard, printer, screen reader, security review, repository identity/maintainer metadata, and public docs deployment are listed in [`RELEASE_READINESS_0.9.5.md`](RELEASE_READINESS_0.9.5.md).

## References

- [Design system](DESIGN_SYSTEM.md)
- [Public documentation plan](WEBSITE_DOCUMENTATION_PLAN.md)
- [Showcase brief](SHOWCASE.md)
- [Release readiness](RELEASE_READINESS_0.9.5.md)
- [Unsplash License](https://unsplash.com/license)
- [Schema.org Recipe](https://schema.org/Recipe)
- [Google recipe structured-data guidelines](https://developers.google.com/search/docs/appearance/structured-data/recipe)

## Corrections log

- **2026-10-28:** Added the generated static DE/EN showcase, external-image privacy decision, final-host URL requirement, local verification evidence, and public-launch checklist. Light mode now includes neutral editorial photography and accessible primary-button contrast.
- **2026-10-28:** Recorded the completed neutral-Light view/dialog matrix and current screenshot index; corrected the prior statement that the final palette still needed a full recapture.
